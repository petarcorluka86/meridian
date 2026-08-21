# Changelog

Every notable change to Meridian, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Meridian is pre-1.0: the vault format can still change between minor versions,
and `src/lib/vault/migrate.ts` carries a step for every change that has happened
so far. A migration that fails blocks the app rather than guessing.

## [Unreleased]

## [0.1.0] - 2026-08-21

The first public version.

### Added

- **The vault** — a folder of plain files as the only store. People, notes,
  tasks, time and plans, validated per row so a malformed file costs only
  itself. Snapshots, an mtime conflict check and an atomic rename on every
  write.
- **The screens** — Overview, People, a person, Notes, Tasks, Time balance,
  Vault, Changelog, Help and a setup wizard. Server components that read the
  index directly; client JavaScript only where a screen genuinely interacts.
- **Read-only integrations** — BambooHR, Google Calendar and GitHub. Every
  outbound request is a `GET`, enforced by `src/lib/net-guard.ts`, by a unit
  test that fails the build, and by a `pre-commit` hook. Cache first, then
  revalidate; a source that is down leaves the last good numbers on screen with
  their age named.
- **The design system** — 81 tokens in `src/styles/tokens.css`, applied only by
  the primitives in `src/components/ui/`, with a test that fails the build on a
  colour, font, spacing, radius or shadow written anywhere else.
- **Storybook** — the design system's own view of itself: rules, catalogue,
  foundations and components, with telemetry and the version check off.
- **The pixel gate** — thirteen screens against recorded baselines at zero pixel
  tolerance, on a pinned vault, clock and set of credentials.
- **The CLI and MCP server** — the same store layer as the interface, so a
  terminal or an agent gets the same validation and conflict checks.
- **Security controls** — binds `127.0.0.1`, refuses a foreign `Host`, refuses a
  cross-origin mutation, resolves every path inside the vault, serves only four
  image extensions from the vault, keeps credentials out of the browser and out
  of commits, blurs money behind a self-expiring reveal, and appends every
  outbound request to an egress log readable from Help.

[Unreleased]: https://github.com/petarcorluka86/meridian/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/petarcorluka86/meridian/releases/tag/v0.1.0
