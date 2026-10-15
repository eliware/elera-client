# AGENTS.md

## Project

Build `@eliware/elera-client` with Node.js 26 and native ESM.

## Scope and boundaries

Keep the public API limited to the managed database client.
Keep shared bundle contracts in `@eliware/elera-lib`.
Do not publish or deploy during validation.

## Layout

Keep runtime modules in `src/`.
Keep tests in `tests/`.
Keep test support in `test-fixtures/`.
Keep user documentation in `docs/`.
Keep repository specifications in `specs/`.

## Development

Give each source and test module one clear purpose.
Limit source modules to 100 lines.
Limit test modules to 200 lines.
Match each source module with one test module at the same path.

## Validation

Run `npm test` for package validation.
Run `npm run lint` for lint checks.
Run `npm run audit` for dependency checks.
Run `npm run format` to format files.
Run `npm run format:check` to check file format.
Run `npm run pack` to check package contents.

## Security

Keep tokens, passwords, and private data out of source control and logs.

## Changes

Keep documentation current.
Follow the shared repository conventions.

## Library

Export supported application methods only.
Keep one test module for each source module.

## npm publication

Check that a release tag matches the package version.
Include the package files required by the supported API.
Run `npm run pack` before publication review.
