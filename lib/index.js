"use strict";
var Db = require('./db');
var Upsert = require('./upsert');


module.exports = {
	Db: Db,
	db: Db.db,
	Upsert: Upsert
};
