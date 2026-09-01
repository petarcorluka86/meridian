# Meridian

[![verify](https://github.com/petarcorluka86/meridian/actions/workflows/verify.yml/badge.svg)](https://github.com/petarcorluka86/meridian/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen.svg)](.nvmrc)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-fe5196.svg)](CONTRIBUTING.md#commits)
[![Read-only integrations](https://img.shields.io/badge/integrations-read--only-informational.svg)](SECURITY.md)

A local hub for running a team. One folder of plain files on your own machine, a
UI in front of it, and read-only pulls from BambooHR, Google Calendar and GitHub.

Nothing leaves the machine unless you push it, and nothing is ever written to
BambooHR, Google or GitHub.

## Start it

```bash
npm install
npm run dev
```

Node 22 or newer — `.nvmrc` has the version. Then open **http://127.0.0.1:3210** — a setup wizard walks you
through the rest, and everything else is documented inside the app under **Help**.

It binds to `127.0.0.1` only and refuses requests that claim to come from
anywhere else, so it is not reachable from another machine.

---

Cloning this to work on it? Run `git config core.hooksPath .githooks` once, so
the pre-commit checks run for you too.

| | |
| --- | --- |
| Working on the code? | [`CLAUDE.md`](CLAUDE.md) — architecture, decisions, conventions, commands |
| Pointing an agent at it? | [`MCP-COVERAGE.md`](MCP-COVERAGE.md) — every capability, and whether the MCP server reaches it |
| Sending a change? | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Found a hole? | [`SECURITY.md`](SECURITY.md) — do not open an issue |
| Wondering what it collects? | [`PRIVACY.md`](PRIVACY.md) — nothing, and where the data does live |
| Taking part? | [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) |

MIT licensed.
