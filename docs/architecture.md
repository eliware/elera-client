# Architecture

The package exposes `src/index.mjs` and `src/index.d.ts`.
Keep internal modules private in `package.json`.

## Client modules

Keep the managed client in `src/client/managed/`.
Keep SQL client assembly in `src/client/runtime/`.
Keep token checks and credential handling in `src/client/auth/`.
Keep bundle validation, profiles, refresh, and state in `src/client/bundle/`.
Keep route choice, query work, and stream attachment in `src/client/routing/`.
Keep health checks and probes in `src/client/diagnostics/`.
Keep drain, shutdown, and pool retirement in `src/client/lifecycle/`.
Keep client telemetry setup and operation timing in `src/client/telemetry/`.

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

Mirror each source module with tests at the same path under `tests/`.
Keep package entry tests in `tests/index.test.mjs`.
Keep client runtime tests in `tests/client/runtime/`.
Keep pool tests in `tests/pools/`.
Keep shared routing tests in `tests/routing/`.
Keep configuration tests in `tests/config/`.
Keep SQL error tests in `tests/errors/`.
Keep telemetry tests in `tests/telemetry/`.
Keep shared test data in `test-fixtures/`.
Keep client fixtures under `test-fixtures/client/`.
Keep bundle fixtures under `test-fixtures/client/bundle/`.
Keep pool fixtures under `test-fixtures/pools/`.
Keep stream fixtures under `test-fixtures/routing/`.

Run focused tests for each change.
Run `npm test` before each sprint commit.
