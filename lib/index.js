"use strict";
var Db = require('./db');
var QueryMaker = require('./query_maker');
var QueryData = require('./query_data');
var queryParts = require('./query_parts');
var Upsert = require('./upsert');


module.exports = {
	Db: Db,
	db: Db.db,
	QueryMaker: QueryMaker,
	qm: QueryMaker.qm,
	q: QueryMaker.q,
	QueryData: QueryData,
	qd: QueryData.qd,
	queryParts: queryParts,
	Upsert: Upsert
};
