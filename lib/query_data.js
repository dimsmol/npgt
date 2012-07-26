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
		result = this.data[key];
	}
	return result;
};

QueryData.qd = function (data) {
	return new QueryData(data);
};


module.exports = QueryData;
