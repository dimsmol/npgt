"use strict";
var Ctx = function (query, opt_initialData) {
	this.query = query;
	this.data = opt_initialData;
	this.err = null;
	this.result = null;
};

Ctx.prototype.error = function (err) {
	this.err = err;
};

Ctx.prototype.getError = function () {
	return this.err;
};


module.exports = Ctx;
