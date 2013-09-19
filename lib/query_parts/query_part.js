"use strict";
var mt = require('marked_types');


var QueryPart = function () {
};

QueryPart.prototype.expose = function (query) {
	return '';
};
mt.mark(QueryPart, 'npgt:QueryPart');


module.exports = QueryPart;
