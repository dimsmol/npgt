"use strict";
var QueryData = function (data) {
	this.data = data;

	this.predefined = {};
	this.initPredefined();
};

QueryData.prototype.predefinedNow = function () {
	return new Date();
};

QueryData.prototype.initPredefined = function () {
	this.predefined['.now'] = this.predefinedNow;
};

QueryData.prototype.get = function (key) {
	var result;
	var predefinedFunc = this.predefined[key];
	if (predefinedFunc) {
		result = predefinedFunc(this, key);
	}
	else {
		if (key.indexOf('.') != -1) {
			result = this.resolve(key);
		}
		else {
			result = this.data[key];
		}
	}
	return result;
};

QueryData.prototype.resolve = function (key) {
	var parts = key.split('.');
	var result = this.data;
	var i = 0;
	while (result != null && i < parts.length) {
		result = result[parts[i++]];
	}
	return result;
};

QueryData.qd = function (data) {
	return new QueryData(data);
};


module.exports = QueryData;
