"use strict";
var Upsert = require('./upsert');


var Db = function () {
};

Db.prototype.execute = function (pg, options, func, cb) {
	// NOTE only pg.connect() uses connection pool,
	// don't use pg.Client()
	pg.connect(options, function (err, client) {
		if (err != null) {
			cb(err);
		}
		else {
			// NOTE need pauseDrain() or else db connection may be released to pool after first query
			client.pauseDrain();
			func(client, function (err, result) {
				// NOTE allows to release db connection to pool
				// do not use client.end(), because it will destroy connection
				// but pool will try to reuse it
				client.resumeDrain();
				cb(err, result);
			});
		}
	});
};

Db.prototype.fetchAll = function (options, cb) {
	if (options.constructor !== Object) {
		// suggest we've got a Query
		options = {
			query: options
		};
	}

	var query = options.query;
	var data = (options.initialData === undefined ? [] : options.initialData);
	var collect = options.collect;

	var doCollect;
	var collectingErr;

	if (collect) {
		doCollect = function (row) {
			if (collectingErr == null) {
				collectingErr = collect(row, data);
			}
		};
	}
	else
	{
		doCollect = function (row) {
			data.push(row);
		};
	};

	this.forEach(query, doCollect,
		function (error) {
			if (error == null) {
				error = collectingErr;
			}
			error ? cb(error) : cb(null, data);
		});
};

Db.prototype.forEach = function (query, rowHandler, cb) {
	query
		.on('row', rowHandler)
		.on('error', cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				cb(null, result);
			}
		});
};

Db.prototype.one = function (query, cb) {
	var resultRow;
	query
		.on('row', function (row) {
			resultRow = row;
		})
		.on('error', cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				cb(null, resultRow);
			}
		});
};

Db.prototype.nonQuery = function (query, cb) {
	query
		.on('error', cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				cb(null, result);
			}
		});
};

Db.prototype.upsert = function (client, updateCmd, updateArgs, insertCmd, insertArgs, cb) {
	new Upsert(client, updateCmd, updateArgs, insertCmd, insertArgs, cb).execute();
};

Db.prototype.clauseIn = function (clause, arr, startIndex) {
	if (arr.length == 0) {
		return 'false';
	}
	if (startIndex == null) {
		startIndex = 1;
	}
	var result = [];
	for (var i = startIndex; i < startIndex + arr.length; i++) {
		result.push(i.toString());
	}
	return [clause, ' in ($', result.join(', $'), ')'].join('');
};

Db.db = new Db();


module.exports = Db;
