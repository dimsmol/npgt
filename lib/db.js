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
			func(client, function () { // aren't expecting any particular args
				// NOTE allows to release db connection to pool
				// do not use client.end(), because it will destroy connection
				// but pool will try to reuse it
				client.resumeDrain();
				cb.apply(null, arguments); // passing args exactly "as is"
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
	var collectIsSafe = !!options.collectIsSafe;

	var doCollect;
	var collectingErr;

	if (collect) {
		if (collectIsSafe) {
			doCollect = function (row) {
				if (collectingErr == null) {
					try {
						collectingErr = collect(row, data);
					}
					catch (err) {
						collectingErr = err;
					}
				}
			};
		}
		else {
			doCollect = function (row) {
				if (collectingErr == null) {
					collectingErr = collect(row, data);
				}
			};
		}
	}
	else {
		doCollect = function (row) {
			data.push(row);
		};
	}

	this.forEach(query, doCollect,
		function (error) {
			if (error == null) {
				error = collectingErr;
			}
			if (error != null) {
				cb(error);
			}
			else {
				cb(null, data);
			}
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

Db.prototype.one = function (options, cb) {
	if (options.constructor !== Object) {
		// suggest we've got a Query
		options = {
			query: options
		};
	}

	var query = options.query;
	var transformFunc = options.transform;

	var resultRow;
	query
		.on('row', function (row) {
			resultRow = row;
		})
		.on('error', cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				if (transformFunc != null) {
					resultRow = transformFunc(resultRow);
				}
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

Db.prototype.upsert = Upsert.upsert;

Db.db = new Db();


module.exports = Db;
