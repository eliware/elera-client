# Public API

The package exports one function: `createDb`. It returns a managed MySQL or MariaDB client.

The package also exports the `CreateDbOptions`, `DbPool`, `ProbeResult`, `PoolConnection`, and `QueryResult` TypeScript types.

## `createDb(options)`

| Option     | Type     | Required source             | Default          | Description                                  |
| ---------- | -------- | --------------------------- | ---------------- | -------------------------------------------- |
| `endpoint` | `string` | Option or `ELERA_API_URL`   | No default value | Elera API URL.                               |
| `token`    | `string` | Option or `ELERA_API_TOKEN` | No default value | Application API token.                       |
| `env`      | `object` | Optional                    | `process.env`    | Environment map used to read missing values. |

Set `ELERA_API_URL` to `https://elera.example.test` and `ELERA_API_TOKEN` to `replace-with-application-token` in templates. Both values are required unless you pass the matching option.

The function rejects a missing URL, a missing token, an invalid bundle, or a failed API request.

## Client methods

| Method                  | Result                         | Use                                         |
| ----------------------- | ------------------------------ | ------------------------------------------- |
| `query(sql, values?)`   | mysql2 result tuple            | Run SQL.                                    |
| `execute(sql, values?)` | mysql2 result tuple            | Run a prepared statement.                   |
| `getConnection()`       | Promise of a mysql2 connection | Run work on one primary connection.         |
| `probe(sql?)`           | Promise of a status object     | Check a query and a transaction connection. |
| `end()`                 | Promise of `undefined`         | Close the client.                           |

`query` and `execute` accept mysql2-compatible SQL parameters. Both return the driver's result tuple. `getConnection` returns a writer-pinned connection. Release each connection after use.

`probe` runs `SELECT 1` when you omit `sql`. It runs the query and a transaction, then calls `connection.rollback()` and releases the connection. Its result has `ok`, `route`, `result`, `transaction`, and `released` fields.

## Errors

The client rejects a call when the API request fails, the bundle is invalid, or no eligible SQL node is available. SQL errors keep supported mysql2 fields such as `code`, `errno`, and `sqlState`.

## Route behavior

The client gets SQL routes and credentials from the Elera API. It does not accept SQL hosts or passwords as public options. Keep the API token out of URLs.

The client can retry a query when the query is safe for a different route. It does not replay an uncertain write. `end` closes the stream and SQL pools.

See [Usage](usage.md) for setup and code examples. See [Troubleshooting](troubleshooting.md) for failure steps.
