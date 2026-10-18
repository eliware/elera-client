# Architecture

The package root exports `createDb` from `src/index.mjs`.
It exports public types from `src/index.d.ts`.
Keep internal modules out of the `package.json` exports.

## Client modules

Keep the managed client in `src/client/managed/`.
Keep SQL client setup in `src/client/runtime/`.
Keep token checks and credentials in `src/client/auth/`.
Keep bundle checks, profiles, refresh, and state in `src/client/bundle/`.

Keep route selection, SQL work, and stream setup in `src/client/routing/`.
Keep health checks in `src/client/diagnostics/`.
Keep shutdown and pool close rules in `src/client/lifecycle/`.
Keep client telemetry in `src/client/telemetry/`.

## Shared modules

Keep node pools in `src/pools/node/`.
Keep route pools in `src/pools/route/`.
Keep SQL routing rules in `src/routing/query/`.
Keep bundle request and version rules in `src/routing/bundle/`.

Keep stream connection and event rules in `src/routing/stream/`.
Keep routing node checks in `src/routing/nodes/`.
Keep configuration checks in `src/config/`.
Keep telemetry state and output in `src/telemetry/`.

Keep SQL error rules in `src/errors/`.

## Tests and fixtures

Mirror each source module with a test at the same path under `tests/`.
Keep package entry tests in `tests/index.test.mjs`.
Keep client runtime tests in `tests/client/runtime/`.
Keep pool tests in `tests/pools/`.

Keep shared routing tests in `tests/routing/`.
Keep configuration tests in `tests/config/`.
Keep SQL error tests in `tests/errors/`.
Keep telemetry tests in `tests/telemetry/`.

Keep shared test data in `test-fixtures/`.
Keep client fixtures in `test-fixtures/client/`.
Keep bundle fixtures in `test-fixtures/client/bundle/`.
Keep pool fixtures in `test-fixtures/pools/`.

Keep stream fixtures in `test-fixtures/routing/`.
Run focused tests for each change.
Run the full `npm test` suite before each milestone commit.
