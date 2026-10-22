# Client behavior

The client connects an application to the Elera API and a managed MySQL or MariaDB database. The application provides the API URL and an application token.

## Startup

The client sends the token in an authorization header. It requests a routing bundle from the API and validates the returned data before it opens SQL connections. The bundle supplies SQL routes and credentials.

The public API does not accept SQL hosts or database passwords. This keeps database connection details under Elera management.

## Query routing

The client routes writes to the primary node. It can route eligible reads to reader nodes when the bundle provides them. Route selection also considers node availability and the query type.

The client retries a failed query only when the failure is retryable and the query is safe on a balanced route. The client does not replay an uncertain write. Confirm the outcome before sending a failed write again.

Use `getConnection` when multiple statements must use the same node. It returns a primary connection that stays on that node for its lifetime.

## Route updates

The client receives route changes through a WebSocket stream. The token stays out of the WebSocket URL. The client reconnects after a stream failure and requests a new routing bundle after a missed event.

## Shutdown

Call `end` when the application no longer needs the client. This closes the routing stream and SQL pools. The call can run more than once. Release checked-out connections before shutdown completes.

Read [Usage](usage.md) for setup steps. Read [Public API](public-api.md) for method details.
