# AGENTS.md

## Project

Build `@eliware/elera-client` with Node.js 26 or later.
Use native ESM.

## Scope and boundaries

Expose only the managed database client in the public API.
Keep shared bundle contracts in `@eliware/elera-lib`.
Do not publish or deploy during validation.

## Layout

Keep runtime modules in `src/`.
Keep launchers in `bin/`.
Keep tests in `tests/`.
Keep fixtures in `test-fixtures/`.
Keep user guides in `docs/`.
Keep specifications in `specs/`.

## Development

Give each source and test module one purpose.
Limit source modules to 100 lines.
Limit test modules to 200 lines.
Match each source module with one test module.

## Validation

Run `npm test` for aggregate validation.
Run `npm run lint` for lint checks.
Run `npm run audit` for dependency checks.

Run `npm run format` to format files.
Run `npm run format:check` to check formatting.
Run `npm run pack` to check package contents.

## Security

Keep tokens, passwords, and private data out of source control and logs.

## Changes

Keep documentation current.
Follow the shared repository conventions.

## Library

Export supported application methods only.
Keep one test module for each source module.
Run focused tests first during development.
Run one test file with `npm test -- tests/path/to/example.test.mjs`.

Run multiple test files with `npm test -- tests/path/to/first.test.mjs tests/path/to/second.test.mjs`.

Prevent repeated full-suite runs during development.
Run the full `npm test` suite for final validation before a commit, milestone, or release.

## npm publication

Follow Eliware Operations procedures for release approval.
