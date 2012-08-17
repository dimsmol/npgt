"use strict";
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
	this.updateQueryMaker.create()
		.on('error', this.cb)
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				if (result.rowCount > 0) {
					this.cb(null, result);
				}
				else {
					this.insertOrUpdate();
				}
			}
		});
};

Upsert.prototype.insertOrUpdate = function () {
	this.insertQueryMaker.create()
		.on('error', function (error) {
			// 23505 => unique violation
			if (error.code == '23505' && this.insertAttemptCount < 2) {
				this.insertAttemptCount++;
				// try to update again
				process.nextTick(this.updateOrInsertBound);
			}
			else {
				this.cb(error);
			}
		})
		.on('end', function (result) {
			// NOTE ensure not in error, because error is already handled at this point
			if (result != null) {
				this.cb(null, result);
			}
		});
};

Upsert.prototype.upsert = function (updateQueryMaker, insertQueryMaker, cb) {
	new Upsert(updateQueryMaker, insertQueryMaker, cb).execute();
};


module.exports = Upsert;
