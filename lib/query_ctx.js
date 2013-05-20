"use strict";
var QueryCtx = function (query, opt_initialData) {
	this.query = query;
	this.data = opt_initialData;
	this.err = null;
	this.result = null;
};

QueryCtx.prototype.error = function (err) {
	this.err = err;
};

QueryCtx.prototype.hasError = function () {
	return this.err != null;
};

QueryCtx.prototype.getError = function () {
	return this.err;
};


module.exports = QueryCtx;
