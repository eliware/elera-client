# Elera Client source/test inventory

This inventory records source-to-test mappings. Existing coverage is to be
moved, not rewritten, when a focused test is relocated.

## Current mappings

| Source area | Classification | Test status |
| --- | --- | --- |
| `src/index.mjs` | barrel | `tests/integration/public-entrypoint.test.mjs` |
| `src/client/managed/index.mjs` | orchestrator | `tests/client/managed/managed.test.mjs`, lifecycle, configuration, public-api, and integration tests |
| `src/client/**` | implementation | focused tests under `tests/client/` |
| `src/lifecycle/**` | implementation | focused tests under `tests/lifecycle/` |
| `src/pools/**` | implementation | focused tests under `tests/pools/` |
| `src/routing/**` | implementation | focused tests under `tests/routing/` |
| `src/config.mjs` | implementation | `tests/config.test.mjs` |
| `src/errors.mjs` | implementation | `tests/errors.test.mjs` |
| `src/pools.mjs` | barrel | covered by pool module tests |
| `src/client/create-db/index.mjs` | orchestrator | `tests/client/create-db/cross-cutting.test.mjs` plus focused query, transaction, refresh, routing, shutdown, and integration tests |
| `src/routing.mjs` | implementation | `tests/routing.test.mjs` (correct mirrored root path) |
| `src/telemetry.mjs` | implementation | `tests/telemetry.test.mjs` (correct mirrored root path) |
| `src/client/internal/credential-provider.mjs` | implementation | `tests/client/internal/credential-provider.test.mjs` |
| `src/client/create-db/bundle-refresh.mjs` | implementation | `tests/client/create-db/bundle-refresh.test.mjs` |
| `src/client/create-db/bundle-state.mjs` | implementation | covered by create-db refresh and integration tests |
| `src/client/create-db/diagnostics.mjs` | implementation | covered by create-db client and integration tests |
| `src/client/create-db/query-execution.mjs` | implementation | `tests/client/create-db/query/query.test.mjs` |
| `src/client/create-db/route-selection.mjs` | implementation | covered by query and routing tests |
| `src/client/create-db/routing-events.mjs` | implementation | `tests/client/create-db/routing-events.test.mjs` |
| `src/client/create-db/shutdown.mjs` | implementation | `tests/client/create-db/shutdown.test.mjs` |
| `src/client/create-db/transaction.mjs` | implementation | `tests/client/create-db/transaction/transaction.test.mjs` |
| `src/client/managed/configuration.mjs` | implementation | `tests/client/managed/configuration.test.mjs` |
| `src/client/managed/public-api.mjs` | implementation | `tests/client/managed/public-api.test.mjs` |
| `src/routing/stream-client/index.mjs` | orchestrator | `tests/routing/stream-client/cross-cutting.test.mjs` plus focused connection, events, heartbeat, and reconnect tests |
| `src/pools/route-pool/delegation.mjs` | implementation | `tests/pools/route-pool/delegation.test.mjs` |
| `src/pools/route-pool/health.mjs` | implementation | covered by route-pool tests |
| `src/pools/route-pool/lifecycle.mjs` | implementation | covered by route-pool lifecycle tests |
| `src/pools/route-pool/selection.mjs` | implementation | covered by route-pool selection tests |
| `src/routing/stream-client/address.mjs` | implementation | covered by stream connection tests |
| `src/routing/stream-client/events.mjs` | implementation | `tests/routing/stream-client/events.test.mjs` |
| `src/routing/stream-client/heartbeat.mjs` | implementation | `tests/routing/stream-client/heartbeat.test.mjs` |
| `src/routing/stream-client/reconnect.mjs` | implementation | `tests/routing/stream-client/reconnect.test.mjs` |

## Cross-cutting tests

`tests/client/create-db/contract.test.mjs`,
`tests/contracts/shared-library-import.test.mjs`, and
`tests/integration/public-entrypoint.test.mjs` remain cross-cutting tests.

## Status

The inventory is current. Tests mirror source directories without a redundant
`src` segment. Aggregate orchestrator tests are deliberate cross-cutting
tests; focused modules have dedicated tests where isolation adds value, and
remaining small helpers are covered through their owning orchestrator tests.
