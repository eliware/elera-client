# Elera Client source/test inventory

This inventory records source-to-test mappings. Existing coverage is to be
moved, not rewritten, when a focused test is relocated.

## Current mappings

| Source area | Classification | Test status |
| --- | --- | --- |
| `src/index.mjs` | barrel | `tests/index.test.mjs`, integration entrypoint test |
| `src/client/managed.mjs` | orchestrator | managed lifecycle and integration tests |
| `src/client/**` | implementation | focused tests under `tests/client/` |
| `src/lifecycle/**` | implementation | focused tests under `tests/lifecycle/` |
| `src/pools/**` | implementation | focused tests under `tests/pools/` |
| `src/routing/**` | implementation | focused tests under `tests/routing/` |
| `src/config.mjs` | implementation | `tests/config.test.mjs` |
| `src/errors.mjs` | implementation | `tests/errors.test.mjs` |
| `src/pools.mjs` | barrel | covered by pool module tests |
| `src/client/create-db.mjs` | implementation | `tests/client/create-db/create-db.test.mjs` |
| `src/routing.mjs` | implementation | `tests/routing.test.mjs` (correct mirrored root path) |
| `src/telemetry.mjs` | implementation | `tests/telemetry.test.mjs` (correct mirrored root path) |
| `src/client/internal/credential-provider.mjs` | implementation | `tests/client/internal/credential-provider.test.mjs` |

## Cross-cutting tests

`tests/client/create-db/contract.test.mjs`,
`tests/contracts/shared-library-import.test.mjs`, and
`tests/integration/public-entrypoint.test.mjs` remain cross-cutting tests.

## Status

The inventory is established and every non-barrel source module has a current
focused or deliberately cross-cutting test mapping. Remaining work is to
review the flat root tests and move them only where the conventions require it;
existing coverage must not be rewritten or discarded.
