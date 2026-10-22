# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/elera-client [![npm](https://img.shields.io/npm/v/@eliware/elera-client)](https://www.npmjs.com/package/@eliware/elera-client) [![License](https://img.shields.io/github/license/eliware/elera-client)](https://github.com/eliware/elera-client/blob/main/LICENSE) [![CI](https://github.com/eliware/elera-client/actions/workflows/ci.yaml/badge.svg)](https://github.com/eliware/elera-client/actions/workflows/ci.yaml)

Application-facing Elera client for managed MySQL/MariaDB routing, failover, lifecycle, and telemetry

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [API](#api)
- [Packaging](#packaging)
- [Examples](#examples)
- [Support](#support)
- [Links](#links)
- [License](#license)

## Features

Create a managed MySQL or MariaDB client. Get SQL credentials and routes from the Elera API.

Read the [user guides](docs/README.md), [examples](examples/README.md), [specifications](specs/README.md), and [release notes](RELEASE_NOTES.md).

## Requirements

Use Node.js 26 or later in a native ESM project.

## Setup

Install the package in your application:

```sh
npm install @eliware/elera-client
```

## Usage

Set `ELERA_API_URL` and `ELERA_API_TOKEN`, then call `createDb()`. Read the [release notes](RELEASE_NOTES.md) for package changes:

```js
import { createDb } from "@eliware/elera-client";

const db = await createDb();
try {
  const [rows] = await db.query("SELECT 1 AS connected");
  console.log(rows);
} finally {
  await db.end();
}
```

Read the [usage guide](docs/usage.md) for configuration and examples.

## Development

Use Node.js 26 or later. Run `npm ci` from the repository root. Read [the specifications index](specs/README.md) for repository requirements.

## Testing

Run `npm test` for aggregate validation. Run `npm run lint`, `npm run audit`, `npm run format:check`, `npm run typecheck`, or `npm run pack` for focused checks. Run `npm run format` to format files.

## Troubleshooting

If setup fails, check the Elera API URL and application token. Read the [troubleshooting guide](docs/troubleshooting.md) for steps.

## Security

Use an application token. Keep credentials out of source control, logs, and URLs.

## API

The package exports `createDb()` from its root. Read the [public API guide](docs/public-api.md) for options and client methods.

## Packaging

The `files` field in `package.json` lists `src/`, `docs/`, `README.md`, `AGENTS.md`, `LICENSE`, `RELEASE_NOTES.md`, `examples/`, `specs/`, and `.env.example` for npm packaging.

Use numeric `MAJOR.MINOR.PATCH` versions. Use a `v<version>` tag for each release. The npm workflow starts when you push a tag.

Run `npm run pack` to check package contents. Publish only after approved Operations procedures.

## Examples

Run `node examples/basic.mjs` to see the managed client. Read [examples/README.md](examples/README.md) for prerequisites and expected results.

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)[![eliware.org](https://eliware.org/logos/eliware_96.png)](https://discord.gg/M6aTR9eTwN)

**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## Links

- [Home Page](https://eliware.org)
- [GitHub Org](https://github.com/eliware)
- [GitHub Repo](https://github.com/eliware/elera-client)
- [Bug Reports](https://github.com/eliware/elera-client/issues)
- [npm](https://www.npmjs.com/package/@eliware/elera-client)
- [Discord](https://discord.gg/M6aTR9eTwN)

## License

[MIT © Eliware](LICENSE)
