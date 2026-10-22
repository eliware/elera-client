# Client behavior

The package connects an application to an Elera API and a managed MySQL or MariaDB database. The application supplies an Elera API URL and an application token.

## Setup

The client sends the token to the Elera API in an authorization header. It requests a routing bundle with database connection details. It validates the bundle before it opens SQL connections.

The client does not accept SQL hosts or database passwords as public options. The Elera API supplies those values in the routing bundle.

## Queries

The client sends writes to the primary route. It sends reads through reader routes when the bundle provides them. `getConnection()` returns a connection pinned to the primary route so a transaction stays on one database node.

The client retries only queries that can use a safe route. It does not replay an uncertain write after a failure.

## Routing updates

The client receives routing updates through a WebSocket connection. It reconnects after a stream failure. It requests a new bundle after a missed update.

## Shutdown

Call `end()` when the application no longer needs the client. This call closes the routing stream and SQL pools. It can run more than once.

See [Usage](usage.md) for setup steps. See [Public API](public-api.md) for method details.
