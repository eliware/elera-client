# Examples

## Basic client

Open [basic.mjs](basic.mjs) to review the example code.

Set `ELERA_API_URL` and `ELERA_API_TOKEN` before you run the example. Use an application token.

Run this command from the repository root:

```sh
node examples/basic.mjs
```

The example prints one row from `SELECT 1 AS connected`. It calls `db.end()` after the query.
