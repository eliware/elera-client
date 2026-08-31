# `elera-client` alignment drifts

Checklist against the revised Core Flow, supervisor plan, and applicable
repository conventions. Findings are recorded here before implementation work.

## Current status

- [x] Local `elera-lib` linking is intentional development state.
- [x] The client ownership boundary and endpoint/token defaults are in place.
- [x] Public API ownership documentation is aligned with the final boundary.
- [x] Source-to-test inventory created with existing coverage preserved.
- [x] Added focused tests for the previously uncovered config and error modules.
- [x] Moved the credential-provider test to its mirrored focused path without
  rewriting its assertions.
- [x] All non-barrel source modules now have a current focused or deliberate
  cross-cutting test mapping.
- [x] Confirmed root `routing.mjs` and `telemetry.mjs` tests are correctly
  mirrored at the repository root; no relocation is required.
- [x] Current `npm test` passes with 100×4 coverage and zero lint warnings.

## Actionable drifts

- [x] Update `docs/public-api.md` to assign client errors, lifecycle policy,
  telemetry, transport, SQL pools, and routing behavior to `elera-client`.
- [x] Reconcile the client public API documentation with the final application
  contract: applications require only endpoint and runtime token, while any
  additional options must be clearly documented as optional programmatic
  controls rather than required environment configuration.
- [x] Add or regenerate a source-to-test inventory; remaining missing focused
  tests and moves are recorded in that inventory.
- [x] Verify the temporary `file:../elera-lib` dependency is used only for
  development and restore the published semver dependency before packaging.
- [x] Audit `@eliware/common` for actual runtime usage; retain it for the
  source module imports that use its logger.
- [x] Review the public export test and declarations against Core Flow so only
  application-facing `createDb()` and client-operational errors are public.
- [x] Existing focused and integration tests cover routing-update, drain,
  recovery, shutdown, REST resync, reconnect deadlines, node identity,
  bundle versions, and cluster-unavailable states.
- [x] Add integration coverage proving the client consumes supervisor bundles
  and events without importing supervisor or CLI internals.
- [x] Re-ran the final 100×4, lint, typecheck, contract, audit, and package
  gates after the documentation and boundary corrections. CI remains a
  separate remote check.
- [x] Latest remote Node.js CI runs completed successfully for commit
  `b1f164dd4f96ae6f3aea9f06243eabf9f1cb8437`.

## Verified alignment

- [x] Application configuration supports `ELERA_API_URL` and
  `ELERA_API_TOKEN` defaults.
- [x] The client owns `createDb()`, SQL pools, routing, failover, reconnect,
  REST resync, drain handling, shutdown handling, and client telemetry.
- [x] WebSocket authentication uses an Authorization bearer header.
- [x] The example-facing package boundary does not require SQL credentials,
  physical database names, node names, or cluster settings.
- [x] No direct supervisor, CLI, lab, GitOps, backup, or Galera imports were
  found in the client source.
- [x] No non-barrel Istanbul ignores were found.
