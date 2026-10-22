# Usage

## Requirements

Use Node.js 26 or later. Use a native ECMAScript module project.

## Install

Install the client in your application:

```sh
npm install @eliware/elera-client
```

## Configure

Set the Elera API URL and application token in the environment:

```dotenv
ELERA_API_URL=https://elera.example.test
ELERA_API_TOKEN=replace-with-application-token
```

Replace both example values with values for your Elera environment. The client has no default URL or token. Use an application token with access to the target database.

Create the client after configuration:

```js
import { createDb } from "@eliware/elera-client";

const db = await createDb();
```

Pass `endpoint` or `token` to override the matching environment value. Pass `env` when the application reads settings from a custom environment map:

```js
const db = await createDb({
  endpoint: "https://elera.example.test",
  token: process.env.ELERA_API_TOKEN,
});
```

Keep tokens out of source control, logs, and URLs. The client sends the token to the API in an authorization header.

## Run queries

Use `query` for SQL statements. Use `execute` for prepared statements. Both methods accept mysql2-compatible parameters and return mysql2 result tuples:

```js
const [rows] = await db.query("SELECT id, name FROM accounts WHERE id = ?", [accountId]);

const [result] = await db.execute("UPDATE accounts SET name = ? WHERE id = ?", [name, accountId]);
```

Pass values separately from SQL. Do not join untrusted values into SQL text. The client routes writes to the primary and may route eligible reads to reader nodes.

## Use a transaction

Get one connection when multiple statements must use the same SQL node. The connection uses the primary route. Release it when the work ends:

```js
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  await connection.execute("UPDATE accounts SET active = ? WHERE id = ?", [true, accountId]);
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

The client does not move a connection between nodes during a transaction. Check the transaction outcome before repeating a failed write.

## Check connectivity

Call `probe` to run a query and check a transaction connection:

```js
const status = await db.probe();
console.log(status.ok, status.route);
```

The default query is `SELECT 1`. Pass a SQL string to run a different query. This check also starts a transaction on a primary connection, ends it without committing, then releases that connection. A passing result includes `ok`, `route`, `result`, `transaction`, and `released` fields.

## Configure logging

Pass a logger with the `log` option. Install `@eliware/log` directly when your application imports it:

```sh
npm install @eliware/log
```

```js
import { createLogger } from "@eliware/log";
import { createDb } from "@eliware/elera-client";

const db = await createDb({
  log: createLogger({ level: "debug", format: "json" }),
});
```

Supported levels are `error`, `warn`, `info`, `http`, `verbose`, `debug`, and `silly`. The default level is `info`. The client logs operation names, selected routes, outcomes, transport types, and error codes. It does not log SQL text, SQL values, tokens, endpoints, or error messages.

## Close the client

Call `end` when the application no longer needs the client. It closes the routing stream and SQL pools. It is safe to call more than once:

```js
try {
  const [rows] = await db.query("SELECT 1 AS connected");
  console.log(rows);
} finally {
  await db.end();
}
```

Close the client during application shutdown. Release every connection returned by `getConnection` before shutdown completes.

## Learn more

Read [Public API](public-api.md) for options and method details. Read [Client behavior](architecture.md) for routing and recovery. Read [Troubleshooting](troubleshooting.md) for common failures.
