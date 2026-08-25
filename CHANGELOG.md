# Changelog

Every notable change to Meridian, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Meridian is pre-1.0: the vault format can still change between minor versions,
and `src/lib/vault/migrate.ts` carries a step for every change that has happened
so far. A migration that fails blocks the app rather than guessing.

## [Unreleased]

### Removed

- **The notes inbox.** `notes/inbox/` held anything captured without a person
  until it was filed, and the filing was the flaw: the only way out of that
  folder was to name somebody, so a note genuinely about nobody sat in a queue
  that could never be emptied. A note with no person now lives in
  `notes/general/` from the start, and giving it a person still moves the file
  into their folder. The Inbox filter and the Inbox label are gone with it.

### Changed

- **The vault format is at version 2**, and this is its first migration: notes
  in `notes/inbox/` are moved into `notes/general/` when the app opens a vault
  written before the change. Leaving them would have kept them on disk and hidden
  them from the Notes screen at the same time. A filename that already exists in
  `notes/general/` keeps both files — the moved one gains `-inbox` before its
  extension rather than overwriting anything.

### Added

- **The wizard finds where your company keeps pay.** BambooHR's standard
  `compensation` table is empty at plenty of companies, and an empty table looks
  exactly like a company that pays nobody. The BambooHR step now asks which
  tables exist, probes the pay-shaped ones against your own employee id, and
  writes `BAMBOOHR_COMP_TABLE` from whichever answers — naming it, and how many
  rows it found, in the line it reports. It was the one credential nobody was
  asked for, so a `.env` rebuilt by the wizard came back without it and pay
  silently stopped working.

- **A project's Tasks and Notes cards can start one.** Both carry the button the
  Phases and Links cards already had, and what it makes is already attached to
  the project — the one field the form does not ask for, because the project is
  the page. A task takes a title and nothing else; priority, a date and who it is
  for are one press away in the row's own dialog. A note opens as soon as it
  exists, since a note is a thing you write.

- **New note is on the Notes screen**, at the top of the list, always — not only
  when the vault is empty. It lands on whoever the list is filtered to.
- **Editing a note is editing the file.** The writing surface is as tall as the
  window, Tab indents instead of leaving the field, ⌘S saves and Escape cancels.
  Tab is inserted through the browser's own `insertText`, so the caret lands
  where it should and ⌘Z still walks back through what was typed — setting the
  value from state does neither.
- **A note can be deleted**, from the note's own toolbar and behind a
  confirmation that names the file. A snapshot is taken first, so
  `npm run vault:restore` can bring it back and nothing in the app can — the
  same promise every other deletion here makes. `delete_note` is the MCP tool for
  it, which takes the registry to thirty-three tools and closes the last row that
  was Closed because the app could not do it either.

- **A dark scheme**, and a Settings screen with the switch on it: Light, Dark or
  System. Meridian opens in Light until told otherwise — it is a light app that
  has a dark scheme, and which one it opens in is a choice made on that screen
  rather than one the Mac makes at sunset. System hands the decision back and
  changes with the Mac; Light and Dark ignore it.
  The choice lives in `MERIDIAN_THEME` in `.env` — the app's own setting, not the
  team's, so it never travels with the vault — and the server renders it onto the
  document, so the first paint is already the right scheme rather than a flash of
  the wrong one.
- **One set of tokens, two schemes.** Every colour in `tokens.css` is a
  `light-dark()` pair and `color-scheme` picks the half, which also hands
  scrollbars, date pickers and the rest of the browser's own furniture to the
  right one. There is no second palette to keep in step, and the design-system
  gate now fails the build on a colour that answers for only one scheme.
- **`--accent-ink` and `--accent-ink-hover`** — the accent as words rather than
  as a fill. The same blue does both jobs on paper; on a dark ground a blue dark
  enough to carry white text cannot be read as text, so the two part company
  there and stay identical here.
- **The calendar is Google credentials, checked before they are saved.** The
  secret iCal address is gone: a company Workspace usually has those switched
  off, and a URL that is itself an unexpirable, unscopable credential is the
  wrong shape for an account somebody else administers. In its place, four values
  from your own Google Cloud project — client id, client secret, refresh token,
  calendar id — checked together against Google and written only if that account
  can actually read the calendar you named. A wrong id is named back with the
  ones that would have worked. The hand-written iCal parser went with the old
  path, and `Config.calendar` is one shape again instead of two.
- **Connecting a source is one screen, reached from two places.** Settings →
  Connect opens `/setup?only=<source>` — that one step of the wizard, with the
  same checks and the same copy, returning to Settings when it is made.
- **`Stepper`** — the design system's one new primitive, and the wizard's
  progress drawn rather than described: a tick on a filled disc for a finished
  step, a coloured line up to it, a dashed hairline for everything ahead. The row
  of pills it replaced read "✓ 1 · Your folder" — a sentence to parse, and one
  that gave a finished step and the current one the same weight.
- **Setup has no sidebar**, and sits in the middle of the window. On a first run
  every link in that nav points at a vault that does not exist yet.
- **The wizard ends in a first fetch**, on a screen of its own: "Meridian is
  setting up…", the whole window, everything connected pulled in once and one
  source at a time before the app opens — so the first Overview has your team on
  it instead of three empty cards filling in one by one. The bar is a proportion
  rather than a spinner, because the number of sources is known. A clean run
  walks straight into the app; a source that fails says so and stops the wait
  rather than trapping you in it.

### Fixed

- **The sidebar came back only after a hard reload** once the wizard was
  finished. Whether to draw it was decided in the root layout, which is rendered
  once per document and kept across every client navigation after it; it is now
  decided from the pathname, in the shell itself.
- **Connections, on the Settings screen** — whether each of the three sources is
  set up, how old its answer is, and the badge that goes and looks again. A
  source that is not set up names the keys it is waiting for rather than only
  saying it is off.
- **Reset**, and it is the only thing in the app a snapshot cannot undo. The
  confirmation counts what is actually there — "6 notes, 9 tasks, 5 projects,
  6 people and 10 hour entries" — and says whether a copy exists on a remote,
  because that is the one thing worth knowing before pressing it. Emptying
  the vault takes its Git history and its snapshots with it, because both live
  inside the folder, and the confirmation says so instead of pointing at
  `vault:restore`. A full reset removes `.env` as well and reopens at the setup
  wizard. Guarded against the three ways it could take something else: the
  fixture vault, a `VAULT_PATH` left at `/`, and one left at `~`.
- **The write gate now covers deleting** — `tests/unit/paths.test.ts` names the
  five files allowed to remove something from disk, the way it already named the
  eight allowed to write. Nothing checked deletions before, which was survivable
  only while the sole deletion in the app was a snapshot being pruned.
- **No test can read the developer's own `.env`** — `tests/setup.ts` points
  `MERIDIAN_ENV_PATH` at a path that cannot exist. A test that clears
  `VAULT_PATH` used to fall through to the real vault, which is how the reset's
  own test emptied one.
- **The pixel gate covers both schemes** — sixteen screens each, thirty-two
  images, the scheme pinned per Playwright project and the stored theme pinned to
  `system` so nothing about the machine decides what gets recorded.

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
- **The Mac app** — `./desktop/build-app.sh` writes `~/Applications/Meridian.app`:
  a `WKWebView` window that starts the dev server if nothing is listening on
  3210 and leaves one you were already running alive on quit. The repo is the
  app, so a pull is a new version and there is nothing to package.
- **The MCP server reaches the rest of the app** — thirty-two tools, covering
  the whole task and note surface, projects and their phases, hours, pay, the
  Overview, the caches behind it, the vault's own health and its git state.
  Every cached answer says how old it is, and nothing under `mcp/` may make a
  request: an agent may not make this app go to the network, and
  `tests/unit/readonly.test.ts` fails the build on a sync named there.
- **`MCP-COVERAGE.md`** — every capability in the app as a row, marked Open,
  Closed or Never, so what an agent cannot reach is a decision written down
  rather than a gap to be rediscovered.
- **A task is finishable anywhere** — the tick box works on Tasks, on the
  Overview and on a person's page, and the pencil opens the same dialog
  everywhere, including deleting behind a second press.
- **Every empty state has a tile, a title and a reason**, spread in whole from
  `src/copy/` so the same emptiness cannot be green on one screen and grey on
  the next.

### Fixed

- **Clicking the header of the People detailed table opened somebody's profile**,
  and that person's row was highlighted from the moment the screen opened. The
  row-wide link is one anchor stretched over its row, and it was anchored to the
  `<tr>` — where `position: relative` is undefined per spec. An engine that
  ignores it resolved the overlay against something card-sized, so the last row's
  invisible anchor covered the whole table, header included. It is anchored to
  the cell it lives in now, which is a block container everywhere, and the
  row-wide hit area is unchanged.

### Changed

- The vault CLI gained `projects`, and `task-add` / `note-add` / `notes` take
  `--project`. Projects stay read-only over MCP — `list_projects` and
  `read_project` name one so a task or a note can be filed against it, but
  creating, phasing and archiving stay with the person doing the work.
- **Meetings say where they are in the day** — what is running now is marked,
  what is over is struck through, and the state is worked out on the server so
  the visitor's clock cannot disagree with it. Meetings, Working from home and
  Out each step through the days the calendar cache can answer for.
- **The app icon is the mark in ink on a filled white tile.** Three hairlines on
  a transparent ground disappear at Dock and tab sizes.
- Fields no longer draw a focus ring.

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
