"use strict";
var isUniqueConstraintViolation = require('./tools').isUniqueConstraintViolation;


// WARN doesn't support transactions for now
var Upsert = function (db, updateQueryMaker, insertQueryMaker, options, cb) {
	this.db = db;
	this.updateQueryMaker = updateQueryMaker;
	this.insertQueryMaker = insertQueryMaker;
	this.options = options;
	this.cb = cb;

	var self = this;
	this.insertAttemptCount = 0;
	this.updateOrInsertBound = function () {
		self.updateOrInsert();
	};
};

Upsert.prototype.execute = function () {
	this.updateOrInsert();
};

Upsert.prototype.updateOrInsert = function () {
	var query = this.updateQueryMaker.query();
	var self = this;
	this.db.executeQuery(query, null, function (err, result) {
		if (err != null) {
			self.cb(err);
		}
		else if (result.rowCount > 0) {
			self.cb(null, result);
		}
		else {
			self.insertOrUpdate();
		}
	});
};

Upsert.prototype.insertOrUpdate = function () {
	var query = this.insertQueryMaker.query();
	var self = this;
	this.db.executeQuery(query, null, function (err, result) {
		if (err != null) {
			if (isUniqueConstraintViolation(err) && self.insertAttemptCount < 2) {
				self.insertAttemptCount++;
				// try to update again
				process.nextTick(self.updateOrInsertBound);
			}
			else {
				self.cb(err);
			}
		}
		else {
			self.cb(null, result);
		}
	});
};


module.exports = Upsert;
