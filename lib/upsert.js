"use strict";
var isUniqueConstraintViolation = require('./tools').isUniqueConstraintViolation;


// WARN doesn't support transactions for now
var Upsert = function (db, options, cb) {
	this.db = db;
	this.cb = cb;
	this.updateQueryMaker = options.update;
	this.insertQueryMaker = options.insert;
	this.maxUpdateAttemptsCount = options.maxUpdateAttemptsCount || 2;
	this.transform = options.transform;
	this.insertFirst = !!options.insertFirst;
	this.nonQuery = !!options.nonQuery;

	var self = this;
	this.updateAttemptsCount = 0;
	this.updateOrInsertBound = function () {
		self.updateOrInsert();
	};
};

Upsert.prototype.execute = function () {
	if (this.insertFirst) {
		this.insertOrUpdate();
	}
	else {
		this.updateOrInsert();
	}
};

Upsert.prototype.updateOrInsert = function () {
	this.updateAttemptsCount++;

	var query = this.updateQueryMaker.query();

	var queryCtx = null;
	var rowHandler = null;
	if (!this.nonQuery) {
		queryCtx = this.createUpdateCtx(query);
		rowHandler = this.createUpdateRowHandler(queryCtx);
	}

	var self = this;
	this.db.executeQuery(query, rowHandler, function (err, result) {
		if (err != null) {
			self.cb(err);
		}
		else if (result.rowCount > 0) {
			self.handleUpdateResult(result, queryCtx);
		}
		else {
			self.insertOrUpdate();
		}
	});
};

Upsert.prototype.insertOrUpdate = function () {
	var query = this.insertQueryMaker.query();

	var queryCtx = null;
	var rowHandler = null;
	if (!this.nonQuery) {
		queryCtx = this.createInsertCtx(query);
		rowHandler = this.createInsertRowHandler(queryCtx);
	}

	var self = this;
	this.db.executeQuery(query, rowHandler, function (err, result) {
		if (err != null) {
			if (isUniqueConstraintViolation(err) && self.updateAttemptsCount < self.maxUpdateAttemptsCount) {
				// try to update again
				process.nextTick(self.updateOrInsertBound);
			}
			else {
				self.cb(err);
			}
		}
		else {
			self.handleInsertResult(result, queryCtx);
		}
	});
};

Upsert.prototype.createQueryCtx = function (query, opt_initialData) {
	return this.db.createQueryCtx(query, opt_initialData);
};

Upsert.prototype.createUpdateCtx = Upsert.prototype.createQueryCtx;
Upsert.prototype.createInsertCtx = Upsert.prototype.createQueryCtx;

Upsert.prototype.createRowHandler = function (queryCtx) {
	return function (row) {
		queryCtx.data = row;
	};
};

Upsert.prototype.createUpdateRowHandler = Upsert.prototype.createRowHandler;
Upsert.prototype.createInsertRowHandler = Upsert.prototype.createRowHandler;

Upsert.prototype.handleResult = function (result, queryCtx) {
	if (this.nonQuery) {
		this.cb(null, result);
	}
	else {
		queryCtx.result = result;
		var data = queryCtx.data;
		var err = null;
		if (this.transform != null) {
			data = this.transform(data, queryCtx);
			err = queryCtx.getError();
		}
		if (err != null) {
			this.cb(err);
		}
		else {
			this.cb(null, data);
		}
	}
};

Upsert.prototype.handleUpdateResult = Upsert.prototype.handleResult;
Upsert.prototype.handleInsertResult = Upsert.prototype.handleResult;


module.exports = Upsert;
