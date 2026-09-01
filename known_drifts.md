# Known convention exceptions

Last reviewed: 2026-09-01

## Intentional exceptions

- The package does not publish an `examples/` directory. Application examples
  live in the separate `elera-example` project, so the package allowlist does
  not include a nonexistent path.
- Tests import `@jest/globals` for Jest mocks and assertions, matching the
  established `elera-lib` test pattern. `@eliware/test` remains the test
  harness used by the package scripts.
- The client currently links the local `../elera-lib` checkout during
  coordinated development. This remains intentional until the shared
  contract is released and the dependency is switched to its published
  version.
- The managed public wrapper intentionally exposes only the mysql2-shaped
  methods. Internal transport, driver, routing, and telemetry injection
  options remain available to repository tests but are not supported
  application configuration.
