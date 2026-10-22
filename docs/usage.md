# Usage

## Install

Use Node.js 26 or later. Install the package in your application:

```sh
npm install @eliware/elera-client
```

## Configure

Set the Elera API URL and application token in the process environment, or pass both values to `createDb`:

```js
import { createDb } from "@eliware/elera-client";

const db = await createDb({
  endpoint: process.env.ELERA_API_URL,
  token: process.env.ELERA_API_TOKEN,
});
```

`ELERA_API_URL` has no built-in default and is required when `endpoint` is omitted. Use a placeholder URL in templates:

```dotenv
ELERA_API_URL=https://elera.example.test
ELERA_API_TOKEN=replace-with-application-token
```

`ELERA_API_TOKEN` has no built-in default and is required when `token` is omitted. Use an application token, not a supervisor token.

Pass a custom environment map with `env` when an application does not use `process.env`:

```js
const db = await createDb({
  env: {
    ELERA_API_URL: "https://elera.example.test",
    ELERA_API_TOKEN: "replace-with-application-token",
  },
});
```

Pass `endpoint` or `token` to override the matching environment value. Keep tokens out of source control, logs, and URLs.

## Run SQL

Use `query` for SQL statements. Use `execute` for prepared statements:

```js
const [rows] = await db.query("SELECT id, name FROM accounts WHERE id = ?", [accountId]);
const [result] = await db.execute("UPDATE accounts SET name = ? WHERE id = ?", [name, accountId]);
```

Both methods return mysql2 result tuples. Pass values as an array. Do not build SQL by joining untrusted values.

## Use a connection

Use `getConnection` when one connection must own a transaction. Always release the connection:

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

The connection uses the primary route. It does not move between SQL nodes during a transaction.

## Check the client

Call `probe` to run a query and test a transaction connection. The method calls `connection.rollback()` and releases its connection:

```js
const status = await db.probe();
console.log(status);
```

The default query for `probe` is `SELECT 1`. Pass a query string to use a different query. The result has `ok`, `route`, `result`, `transaction`, and `released` fields.

## Close the client

Call `end` when the application no longer needs the client:

```js
await db.end();
```

This call closes the routing stream and SQL pools. It can run more than once.

## Configure logging

Pass a logger with the `log` option. Use `createLogger` from `@eliware/log` to select JSON output or a log level:

```js
import { createLogger } from "@eliware/log";

const db = await createDb({ log: createLogger({ level: "debug", format: "json" }) });
```

Install `@eliware/log` directly when your application imports it. The supported levels are `error`, `warn`, `info`, `http`, `verbose`, `debug`, and `silly`.

The client does not log SQL text, SQL values, tokens, endpoints, or error messages.

## Runtime behavior

The client gets SQL credentials and route data from the Elera API. It keeps bearer tokens out of WebSocket URLs. It reconnects after a stream failure and requests new route data after missed events.

The client retries a query only when it can route that query safely. It does not replay an uncertain write on a different SQL node.

See [Public API](public-api.md) for method details. See [Troubleshooting](troubleshooting.md) for common failures.
