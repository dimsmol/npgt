"use strict";
var Transaction = function (db, client, f, cb) {
	this.db = db;
	this.client = client;
	this.f = f;
	this.cb = cb;

	this.isInTransaction = false;
	var self = this;
	this.boundEnd = function () {
		self.end.apply(self, arguments);
	};
};

Transaction.prototype.execute = function () {
	var self = this;
	this.db.begin(this.client, function (err) {
		if (err != null) {
			self.cb(err);
		}
		else {
			self.isInTransaction = true;
			self.f(self, self.boundEnd);
		}
	});
};

Transaction.prototype.commit = function (cb) {
	this.isInTransaction = false;
	this.db.commit(this.client, cb);
};

Transaction.prototype.rollback = function (cb) {
	this.isInTransaction = false;
	this.db.rollback(this.client, cb);
};

Transaction.prototype.savepoint = function (savepoint, cb) {
	this.db.savepoint(this.client, savepoint, cb);
};

Transaction.prototype.rollbackTo = function (savepoint, cb) {
	this.db.rollbackTo(this.client, savepoint, cb);
};

Transaction.prototype.end = function (err) {
	if (this.isInTransaction) {
		var self = this;
		if (err != null) {
			this.rollback(function () { // ignoring possible rollback error
				self.cb(err);
			});
		}
		else {
			var args = arguments;
			this.commit(function (err) {
				if (err != null) {
					self.cb(err);
				}
				else {
					self.callCb.apply(self, args);
				}
			});
		}
	}
	else {
		this.callCb.apply(this, arguments);
	}
};


Transaction.prototype.callCb = function (err, res1, res2, res3) {
	if (err != null) {
		this.cb(err);
	}
	else {
		switch (arguments.length) {
			// perform fast for few number of args
			case 1:
				this.cb(null);
				break;
			case 2:
				this.cb(null, res1);
				break;
			case 3:
				this.cb(null, res1, res2);
				break;
			case 4:
				this.cb(null, res2, res3);
				break;
			default: // slow way for other cases
				var args = Array.prototype.slice.call(arguments);
				args.shift();
				this.cb.apply(null, args);
				break;
		}
	}
};


module.exports = Transaction;
