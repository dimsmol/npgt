"use strict";
var isUniqueConstraintViolation = require('./tools').isUniqueConstraintViolation;


// WARN doesn't support transactions for now
var Upsert = function (updateQueryMaker, insertQueryMaker, cb) {
	this.updateQueryMaker = updateQueryMaker;
	this.insertQueryMaker = insertQueryMaker;
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
	var self = this;
	this.updateQueryMaker.query()
		.on('error', this.cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				if (result.rowCount > 0) {
					self.cb(null, result);
				}
				else {
					self.insertOrUpdate();
				}
			}
		});
};

Upsert.prototype.insertOrUpdate = function () {
	var self = this;
	this.insertQueryMaker.query()
		.on('error', function (error) {
			if (isUniqueConstraintViolation(error) && self.insertAttemptCount < 2) {
				self.insertAttemptCount++;
				// try to update again
				process.nextTick(self.updateOrInsertBound);
			}
			else {
				self.cb(error);
			}
		})
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				self.cb(null, result);
			}
		});
};

Upsert.upsert = function (updateQueryMaker, insertQueryMaker, cb) {
	new Upsert(updateQueryMaker, insertQueryMaker, cb).execute();
};


module.exports = Upsert;
