# Known convention exceptions

Last reviewed: 2026-08-29

## Intentional exceptions

- The package does not publish an `examples/` directory. Application examples
  live in the separate `elera-example` project, so the package allowlist does
  not include a nonexistent path.
- Tests import `@jest/globals` for Jest mocks and assertions, matching the
  established `elera-lib` test pattern. `@eliware/test` remains the test
  harness used by the package scripts.

## Environment note

- On the current Windows npm 11 environment, invoking `npm run audit` causes
  npm's project-scoped script-policy error. The equivalent direct audit with
  `--ignore-scripts` passes with zero vulnerabilities; CI invokes that form.
