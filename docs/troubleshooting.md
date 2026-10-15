# Troubleshooting

## Package install fails

Use Node.js 26 or later. Run `npm ci` from the application folder. Check that the lock file is current.

## Client setup fails

Set `ELERA_API_URL` and `ELERA_API_TOKEN`. Confirm that the URL points to the Elera API. Use an application token with access to the target database.

Check that the API returns a valid routing bundle. The client rejects an invalid response, a failed request, or an expired bundle.

## A query fails

Check the SQL text, parameter values, database access, and service health. Read the error fields `code`, `errno`, and `sqlState` when present.

The client can retry a safe query. It does not retry an uncertain write. Run a write again only after you confirm its result.

## A connection fails

Check the Elera API and SQL service. Confirm that the application token remains valid. The client reconnects to the routing stream and requests current route data.

Use `db.end()` during shutdown. Release each connection from `db.getConnection()` after use.

## Report a defect

Run `npm test` in this repository. Include the Node.js version, the client version, and a redacted error. Do not include tokens, passwords, or private data.

See [Usage](usage.md) for setup. See [Public API](public-api.md) for method details.
