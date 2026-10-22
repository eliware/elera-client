# Examples

The [basic.mjs](basic.mjs) example runs a query with the managed client.

## Prerequisites

Use Node.js 26 or later in an ESM project. Set `ELERA_API_URL` to `https://elera.example.test` and `ELERA_API_TOKEN` to `replace-with-application-token` before you run the example.

## Command

Run `node examples/basic.mjs` from the repository root.

## Expected result

The example prints one row with the `connected` value set to `1`. It closes the client after the query.
