"use strict";
var Db = require('./db');
var Query = require('./query');
var Upsert = require('./upsert');


module.exports = {
	Db: Db,
	db: Db.db,
	Query: Query,
	q: Query.q,
	Upsert: Upsert
};
