"use strict";
var pg = require('pg');
var Upsert = require('./upsert');


var Db = function () {
};

Db.prototype.execute = function (options, func, cb) {
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

	if (collect != null) {
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

	this.executeQuery(query, doCollect, function (err, result) {
		err = err || collectingErr;
		if (err != null) {
			cb(err);
		}
		else {
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

	var resultRow;
	var rowHandler = function (row) {
		resultRow = row;
	};

	this.executeQuery(query, rowHandler, function (err, result) {
		if (err != null) {
			cb(err);
		}
		else if (options.transform != null) {
			var catchedErr = null;
			try {
				result = options.transform(result);
			}
			catch (err) {
				catchedErr = err;
			}
			if (catchedErr != null) {
				cb(catchedErr);
			}
			else {
				cb(null, result);
			}
		}
		else {
			cb(null, result);
		}
	});
};

Db.prototype.nonQuery = function (query, cb) {
	this.executeQuery(query, null, cb);
};

Db.prototype.upsert = function (updateQueryMaker, insertQueryMaker, cb) {
	new Upsert(this, updateQueryMaker, insertQueryMaker, cb).execute();
};

// lowlevel

Db.prototype.executeQuery = function (query, rowHandler, cb) {
	if (rowHandler != null) {
		query = query.on('row', rowHandler);
	}
	query
		.on('error', cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				cb(null, result);
			}
		});
};

Db.prototype.forEach = Db.prototype.executeQuery;

Db.db = new Db();


module.exports = Db;
