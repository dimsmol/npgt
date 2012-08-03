"use strict";
var QueryData = require('./query_data');
var queryParts = require('./query_parts');
var QueryPart = queryParts.QueryPart;


var Query = function (client, parts, data) {
	this.client = client;
	this.parts = parts;
	this.data = data;

	this.query = null;
	this.queryParts = [];
	this.args = [];
	this.argMap = {};

	this.varMap = {};
	this.varStacks = {};
};

Query.prototype.pushVar = function (key, argStr) {
	var stack = this.varStacks[key];
	if (stack == null) {
		this.varStacks[key] = stack = [];
	}
	stack.push(argStr);
	this.varMap[key] = argStr;
};

Query.prototype.popVar = function (key) {
	var stack = this.varStacks[key];
	var argStr = stack.pop();
	if (stack.length > 0) {
		this.varMap[key] = argStr;
	}
	else {
		delete this.varMap[key];
	}
};

Query.prototype.create = function () {
	var query = this.prepare();
	return this.client.query(query, this.args);
};

Query.prototype.prepare = function () {
	if (this.query == null) {
		this.process(this.parts);
		this.query = this.queryParts.join('');
	}
	return this.query;
};

Query.prototype.processParts = function (parts) {
	for (var i = 0; i < parts.length; i++) {
		var part = parts[i];
		this.process(part);
	}
};

Query.prototype.process = function (part) {
	if (part) {
		if (Array.isArray(part)) {
			this.processParts(part);
		}
		else if (part instanceof QueryPart) {
			part.expose(this);
		}
		else {
			this.queryParts.push(this.replaceVars(part));
		}
	}
};

Query.prototype.varsRegex = /\$\$|\$([a-zA-Z0-9\.]+)|\$\{([a-zA-Z0-9\.]+)\}/g;

Query.prototype.replaceVars = function (part) {
	var self = this;
	return part.replace(this.varsRegex, function (m, key1, key2) {
		var key = key1 || key2;
		var result;
		if (key) {
			result = self.replaceKey(key);
		}
		else {
			result = m;
		}
		return result;
	});
};

Query.prototype.replaceKey = function (key) {
	var result;
	if (key.indexOf('..') === 0) {
		result = this.replaceKeyForIn(key);
	}
	else {
		result = this.replaceKeySimple(key);
	}
	return result;
};

Query.prototype.replaceKeyForIn = function (key) {
	var argInfo = this.argMap[key];
	if (argInfo == null) {
		argInfo = this.expose(key.substr(2));
	}
	var argStr = argInfo.cacheForIn;
	if (argStr == null) {
		argInfo.cacheForIn = argStr = ['(', ')'].join(this.delimitedArgs(argInfo.start, argInfo.len));
	}
	return argStr;
};

Query.prototype.replaceKeySimple = function (key) {
	var argStr;
	if (key in this.varMap) {
		argStr = this.varMap[key];
	}
	else {
		argStr = this.argMap[key];
		if (argStr == null) {
			this.args.push(this.data.get(key));
			argStr = '$' + this.args.length;
			this.argMap[key] = argStr;
		}
	}
	return argStr;
};

Query.prototype.expose = function (key) {
	var arr = this.data.get(key);
	var start = this.args.length + 1;
	this.args.push.apply(this.args, arr);
	var result = {
		start: start,
		len: arr.length
	};
	this.argMap['..' + key] = result;
	return result;
};

Query.prototype.delimitedArgs = function (start, len, opt_delimiter) {
	var delimiter = opt_delimiter || ', ';
	var result = [];
	var end = start + len - 1;
	for (var i = start; i <= end; i++) {
		result.push(i);
	}
	return '$' + result.join(delimiter + '$');
};

Query.q = function (client, parts, data) {
	data = data || {};
	if (data.constructor == Object) {
		data = new QueryData(data);
	}
	return new Query(client, parts, data).create();
};

Query.q.each = queryParts.each;


module.exports = Query;
