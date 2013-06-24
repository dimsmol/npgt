"use strict";
var db = require('./db').db;


var DbConnector = function () {
	this.pg = null;
	this.config = null;
};

DbConnector.prototype.init = function (pg, config) {
	this.pg = pg;
	this.config = config;

	return this;
};

DbConnector.prototype.execute = function (f, cb) {
	db.execute(this.pg, this.config, f, cb);
};

DbConnector.prototype.tranExecute = function (tran, f, cb) {
	if (tran == null) {
		var self = this;
		this.execute(function (client, cb) {
			db.transaction(client, f, cb);
		}, cb);
	}
	else {
		f(tran, cb);
	}
};


module.exports = DbConnector;
