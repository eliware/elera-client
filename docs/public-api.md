# Public API

The package root exports `createDb` and these TypeScript types: `CreateDbOptions`, `DbPool`, `ProbeResult`, `QueryOptions`, `QueryValues`, `QueryResultTuple`, `Telemetry`, `PoolConnection`, `QueryResult`, and `LoggerWithConfiguredLevels`.

## `createDb(options)`

`createDb` reads the Elera API URL and application token, requests a routing bundle, validates the response, and creates the managed client. It returns a promise that resolves to a `DbPool`.

| Option           | Type                                   | Default                  | Description                                             |
| ---------------- | -------------------------------------- | ------------------------ | ------------------------------------------------------- |
| `endpoint`       | `string`                               | `ELERA_API_URL`          | Elera API base URL.                                     |
| `token`          | `string`                               | `ELERA_API_TOKEN`        | Application API token.                                  |
| `env`            | `Record<string, string \| undefined>`  | `process.env`            | Environment map for missing values.                     |
| `fetchImpl`      | `typeof fetch`                         | `globalThis.fetch`       | Fetch function for bundle requests.                     |
| `fetchPath`      | `string`                               | `/api/v1/routing/bundle` | Request path for routing bundles.                       |
| `WebSocketImpl`  | `typeof WebSocket`                     | `globalThis.WebSocket`   | WebSocket implementation for route updates.             |
| `mysqlLib`       | `typeof import("mysql2/promise")`      | Installed mysql2 module  | MySQL promise driver module.                            |
| `log`            | `LoggerWithConfiguredLevels`           | Package logger           | Structured logger for client events.                    |
| `routing`        | `"auto"`, `"primary"`, or `"balanced"` | `"auto"`                 | Preferred SQL routing mode.                             |
| `quarantineMs`   | `number`                               | `5000`                   | Time to exclude a failed node.                          |
| `drainTimeoutMs` | `number`                               | `45000`                  | Time to wait for connections during shutdown.           |
| `now`            | `() => number`                         | `Date.now`               | Clock function that returns milliseconds.               |
| `telemetry`      | `boolean` or `Telemetry`               | `true`                   | Enable built-in telemetry or supply a telemetry object. |

The client has no default URL or token. `ELERA_API_URL` and `ELERA_API_TOKEN` are required unless their matching options are set. The `env` option defaults to `process.env`. An option overrides its matching environment value. The function rejects when the URL or token is missing, the API request fails, or the response contains an invalid or expired routing bundle.

The API supplies SQL hosts and credentials in the routing bundle. The public options do not accept SQL hosts or database passwords.

## Client methods

| Method                            | Result                      | Description                                     |
| --------------------------------- | --------------------------- | ----------------------------------------------- |
| `query(sql, values?, options?)`   | Promise result tuple        | Run a SQL query.                                |
| `execute(sql, values?, options?)` | Promise result tuple        | Run a prepared statement.                       |
| `getConnection()`                 | Promise of `PoolConnection` | Get a connection pinned to the primary route.   |
| `probe(sql?)`                     | Promise of `ProbeResult`    | Run a query and check a transaction connection. |
| `end()`                           | Promise of `void`           | Close the stream and SQL pools.                 |

The `query` and `execute` methods accept SQL text, values, and optional route or connection options. Set `route` to `"primary"` or `"balanced"`. Set `connection` to a checked-out connection. They return promise result tuples and do not accept callback arguments. Pass values separately from SQL text.

The `getConnection` method returns a mysql2 promise connection on the primary route. Release the connection with `release()` after use. Use one connection for all statements in a transaction.

The `probe` method runs `SELECT 1` when `sql` is omitted. It runs the query, starts a transaction on the selected route, ends it without committing, and releases that connection. A passing `ProbeResult` has `ok: true`, `route`, `result`, `transaction: "started"`, and `released: true` fields. It rejects if the query or transaction check fails.

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

## Telemetry and data sent to Elera

Telemetry is enabled by default. The built-in sender checks the routing WebSocket every second and sends a snapshot to Elera when the socket is open. Set `telemetry` to `false` to disable collection and transmission.

The snapshot has type `client.telemetry` and includes these values:

- Application name, credential name, database name, and scopes from the routing bundle.
- Query, failure, retry, reconnect, and failover counts.
- Reconnect time, in-flight query count, total latency, maximum latency, and average latency in milliseconds.
- Query counts for primary and balanced routes.
- The snapshot time in the `sentAt` field.

The bundle can omit the credential name, database name, or scopes. The client does not include SQL text, SQL values, tokens, API endpoints, or SQL credentials in the snapshot.

Pass a custom telemetry object to the `telemetry` option to replace the built-in collector. The `Telemetry` type lists optional methods. A custom object can define these methods:

- `begin()` and `record(value)` to measure operations.
- `recordReconnect(value)` to receive reconnect data.
- `setContext(value)` to receive bundle context updates.
- `snapshot()` to provide a payload.
- `start(stream)` and `stop()` to control custom collection and transmission.

The client calls `start` when it attaches the routing stream and calls `stop` during shutdown. A custom `start` method receives the stream object. It can call `stream.sendTelemetry(payload)` to send data while connected. The client does not call a custom `snapshot` method for you.

Read [Usage](usage.md) for setup and examples. Read [Client behavior](architecture.md) for routing and recovery details.
