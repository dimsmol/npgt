"use strict";
// WARN doesn't support transactions for now
var Upsert = function (client, updateCmd, updateArgs, insertCmd, insertArgs, cb) {
	this.client = client;
	this.updateCmd = updateCmd;
	this.updateArgs = updateArgs;
	this.insertCmd = insertCmd;
	this.insertArgs = insertArgs;
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
	this.client.query(this.updateCmd, this.updateArgs)
		.on('error', cb)
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
	this.client.query(this.insertCmd, this.insertArgs)
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


module.exports = Upsert;
