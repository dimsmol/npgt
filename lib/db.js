"use strict";
var pg = require('pg');
var QueryCtx = require('./query_ctx');
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

// transactions

Db.prototype.begin = function (client, cb) {
	this.nonQuery(client.query('begin'), cb);
};

Db.prototype.commit = function (client, cb) {
	this.nonQuery(client.query('commit'), cb);
};

Db.prototype.rollback = function (client, cb) {
	this.nonQuery(client.query('rollback'), cb);
};

Db.prototype.savepoint = function (client, savepoint, cb) {
	this.nonQuery(client.query('savepoint ' + savepoint), cb);
};

Db.prototype.rollbackTo = function (client, savepoint, cb) {
	this.nonQuery(client.query('rollback to ' + savepoint), cb);
};

// fetching

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
	var transform = options.transform;
	var transformResult = options.transformResult;

	var queryCtx = this.createQueryCtx(query, data);
	var rowHandler = function (row) {
		if (!queryCtx.hasError()) {
			if (transform != null) {
				row = transform(row, queryCtx);
			}
			if (collect != null) {
				collect(row, queryCtx.data, queryCtx);
			}
			else {
				queryCtx.data.push(row);
			}
		}
	};

	this.executeQuery(query, rowHandler, function (err, result) {
		err = err || queryCtx.getError();
		if (err != null) {
			cb(err);
		}
		else {
			queryCtx.result = result;
			var data = queryCtx.data;
			if (transformResult != null) {
				data = transformResult(data, queryCtx);
				err = queryCtx.getError();
			}
			if (err != null) {
				cb(err);
			}
			else {
				cb(null, data);
			}
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
	var transform = options.transform;

	var queryCtx = this.createQueryCtx(query);
	var rowHandler = function (row) {
		queryCtx.data = row;
	};

	this.executeQuery(query, rowHandler, function (err, result) {
		if (err != null) {
			cb(err);
		}
		else {
			queryCtx.result = result;
			var data = queryCtx.data;
			if (transform != null) {
				data = transform(data, queryCtx);
				err = queryCtx.getError();
			}
			if (err != null) {
				cb(err);
			}
			else {
				cb(null, data);
			}
		}
	});
};

Db.prototype.nonQuery = function (query, cb) {
	this.executeQuery(query, null, cb);
};

Db.prototype.upsert = function (options, cb) {
	if (options.constructor !== Object) { // old style support
		options = {
			update: arguments[0],
			insert: arguments[1]
		};
		cb = arguments[2];
	}

	new Upsert(this, options, cb).execute();
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

// internal

Db.prototype.createQueryCtx = function (query, opt_initialData) {
	return new QueryCtx(query, opt_initialData);
};

// static

Db.db = new Db();


module.exports = Db;
