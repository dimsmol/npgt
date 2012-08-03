"use strict";
var inherits = require('util').inherits;
var QueryPart = require('./query_part');


var Each = function (varKey, key, parts, opt_delimiter, opt_prefix, opt_postfix) {
	this.varKey = varKey;
	this.key = key;
	this.parts = parts;
	this.delimeter = opt_delimiter || ', ';
	this.prefix = opt_prefix;
	this.postfix = opt_postfix;
};
inherits(Each, QueryPart);

Each.prototype.expose = function (query) {
	var argInfo = query.expose(this.key);
	var start = argInfo.start;
	var end = start + argInfo.len - 1;
	if (this.prefix) {
		query.process(this.prefix);
	}
	for (var i = start; i <= end; i++) {
		if (i > start && this.delimeter) {
			query.process(this.delimeter);
		}
		query.pushVar(this.varKey, '$'+i);
		query.process(this.parts);
		query.popVar(this.varKey);
	}
	if (this.postfix) {
		query.process(this.postfix);
	}
};

Each.each = function (varKey, key, parts, opt_delimiter, opt_prefix, opt_postfix) {
	return new Each(varKey, key, parts, opt_delimiter, opt_prefix, opt_postfix);
};


module.exports = Each;
