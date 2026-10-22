# AGENTS.md

## Project

Build `@eliware/elera-client`, an Eliware client for managed MySQL and MariaDB access. Use Node.js 26 or later and native ESM.

## Scope and boundaries

Expose the managed database client as the public API. Keep shared bundle contracts in `@eliware/elera-lib`. Do not publish or deploy during validation.

## Layout

Keep runtime modules in `src/`, tests in `tests/`, fixtures in `test-fixtures/`, guides in `docs/`, examples in `examples/`, and specifications in `specs/`.

## Development

Install dependencies with `npm ci`. Read [the specifications index](specs/README.md) before changing repository requirements.

## Validation

Run `npm test` for aggregate validation.
Run `npm run lint` for lint checks.
Run `npm run audit` for dependency checks.
Run `npm run format` to format files.
Run `npm run format:check` to check formatting.

## Security

Keep tokens, passwords, and private data out of source control and logs.

## Changes

Keep documentation current. Update the nearest index when you add a document.

## Library

Run focused tests first during development. Run one test file with `npm test -- tests/path/to/example.test.mjs`.

Run multiple test files with `npm test -- tests/path/to/first.test.mjs tests/path/to/second.test.mjs`.

Prevent repeated full-suite runs during development. Run the full `npm test` suite for final validation before a commit, milestone, or release.

## npm publication

Follow approved Eliware Operations procedures before publication.
