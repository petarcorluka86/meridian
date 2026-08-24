# Changelog

Every notable change to Meridian, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Meridian is pre-1.0: the vault format can still change between minor versions,
and `src/lib/vault/migrate.ts` carries a step for every change that has happened
so far. A migration that fails blocks the app rather than guessing.

## [Unreleased]

### Added

- **Projects** — work that runs longer than a task. A title, a description and
  phases: the checkpoints it has to pass, ticked off by hand and independent of
  tasks. A project with phases shows how far it has got as a bar and a fraction;
  one without them shows neither, because there is nothing to be a fraction of.
  Each project opens as its own page with its phases, tasks, notes and links.
- **A project is selectable wherever a person is** — quick capture, the task
  form, the task edit dialog, a note's own row and the Notes filters. Tasks carry
  `projectId`; notes carry `project` in their front matter, which is the one key
  there that names something outside the note, because a project is not a folder.
- **Archiving** — a flag, never a delete. Nothing is removed, its tasks stay
  where they are, and restoring gives back exactly what went in. Deleting a
  project is the destructive one, and the confirmation says what survives: the
  project and its phases go, its tasks and notes stay where they are and lose the
  project.
- **`Meter`** — the design system's one new primitive, a proportion of a known
  total. Two tones, and `success` is the one that means the total was reached.
- **`projects.json`** — one new file at the vault root, phases and links nested
  in each record. No folder per project.

### Changed

- The vault CLI gained `projects`, and `task-add` / `note-add` / `notes` take
  `--project`. The MCP server gained a read-only `list_projects`; `add_task` and
  `write_note` take the project, but creating and archiving one stays with the
  person doing the work.

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
