# Public API

The package root exports `createDb` and these TypeScript types: `CreateDbOptions`, `DbPool`, `ProbeResult`, `PoolConnection`, and `QueryResult`. The client uses mysql2 promise types for query results and connections.

## `createDb(options)`

`createDb` reads the Elera API URL and application token, requests a routing bundle, validates the response, and creates the managed client. It returns a promise that resolves to a `DbPool`.

| Option     | Type                                  | Value source                | Description                          |
| ---------- | ------------------------------------- | --------------------------- | ------------------------------------ |
| `endpoint` | `string`                              | Option or `ELERA_API_URL`   | Elera API base URL.                  |
| `token`    | `string`                              | Option or `ELERA_API_TOKEN` | Application API token.               |
| `env`      | `Record<string, string \| undefined>` | Option or `process.env`     | Environment map for missing values.  |
| `log`      | `LoggerWithConfiguredLevels`          | Optional                    | Structured logger for client events. |

The client has no default URL or token. An option overrides its matching environment value. The function rejects when the URL or token is missing, the API request fails, or the response contains an invalid or expired routing bundle.

The API supplies SQL hosts and credentials in the routing bundle. The public options do not accept SQL hosts or database passwords.

## Client methods

| Method                  | Result                      | Description                                     |
| ----------------------- | --------------------------- | ----------------------------------------------- |
| `query(sql, values?)`   | Promise of `QueryResult`    | Run a SQL query.                                |
| `execute(sql, values?)` | Promise of `QueryResult`    | Run a prepared statement.                       |
| `getConnection()`       | Promise of `PoolConnection` | Get a connection pinned to the primary route.   |
| `probe(sql?)`           | Promise of `ProbeResult`    | Run a query and check a transaction connection. |
| `end()`                 | Promise of `void`           | Close the stream and SQL pools.                 |

The `query` and `execute` methods accept mysql2-compatible parameters. They return the driver's result tuple. Pass values separately from SQL text.

The `getConnection` method returns a mysql2 promise connection on the primary route. Release the connection with `release()` after use. Use one connection for all statements in a transaction.

The `probe` method runs `SELECT 1` when `sql` is omitted. It runs the query, starts a transaction on a primary connection, ends it without committing, and releases that connection. A passing `ProbeResult` has `ok: true`, `route`, `result`, `transaction: "started"`, and `released: true` fields. It rejects if the query or transaction check fails.

Calling `end` more than once is safe. Close active connections before application shutdown.

## Routing and retries

The client sends writes to the primary route. It can send eligible reads to reader routes when the routing bundle provides them. Route selection can depend on the SQL category and current node availability.

The client retries a failed query only when the failure is retryable and the query is safe to run on a balanced route. It does not replay an uncertain write. Confirm a write's outcome before you send it again.

The client receives route changes through a WebSocket stream. It reconnects after stream failure and requests a new bundle when it detects a missed update.

## Errors

Client setup can reject with a `TypeError` for missing settings. It can reject with an `Error` when the API request fails or returns invalid data. SQL failures preserve supported mysql2 fields such as `code`, `errno`, `sqlState`, `sqlMessage`, and `fatal` when available.

Some client SQL errors include a `retryable` field. Use this field as retry guidance for the current operation. A failed write may have run on the database.

## Structured logging

Pass a logger through the `log` option. Install `@eliware/log` directly when your application imports it. The package supports `error`, `warn`, `info`, `http`, `verbose`, `debug`, and `silly` levels. The default level is `info`.

The client logs operation names, routes, outcomes, transport types, and error codes. It omits SQL text, SQL values, tokens, endpoints, and error messages.

Read [Usage](usage.md) for setup and examples. Read [Client behavior](architecture.md) for routing and recovery details.
