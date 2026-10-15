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

Create a managed MySQL or MariaDB client. Use the Elera API for routes and credentials.

## Requirements

Use Node.js 26 or later.

## Setup

Run `npm install @eliware/elera-client` in your application.

## Usage

Set `ELERA_API_URL` and `ELERA_API_TOKEN`. Read the [documentation index](docs/README.md), [examples index](examples/README.md), [specification index](specs/README.md), and [release notes](RELEASE_NOTES.md).

## Development

Keep runtime code in `src/`. Keep tests in `tests/`.

## Testing

Run `npm test` for package validation.

## Troubleshooting

Follow the [troubleshooting guide](docs/troubleshooting.md).

## Security

Keep tokens and passwords out of Git, logs, and URLs.

## API

Read the [public API guide](docs/public-api.md).

## Packaging

Run `npm run pack` to check package contents.

## Examples

Read the [basic example](examples/basic.mjs).

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
