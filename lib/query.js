"use strict";
var QueryData = require('./query_data');


var Query = function (client, parts, data) {
	this.client = client;
	this.parts = parts;
	this.data = data;

	this.query = null;
	this.queryParts = [];
	this.args = [];
	this.argMap = {};
};

Query.prototype.create = function () {
	var query = this.prepare();
	return this.client.query(query, this.args);
};

Query.prototype.prepare = function () {
	if (this.query == null) {
		this.processParts(this.parts);
		this.query = this.queryParts.join('');
	}
	return this.query;
};

Query.prototype.processParts = function (parts) {
	for (var i = 0; i < parts.length; i++) {
		var part = parts[i];
		if (part != null && part != '') {
			if (Array.isArray(part)) {
				this.processParts(part);
			}
			else {
				this.queryParts.push(this.replaceVars(part));
			}
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
	var argStr = this.argMap[key];
	if (argStr == null) {
		if (key.indexOf('..') == 0) {
			argStr = this.exposeIn(key.substr(2));
		}
		else {
			this.args.push(this.data.get(key));
			argStr = '$' + this.args.length;
		}
		this.argMap[key] = argStr;
	}
	return argStr;
};

Query.prototype.exposeIn = function (key) {
	var arr = this.data.get(key);
	var idx = this.args.length + 1;
	var result = [];
	for (var i = 0; i < arr.length; i++) {
		var argStr = '$' + (idx + i);
		result.push(argStr);
		this.args.push(arr[i]);
	}
	return ['(', ')'].join(result.join(', '));
};

Query.q = function (client, parts, data) {
	if (data.constructor == Object) {
		data = new QueryData(data);
	}
	return new Query(client, parts, data).create();
};


module.exports = Query;
