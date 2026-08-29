# @eliware/elera-client

The application-facing Elera SDK. It turns an Elera endpoint and
application-scoped bearer token into a native MySQL/MariaDB client with
transparent routing, failover, drain handling, reconnects, and telemetry.

```js
import { createDb } from '@eliware/elera-client';

const db = await createDb();
await db.query('SELECT 1');
await db.close();
```

Applications configure only `ELERA_API_ENDPOINT` and `ELERA_API_TOKEN`, or
pass `endpoint` and `token` to `createDb`. The client owns bundle retrieval,
credentials, routing, WebSocket updates, REST fallback, and SQL pools.

This package depends on `@eliware/elera-lib` for shared contracts and errors.
It does not provision databases, manage Galera, run backups, or expose
supervisor and CLI operations.
