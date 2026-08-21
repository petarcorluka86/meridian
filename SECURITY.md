# Security

Meridian runs on one machine, binds `127.0.0.1`, and points at a real HR system.
That combination is why the guarantees below are treated as the product rather
than as hardening.

## Reporting a vulnerability

**Do not open a public issue.**

Use GitHub's private reporting — the **Security** tab, *Report a vulnerability* —
or email **petarcorluka86@gmail.com**.

Please include what an attacker can do, the steps to reproduce, and the commit
you saw it on. You will get an acknowledgement within a few days. This is a
single-maintainer project, so a fix is best-effort rather than a promised
window; you will be told either way, and credited in the release notes unless
you would rather not be.

Never include your own vault contents, your `.env`, or any credential in a
report. Reproduce against the committed fixture vault
(`VAULT_PATH=./src/fixtures/vault`) wherever that is possible.

## Supported versions

The tip of `main`. There are no maintenance branches.

## What counts as a vulnerability here

Anything that breaks one of these:

| Guarantee | Where it is enforced |
| --- | --- |
| No request to BambooHR, Google or GitHub uses a method other than `GET`, apart from the OAuth token endpoint by exact URL | `src/lib/net-guard.ts`, `tests/unit/readonly.test.ts`, the `pre-commit` hook |
| No outbound request reaches a host outside the allow-list, on any hop of a redirect | `src/lib/net-guard.ts` |
| The app is not reachable from another machine, and not drivable by a web page in the browser | binds `127.0.0.1`; the `Host` and cross-origin checks in `src/proxy.ts` |
| No path escapes the vault, by traversal or through a symlink | `safeVaultPath()` in `src/lib/vault/paths.ts` |
| A file served from the vault cannot execute against the app's own origin | `src/app/vault-file/route.ts` serves four image extensions and nothing else |
| Credentials never reach the browser, never land in the vault, and never enter a commit | `src/lib/secrets.ts`, `commitAll`, `npm run vault:scan`, `npm run vault:hook` |
| Nothing fetched from an integration is written into a vault inside this repository | `vaultIsInsideApp()`, `tests/unit/fixture-guard.test.ts` |
| No telemetry, no version check, nothing in the UI loading from the internet | the CSP in `next.config.ts` |

A way around any of those is a vulnerability, including one that only works
because a gate can be skipped rather than because the code is wrong.

## What does not count

- Needing local access to the machine, or the user's own shell. Meridian trusts
  whoever is already sitting in front of it.
- The vault being readable by other processes running as the same user. It is a
  folder of plain files on purpose.
- Dependency advisories with no reachable path from this code. Report them as
  ordinary issues.

## What leaves the machine

Every outbound request appends a line to `.cache/egress.log`, readable from the
Help screen. If you see a line there that this list does not explain, that is
worth reporting.
