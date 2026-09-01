# Privacy

This file exists for people outside this repository: anyone installing the
`meridian-vault` MCP bundle, and the connector review that asks for a privacy
policy by URL. It describes the MCP server and the app it belongs to.

## What is collected

Nothing. There is no analytics, no telemetry, no crash reporting, no version
check and no external resource in the interface.

## Where the data lives

In one folder on your own machine — the vault — and in `.env` in the app folder
beside it. Both are yours. Meridian has no account, no server of its own and no
place to sync to; there is nothing to sign in to and nothing held anywhere else.

## What leaves the machine

Two things, and only when you set them up:

1. **Reads from BambooHR, Google Calendar and GitHub**, using credentials you
   supply, when you open a screen that shows them or press a badge to refresh
   one. Every one is a `GET`. Nothing is ever written back to those services.
   The single exception is the OAuth token exchange Google's protocol requires
   as a `POST`, which is authentication rather than a write, and which is
   permitted by exact URL.
2. **Whatever you push**, if you make the vault a git repository with a remote of
   your choosing, and confirm the push. With no remote configured, nothing can
   leave.

Every outbound request is appended to `.cache/egress.log` inside the vault and
is readable from the app's Help screen and through the `read_egress` tool.

## The MCP server specifically

`meridian-vault` makes **no network requests at all**. It reads and writes files
in the vault folder you point it at, and reads the caches those integrations
left there — saying how old each one is. It cannot refresh them, and it cannot
reach BambooHR, Google or GitHub. This is enforced by a test that fails the
build if anything under `mcp/` so much as names a sync, the layers under one, or
`fetch`.

What an MCP client does with the vault contents it reads is that client's
business, and governed by that client's own policy — the same as any file you
open in it.

## Contact

Anything that looks like a security problem goes to the address in
[SECURITY.md](SECURITY.md), privately, rather than into an issue.
