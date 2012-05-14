## node.js pg tools

(pg)[https://github.com/brianc/node-postgres] is cool, but it has very callback-unfriendly API. npgt simplifies callback-style pg usage.

## Usage

```js
var pg = require('pg');
var npgt = require('npgt');
var db = npgt.db(pg);


db.execute(connectionString, function (client, cb) {
	// execute your queries here
	var result = /* some query result */;
	cb(null, result);
}, function (err, result) {
	// client is already disposed here
});
```

## Methods of db

* execute(connectionString, func, cb) - gets new connection from pool, executes func(client, cb) providing client, disposes client, then calls cb(err, result) callback where "result" is result provided by func
* fetchAll(options | query, cb) - executes query, then iterates results collecting rows, cb result is Array of fetched rows by default. Options available:
	* query - query to execute
	* initialData - initial data structure to use for results collecting, [] by default
	* collect(row, data) - function to collect results, data.push(row) by default
* forEach(query, rowHandler, cb) - executes query, then iterates results calling rowHandler(row) on every row, cb result is query result structure (see below)
* one(query, cb) - executes query, fetches every resulting row and returns the last one, cb result is query result structure (see below). Useful for queries returning one row only.
* nonQuery(query, cb) - executes non-query, without trying to fetch any results, cb result is query "result" structure (see below)
* upsert(client, updateCmd, updateArgs, insertCmd, insertArgs, cb) - updates exiting row or inserts if row does not exist, cb result is query result structure (see below)
* clauseIn(clause, arr, startIndex) - generates "in" clause string as "<clause> in ($1, $2, ...)", arguments are:
	* clause - clause to be used left of "in"
	* arr - array of values to be used for "in". Actually, values are not used, only arr.length value.
	* startIndex - index to use for first argument name, 1 by default

## Query result structure

Actually, it belongs to pg but is not well-documented there.

For inserts:
	* rowCount - number of rows inserted
	* oid - inserted id

For other queries:
	* rowCount - number of rows affected
