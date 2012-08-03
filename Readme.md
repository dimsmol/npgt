## node.js pg tools

(pg)[https://github.com/brianc/node-postgres] is cool, but it has very callback-unfriendly API. npgt simplifies callback-style pg usage.

## Usage

```js
var pg = require('pg');
var db = require('npgt').db;


db.execute(pg, connectionString, function (client, cb) {
	// execute your queries here
	var result = /* some query result */;
	cb(null, result);
}, function (err, result) {
	// client is already disposed here
});
```

## Methods of db

* execute(pg, connectionString, func, cb) - gets new connection from pool, executes func(client, cb) providing client, disposes client, then calls cb(err, result) callback where "result" is result provided by func. pg argument is (pg)[https://github.com/brianc/node-postgres] module.
* fetchAll(options | query, cb) - executes query, then iterates results collecting rows, cb result is Array of fetched rows by default. Options available:
	* query - query to execute
	* initialData - initial data structure to use for results collecting, [] by default
	* collect(row, data) - function to collect results, data.push(row) by default
* forEach(query, rowHandler, cb) - executes query, then iterates results calling rowHandler(row) on every row, cb result is query result structure (see below)
* one(query, cb) - executes query, fetches every resulting row and returns the last one, cb result is query result structure (see below). Useful for queries returning one row only.
* nonQuery(query, cb) - executes non-query, without trying to fetch any results, cb result is query "result" structure (see below)
* upsert(client, updateCmd, updateArgs, insertCmd, insertArgs, cb) - updates exiting row or inserts if row does not exist, cb result is query result structure (see below)
* clauseIn(clause, arr, startIndex) - **DEPRECATED** (use Query instead) generates "in" clause string as "<clause> in ($1, $2, ...)", arguments are:
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

## Query construction

`q(client, queryParts, data)` can ease query construction.

* queryParts - string, array of strings or QueryPart objects from which resulting query will be constructed
* data - dict of data you want to use in query

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

Example:

```js
var a = [1, 2, 3];
var query = q(client,
	'select * from x where d = $.now and a in $..a',
	{ a: [1, 2, 3] }
);

// produces query
// 'select * from x where d = $1 and a in ($2, $3, $4)'
// with arguments
// [_current_date_value_, 1, 2, 3]
```

$.now is provided by QueryData object used by q() as a datastore by default. You can construct your own version of q() using Query class and your own datastore object inherited from QueryData to provide more predefined expressions like $.now

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
var a = [1, 2, 3];
var query = q(client,
	[
		'select * from x where normalize(tag) in (',
			q.each('tag', 'tags', 'normalize($tag)'),
		')'
	]
	{ tags: ['tag1', 'tag2', 'tag3'] }
);

// produces query
// 'select * from x where normalize(tag) in (normalize($1), normalize($2), normalize($3)'
// with arguments
// ['tag1', 'tag2', 'tag3']
```

Note, that q.each() exposes given argument the same way as $..arg does.

You can use QueryPart as a base class for your own classes incapsulating query parts logic.
