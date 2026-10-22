# Troubleshooting

## Install or import errors

Use Node.js 26 or later. Confirm that the application uses native ECMAScript modules. Run `npm ci` in the application folder when its lock file matches `package.json`.

## Client setup fails

Set `ELERA_API_URL` and `ELERA_API_TOKEN`, or pass both values to `createDb`. Check that the URL points to the Elera API and that the token is an application token with access to the database.

The client requests a routing bundle during startup. Check API availability and access when setup reports an HTTP failure. Check the response when setup reports invalid JSON, an invalid envelope, or an invalid bundle. The client rejects an expired bundle.

## A query fails

Check the SQL text, parameter values, database access, and database server. Read the error fields `code`, `errno`, and `sqlState` when available.

The client can retry a failed query only when the error and query allow a safe retry. It does not replay an uncertain write. Confirm the write outcome before you send it again.

## A connection or health check fails

Check that the Elera API and SQL server are available. Confirm that the application token remains valid. The client reconnects to the routing stream and requests current route data after missed updates.

The `probe` method runs its SQL statement and checks that it can start and end a transaction on a primary connection. Check the query route and primary database availability when this check rejects.

## Close connections

Release each connection returned by `getConnection`. Call `db.end()` during application shutdown to close the routing stream and SQL pools.

## Report a defect

Run `npm test` in this repository. Include the Node.js version, client version, and a redacted error. Do not include tokens, passwords, or private data.

Read [Usage](usage.md) for setup. Read [Public API](public-api.md) for method details.
