"use strict";
var Db = require('./db');
var Query = require('./query');
var QueryData = require('./query_data');
var Upsert = require('./upsert');


module.exports = {
	Db: Db,
	db: Db.db,
	Query: Query,
	q: Query.q,
	QueryData: QueryData,
	qd: QueryData.qd,
	Upsert: Upsert
};
