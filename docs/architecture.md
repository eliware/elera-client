# Client behavior

The client connects an application to the Elera API and a managed MySQL or MariaDB database. The application provides the API URL and an application token.

## Connection paths

The application connects to the Kubernetes load balancer by HTTP on TCP
port `8080`. The client requests `/api/v1/routing/bundle` and sends the
application token in the `Authorization` header.

The supervisor returns a routing bundle with the database name, SQL server
FQDNs, and database credentials. The client validates the bundle before it
opens SQL connections.

The client connects directly to a listed SQL server using MariaDB on TCP port
`3306`. SQL traffic does not pass through the supervisor.

Both paths currently transmit unencrypted traffic. Cilium WireGuard is disabled.
Cilium VXLAN encapsulates pod packets but does not encrypt them. The OVH vRack
provides private logical isolation but does not encrypt traffic.

Application TLS remains optional and is disabled on these paths. Optional
client TLS support remains available when a deployment configures it.

The routing bundle carries database credentials. Keep those credentials out
of logs and URLs. Keep the application token out of source control, logs, and
URLs.

The public API does not accept SQL hosts or database passwords. This keeps database connection details under Elera management.

## Query routing

The client routes writes to the primary node. It can route eligible reads to reader nodes when the bundle provides them. Route selection also considers node availability and the query type.

The client retries a failed query only when the failure is retryable and the query is safe on a balanced route. The client does not replay an uncertain write. Confirm the outcome before sending a failed write again.

Use `getConnection` when multiple statements must use the same node. It returns a primary connection that stays on that node for its lifetime.

## Route updates

The client receives route changes through a WebSocket stream on supervisor
TCP port `8080`. The token stays out of the WebSocket URL. The client reconnects
after a stream failure and requests a new routing bundle after a missed event.

## Shutdown

Call `end` when the application no longer needs the client. This closes the routing stream and SQL pools. The call can run more than once. Shutdown waits for checked-out connections and rejects if they remain active after the timeout.

Read [Usage](usage.md) for setup steps. Read [Public API](public-api.md) for method details.
