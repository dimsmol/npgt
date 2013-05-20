# node.js pg tools library

* Simplifies callback-style usage of [pg](https://github.com/brianc/node-postgres)
* Provides utilities for results fetching
* Upsert implementation
* QueryMaker query construction tool

## Usage

```js
var db = require('npgt').db;


db.execute(connectionString, function (client, cb) {
	// execute your queries here
	db.fetchAll(q(client, [
			'select * from mytable where name = $name'
		],
		{ name: 'some name' }), cb);
}, function (err, result) {
	// client is already disposed here
});
```

## Methods of db

db connect:

* execute(connectionString, func, cb) - gets new connection from pool, executes func(client, cb) providing client, disposes client, then calls cb(err, result) callback where "result" is result provided by func.

Transactions:

* transaction(client, f, cb) - executes f in transaction context, automatically does rollback on error and commit on success if not already done by f()
	* f(tran, cb)
		* tran is Transaction class instance (see below), to work correctly, f() must call commit() and rollback() methods on tran instead of db

Transactions lowlevel:

Note, that all these methods are calling cb() with no result argument.

* begin(client, cb) - begins transaction
* commit(client, cb) - transaction commit
* rollback(client, cb) - transaction rollback
* savepoint(client, savepoint, cb) - set transaction savepoint
* rollbackTo(client, savepoint, cb) - rollback transaction to savepoint

Queries:

* fetchAll(options | query, cb) - executes query, then iterates results collecting rows, cb result is Array of fetched rows by default
	* options available:
		* query - query to execute
		* initialData - initial data structure to use for results collecting, [] by default
		* collect(row, data, queryCtx) - function to collect results, data.push(row) by default
		* transform(row, queryCtx) - function to transform results, null by default (not applied)
		* transformResult(data, queryCtx) - function to transform result data, null by default (not applied)
	* cb(err, data) - where resulting data are transformed by transformResult() if specified
* one(options | query, cb) - executes query, fetches every resulting row and returns the last one, cb result is query result structure (see below). Useful for queries returning one row only.
	* options available:
		* query - query to execute
		* transform(row, queryCtx) - function to transform result data, null by default (not applied)
	* cb(err, row) - where resulting row is transformed by transform() if specified
* nonQuery(query, cb) - executes non-query, without trying to fetch any results, cb result is query "result" structure (see below)
* nonQueryVoid(query, cb) - same as nonQuery(), but it's cb has no result argument
* upsert(options, cb) - updates exiting row or inserts if row does not exist
	* options available:
		* update - update query maker, required
		* insert - update query maker, required
		* maxUpdateAttemptsCount - how many update attempts can be performed, 2 by default
		* transform(row, queryCtx) - function to transform result data, null by default (not applied)
		* insertFirst - first try to insert, then update
		* nonQuery - ignore any resulting rows when true, false by default
	* cb signature by default expects queries may return rows:
		* cb(err, row) - where resulting row is transformed by transform() if specified
	* cb signature for nonQuery:
		* cb(err, result) where result is query result structure (see below)
* upsert(updateQueryMaker, insertQueryMaker, cb) - deprecated, old variant of upsert()

Lowlevel methods:

* executeQuery(query, rowHandler, cb) - executes query, then iterates results calling rowHandler(row) on every row if rowHandler is not null, cb result is query result structure (see below)
* forEach(query, rowHandler, cb) - alias for executeQuery()

## Transaction

Methods:

* commit(cb) - transaction commit
* rollback(cb) - transaction rollback
* savepoint(savepoint, cb) - set transaction savepoint
* rollbackTo(savepoint, cb) - rollback transaction to savepoint

## QueryCtx

An object, storing query context.

Properties and methods:

* query - query object reference
* data - current data
* result - result as returned by pg, only available on transformResult() and cb() call
* error(err) - sets execution error, data processing will be stopped, error provided will be passed to cb()
* hasError() - true if error() was called before with err != null
* getError() - gets current execution error

## Query result structure

Actually, it belongs to pg but is not well-documented there.

For inserts:

* rowCount - number of rows inserted
* oid - inserted id

For other queries:

* rowCount - number of rows affected

## QueryMaker

`q(client, queryParts, data)` can ease query construction.

* queryParts - string, array of strings or QueryPart objects from which resulting query will be constructed
* data - dict of data you want to use in query

`q.maker(client, queryParts, data)` returns QueryMaker instance instead of executed query object. Query can be executed by calling query() method of query maker. Query maker itself used, for example, in upsert() calls (see above).

q() returns pg's query object ready to execute with db.forEach() and other functions.
q() uses named args (as opposed to pg's client.query()), for example `$arg` refers to data.arg

Example:

```js
var a = 'abc', b = 3;
var query = q(client,
	[
		'select * from x where true',
		// use condition only if corresponding variable is not null
		a == null ? null : ' and a = $a',
		b == null ? null : ' and b = $b'
	],
	{
		a: a,
		b: b
	}
);

// produces query
// 'select * from x where true and a = $1 and b = $2'
// with arguments
// ['abc', 3]
```

There is some special syntax for argument names:

* $..someArg will expect data.someArg is an array, expose that array on arguments and produce part of query suitable for usage in sql 'in' clause
* $.now will expose `new Date()` on arguments and use that argument in query
* $a.0.b can be used to access data components, e.g. will return '!' if data = `{a: [{b: '!'}]}`
* name can be optionally surrounded by qurly braces: ${a}, ${.now}

Example:

```js
var query = q(client,
	'select * from x where d = $.now and a in $..a',
	{ a: [1, 2, 3] }
);

// produces query
// 'select * from x where d = $1 and a in ($2, $3, $4)'
// with arguments
// [_current_date_value_, 1, 2, 3]
```

$.now is provided by QueryData object used by q() as a datastore by default. You can construct your own version of q() using QueryMaker class and your own datastore object inherited from QueryData to provide more predefined expressions like $.now

### q.each()

`q.each(varKey, key, parts, opt_delimiter, opt_prefix, opt_postfix)` can be used to construct more complex expressions for sql 'in' clause.

* varKey - key to be used to provide current argument when constructing query part from parts
* key - argument name to use as a data source
* parts - the same meaning as for q() itself
* opt_delimiter - what delimeter to use between constructed query parts, ', ' by default
* opt_prefix - what prefix to use before constructed query part
* opt_postfix - what postfix to use after constructed query part

Example:

```js
var query = q(client,
	[
		'select * from x where normalize(tag) in (',
			q.each('tag', 'tags', 'normalize($tag)'),
		')'
	],
	{ tags: ['tag1', 'tag2', 'tag3'] }
);

// produces query
// 'select * from x where normalize(tag) in (normalize($1), normalize($2), normalize($3)'
// with arguments
// ['tag1', 'tag2', 'tag3']
```

Note, that q.each() exposes given argument the same way as $..arg does.

You can use QueryPart as a base class for your own classes incapsulating query parts logic.

### q.insFields()

`q.insFields(fields)` generates list of fields for insert statement.

See alse q.insVars().

### q.insVars()

`q.insVars(fields, opt_count, opt_options)` generates list of vars for insert statement.

opt_count and opt_options can be used to insert several rows at once.

Options available:

* start - from which index to start
* prefix - prefix to use for generated variables
* startWith - ready fields for every row to start with

Single row example:

```js
var data = {a: 1, b: 2};
var fields = Object.keys(data);
var query = q(client,
	[
		'insert into x (', q.insFields(fields), ')',
		'values (', q.insVars(fields), ')'
	], data);

// produces query
// 'insert into x (a, b) values ($1, $2)'
// with arguments
// [1, 2]
```

Multiple rows example:

```js
var data = [{a: 1, b: 2}, {a: 3, b: 4}];
var fields = Object.keys(data[0]);
var query = q(client,
	[
		'insert into x (created, ', q.insFields(fields), ')',
		'values (', q.insVars(fields, data.length, {startWith: '$.now'}), ')'
	], data);

// produces query
// 'insert into x (created, a, b) values ($1, $2, $3), ($1, $4, $5)'
// with arguments
// [_current_date_value_, 1, 2, 3, 4]
```

### q.upd(fields)

Generates 'field = var' pairs for update statement.

Example:

```js
var data = {a: 1, b: 2};
var query = q(client,
	[
		'update x set ', q.upd(Object.keys(data)), ' where a > 0'
	], data);

// produces query
// 'update x set a = $1, b = $2 where a > 0'
// with arguments
// [1, 2]
```

## tools

* isUniqueConstraintViolation(dbErr) - returns true if dbErr is unique constraint violation error
