@AGENTS.md

# Meridian

> ## The rule that outranks everything else
>
> **Nothing is ever written to BambooHR, Google or GitHub. Every request is a
> GET, with exactly one exception, and the exception is named here.**
>
> That is the promise made to the user on the Help screen, and it is the reason
> this is safe to point at a real HR system.
>
> The exception is the OAuth token exchange — `TOKEN_ENDPOINT` in
> `src/lib/sources/calendar.ts` — which the protocol requires as a POST and which
> is authentication rather than a write to anyone's data. It is permitted **by
> exact URL**, so the rest of `oauth2.googleapis.com` is as closed as the rest of
> the internet, and a redirect cannot carry it anywhere else.
>
> Adding a second URL to that allowance is not a refactor. It is the same
> decision as adding a new host, and needs asking.
>
> It is enforced in three places, and all three must stay:
>
> 1. `src/lib/net-guard.ts` wraps the process's `fetch` and throws on any
>    non-GET request, and on any host outside its allow-list — checked on every
>    hop of a redirect, not only the first. Installed at server start via
>    `src/instrumentation.ts` and at the top of every script.
> 2. `tests/unit/readonly.test.ts` fails the build if a write method appears
>    anywhere in `src/`, if any `fetch` omits an explicit `method: 'GET'`, or if a
>    new host is referenced.
> 3. The `pre-commit` hook runs that test — after `git config core.hooksPath
>    .githooks`, which a fresh clone does not have.
>    `.github/workflows/verify.yml` runs the same test on push, so a clone with a
>    remote is covered whether or not the hook is installed. This repository has
>    no remote, so that workflow has never executed: today the hook is the only
>    one of the three that runs on a change, and it is opt-in per clone.
>
> **Do not weaken, bypass or special-case any of the three.** If an integration
> appears to need a write, stop and ask the user — that is a product decision,
> not an implementation detail. Adding a host to the allow-list also needs asking.

A local hub for running a team. One folder of plain files, a Next.js app in front
of it, read-only pulls from BambooHR, Google Calendar and GitHub. Single user,
single machine, no database.

## Where documentation lives

Two places, and nothing is written in both.

| Kind | Where | Rule |
| --- | --- | --- |
| Anything a user reads | The **Help** screen, `src/app/help/page.tsx` | The only source of truth. Never restate it in a Markdown file. |
| Anything an engineer or an agent reads | **This file** | The only source of truth. Architecture, decisions, conventions, commands. |
| What a component looks like | **Storybook**, `npm run storybook` | Shows rather than tells. Renders the real components; states no rule this file does not already state. See "Storybook" below. |

`README.md` is the badges, the two commands needed before the app can show you
Help, and a pointer to each of the files below. Nothing else — an explanation
that grows there is an explanation that has left Help.

Four files exist for people outside this repository rather than inside it, and
they are the only Markdown allowed to hold prose of their own: `CONTRIBUTING.md`
(how to send a change, and the Conventional Commits rules), `SECURITY.md` (what
counts as a vulnerability and where to report it privately), `CODE_OF_CONDUCT.md`
(Contributor Covenant 2.1, verbatim) and `LICENSE`. `CONTRIBUTING.md` points here
for anything architectural rather than restating it, and `SECURITY.md` names the
gate that enforces each guarantee — so when a gate moves, that table moves too.

Two invariants have their own gates, and both are tested: every visual value is
defined once in `tokens.css` and applied by a primitive
(`tests/unit/design-system.test.ts`), and nothing fetched from an integration may
be written into a vault inside this repository
(`tests/unit/fixture-guard.test.ts`).

If you find yourself adding a paragraph of user-facing explanation to a Markdown
file, it belongs in Help instead.

---

## Rules

- **Never introduce a database.** The vault filesystem is the only store.
- **Every write to a vault record goes through `src/lib/vault/write.ts`** —
  snapshot, mtime conflict check, atomic rename. Seven other files write to disk
  and are right to: credentials, the disposable caches, the append-only egress
  log, the scaffold that runs before there is a vault to write through, and the
  format version. They are named in `tests/unit/paths.test.ts`, and an eighth
  has to be added there deliberately.
- **Every path goes through `safeVaultPath()`** in `src/lib/vault/paths.ts`.
- **A note's person comes from its folder**, never from front matter. Front matter
  carries `category`, `draft`, `pinned` and nothing that repeats the path.
- **Integrations are read-only.** No request to BambooHR, Google or GitHub may use
  a method other than GET. Credentials never reach the browser.
- **Empty states and error lines come from `src/copy/`.** One wording per
  situation, used everywhere. Do not paraphrase at the call site. An empty-state
  entry carries its `tone` as well as its words, so the same emptiness cannot be
  green on one screen and grey on the next — and it is spread in whole,
  `{...EMPTY.tasks.allDone}`. The glyph is the only part the call site chooses,
  because it is the card's own icon and the catalogue does not know it.
- **Nothing derived is written to disk** — balances, counts and days-since are
  recomputed. A number that is never written down cannot drift.
- **A malformed file costs only itself.** Arrays validate per row; a bad entry is
  skipped and reported, the rest still load.
- **Pages are server components that call the store directly.** No `/api/*` for the
  app's own reads, no client `fetch` on first paint. Mutations are Server Actions.
- **Every value comes from `src/styles/tokens.css`, applied by a primitive in
  `src/components/ui/`.** A colour, a font, a padding or a radius written anywhere
  else is a value that will be missed when the system changes.
  `tests/unit/design-system.test.ts` fails the build on all five.
- **One word per concept.** `sync` goes to a source now; `refresh` goes only if
  the freshness window has expired; `vaultChanged()` / `configChanged()` in
  `src/app/changed.ts` say the local data changed. `revalidate` is Next's word
  and is left to Next — a `revalidateSources` of our own, sitting next to Next's
  `revalidatePath` and meaning something else, is how these got muddled.
- **Biome is the linter and the formatter.** Suppress a rule only at the site, with
  the argument in the suppression comment. Never widen `biome.json` to silence one
  file.

---

## Architecture, and why

### No database, ever

The vault is a folder of plain files and that is the whole store. It is the
product's central promise: everything is readable and editable without this app,
and it outlives it. A database would be faster at a scale this app never reaches.

### Tasks and time are one file each, not one per year

A mature vault is on the order of 2 000 tasks, and parsing all of it takes under
40 ms, once, at boot. Splitting by year would buy a smaller parse of a file that
is already trivial and cost real complexity in the hottest query path: a task due
2026-12-30 and completed 2027-01-02 straddles two files, and every "what is late"
query has to read the previous year too.

If a single file ever becomes uncomfortable to diff, the escape is to move closed
years to `archive/tasks-<year>.json` under an explicit command, read only by
search and history. Not built.

### A note's person comes from its folder

Two sources of truth for one fact is how a note ends up in one person's folder
claiming to be about someone else. Moving a note between folders changes who it
is about — which is exactly what editing a note's person does in the UI.

### A design system, not a stylesheet

Colour, type, space, shape and elevation are decided once in
`src/styles/tokens.css`, and applied by the primitives in `src/components/ui/`. A
screen imports from `@/components/ui` and writes CSS only for layout no primitive
covers — nine modules, 590 lines, none of which sets a value.

That is the whole point: recolour the accent or round the corners differently and
every button, chip, card and dialog on every screen follows, because there is
nowhere else for those decisions to be hiding.

The scales are **closed** — ten type levels, seven spacing steps, five radii, two
shadows, two control heights, four tones. An eleventh of anything is an edit to
`tokens.css` and to a primitive, deliberately. Before this existed there were 64
distinct `font` shorthands at 19 sizes, 17 gap values, the card shape written out
21 times across 11 modules, and the neutral button declared four times with four
paddings.

Tailwind would mean `rounded-[11px] px-[18px] text-[13px]` at every call site,
which is strictly worse at reproducing exact values and makes the pixel gate
harder to hold. `<Button variant="primary">` is better than both.

**The rules are in Storybook** — `npm run storybook`, the Rules page — because
that is where somebody is when they need them.

### Pages read the store directly

The browser asks for a URL and gets HTML with the numbers already in it. One
route handler exists, `src/app/vault-file/route.ts`, because serving a cached
photo has to be a route.

Client JavaScript is islands only: quick capture, filter chips, the reveal
countdown, the diff toggle, the note editor, the vault tree. Everything else
ships no JS.

### The index is built once and kept in memory

One recursive walk at boot parses and validates every file; every request after
that reads memory. External edits — from an editor, from an agent — arrive
through `fs.watch` with a 50 ms debounce, which is what makes "edit the files by
hand while the app is running" a supported mode rather than a hazard.

A malformed file is kept out of the index and recorded in `problems[]`. The page
that would have used it names the exact file; every other page is unaffected. A
corrupt `entries.json` must never read as "no people".

### Cache first, then revalidate

The server component reads `.cache/<source>.json` and renders immediately with a
`SyncBadge` — how old the numbers are, and a button that goes and looks again. An island calls a Server Action, which makes the conditional
request server-side, writes the cache only on a 200, and revalidates the path.
Values swap in place — **a revalidation of data already on screen never blanks
it.** Skeletons appear only when there is no cache at all.

Freshness windows are per source and come from `.env`. When a source is down the
last good cache stays on screen with its age named; notes, tasks, plans and hours
never touch the network and stay fully usable.

**Two kinds of list, and they are not interchangeable.** `CardRow` is full width
with a hairline above it, for rows that *are* the card's content. `NavList` is an
inset column of rounded rows with a gap, for controls that happen to be stacked —
the sidebar, Help's sections, the vault tree, the changelog's changed files. All
four of those were written by hand and three forgot the inset, so the rows sat
flush against the card and the gap was whatever the line-height left.

**Every card title is one level.** There used to be a `small` variant of
`CardHeader` for the narrow column, with no rule for which went where — so
Meetings and Out ended up different sizes side by side. It is gone.

`SyncBadge` says the age and *is* the button: pressing it calls
`syncSourceAction(target)`, which refetches that one dataset **ignoring** the
freshness window — a badge that says "2m" has to actually go and look, or it is a
decoration. `refreshSourcesAction`, the background one the shell runs every
minute, still respects the window. The age is computed server-side
(`shortAge` in `lib/sources/cache.ts`) because a relative time worked out from
the visitor's clock disagrees with the server's, which React calls a hydration
mismatch and a reader would call a lie.

---

## Security

| Risk | Control |
| --- | --- |
| Reachable from another machine | Binds `127.0.0.1` explicitly. Never `0.0.0.0`. |
| DNS rebinding — the attack that lands against local apps | `src/proxy.ts` refuses any `Host` that is not `127.0.0.1`, `localhost` or `[::1]`, port validated as digits. |
| A web page driving the app through the browser | A mutation must carry `Sec-Fetch-Site: same-origin`/`none` or a same-origin `Origin`. One carrying neither is refused. |
| Path traversal | Every path through `safeVaultPath()`: resolve, realpath, assert the prefix, refuse symlinks that leave the vault. `vault-file` resolves first and then checks the path landed in `.cache/photos/`. |
| Script execution through a served file | `vault-file` serves four image extensions and nothing else. An SVG or HTML file served inline from this origin would run against the app. |
| Secrets on disk | `.env` in the app folder, `0600`, git-ignored, never inside the vault. Wrong mode is a loud warning. Credentials never reach the client. |
| Anything loading from the internet | CSP in `next.config.ts`. Avatars from `.cache/photos/`. No web fonts. |
| Data leaving on a push | Behind a confirmation naming what the vault holds. No remote configured means nothing can leave. |
| Shoulder-surfing | Money and plans blur behind a per-card Reveal with a visible 30-second countdown that expires on its own. No setting turns it off. |
| Unaudited outbound traffic | Every outbound request appends to `.cache/egress.log`, readable from Help. |
| Shell injection via git | `execFile` with argument arrays. No shell string interpolation. |
| Telemetry | None. No version check, no analytics, no external resource in the UI. |

**Credentials into the vault** are refused on the app's own Save path, in
`commitAll`, which is how the vault is normally committed. `npm run vault:hook`
installs the same check as a git hook in the vault, for a `git commit` typed in a
terminal. It is a command rather than something the app does by itself: writing
an executable into somebody's repository as a side effect of rendering a page is
not a thing to do quietly, and the hook holds an absolute path to this folder, so
moving the app breaks every commit in the vault until it is reinstalled.

### The `.env` file is written by the app

The setup wizard writes it, because asking someone to hand-edit `.env` before
they have seen the app is where they give up. `src/lib/env-write.ts` is the
compromise: a key that exists is replaced in place, a key that is commented out is
uncommented in place, a key that is absent is appended under a heading, and every
other byte is left exactly as found. Comments and hand-added keys survive.

---

## The vault

```
$VAULT_PATH/                      its own git repository, separate from this one
├── people/
│   ├── entries.json              roster: slug, displayName, hr{}, mine{}, status
│   └── <slug>/
│       ├── about.md              Markdown, no front matter
│       ├── links.json            [{ label, url }]
│       ├── plans.json            [{ id, amount, month, year, promotion }]
│       └── notes/2026-08-12-1on1.md
├── notes/inbox/                  captured, not filed yet
├── notes/general/                not about one person
├── tasks.json
├── time.json
├── config.json                   thresholds, dataVersion
├── .cache/                       git-ignored, disposable — sources, photos, egress.log
├── .snapshots/                   git-ignored, 20 per file, pruned past 30 days
└── .gitignore                    written before anything else can land in it
```

`people/<slug>/` and the `slug` in `entries.json` must match. A mismatch is
reported as a vault problem naming both, never silently repaired — repairing it
behind the user's back is how a person's folder gets orphaned.

Salaries, bonuses, absences, meetings and pull requests are cached, never
committed.

Thresholds (`contactGapDays`, `timeBalanceLimitHours`, `uncommittedChangesDays`)
live in `config.json` inside the vault. Credentials and paths live in `.env` in
the app folder. There is no settings screen either way. `VAULT_PATH` defaults to
`~/meridian/vault`.

---

## The design system

```
src/styles/tokens.css     every value, once. The only file that may hold one
src/components/ui/        the primitives, and the only place a value is applied
src/components/ui/index.ts  the barrel a screen imports from
```

**81 tokens.** Ten type levels, seven spacing steps, five radii, two shadows, two
control heights, four tones × three roles, one icon colour, a six-entry category
palette. The scales are closed: an eleventh of anything is an edit to
`tokens.css` and to a primitive, deliberately.

`Stack` and `Row` also take `gap={0}`, which is on the scale because "no space"
is a decision rather than an absence: a name with its reason under it is one
thought, and the leading of the two lines is already the gap between them.

Recolour the accent or change `--radius-card` and every button, chip, card and
dialog on every screen follows, because there is nowhere else for those decisions
to be hiding.

### The primitives

| | |
| --- | --- |
| `Text` `Code` `CodeBlock` | the ten type levels and ten tones. The only way to set a size |
| `Stack` `Row` `Spacer` `Divider` `Page` `PageHeader` `Columns` | space, in steps |
| `Button` `ButtonLink` | primary · neutral · danger · ghost, two sizes, `icon` for square |
| `Chip` `ChipLink` `Segmented` `Segment` `Toggle` | filters, view switches, live settings |
| `Card` `CardHeader` `CardBody` `CardRow` `CardRowButton` `CardRowLink` `CardLink` `CardGroup` `CardToolbar` `CardFooter` | the one container |
| `NavList` `NavItem` | a column of rounded, selectable rows: the sidebar, Help, the vault tree, changed files |
| `TextLink` | a link in a line of text or a row. `ButtonLink` is the control; this is the words |
| `TextInput` `Textarea` `Select` `DateInput` `Checkbox` `Field` | every field |
| `Table` `THead` `TBody` `TR` `TH` `TD` | data with columns |
| `Dialog` | the one modal. Two usages: `Confirm`, and `TaskDialog` |
| `DayStepper` | walks a card through the days its cache can answer for |
| `Banner` `EmptyState` `Pill` `CategoryPill` `Stat` `Icon` `IconTile` `Avatar` `Rail` `Prose` | the rest |
| `icons.tsx` | the action glyphs — one per verb, see below |
| `TaskRow` `TaskDialog` `SyncBadge` `Reveal` `Skeleton` | the five that only make sense here |

`Page` carries `data-screen`, which is what the pixel gate measures.

### The action glyphs

`src/components/ui/icons.tsx` holds one glyph per verb — `AddIcon`, `CheckIcon`,
`EditIcon`, `RemoveIcon`, `RefreshIcon`, `GoIcon`, `ExternalIcon`, `GuideIcon`,
`CommitIcon`, `PushIcon`, `EyeIcon`, `PinIcon`, `CalendarIcon`, `JoinIcon`.

**A button's glyph is chosen by what the action does, never by which screen it is
on.** Add is the same plus on Tasks, on a person's links and in quick capture, so
the shape is readable before the label is. A second plus drawn slightly
differently would undo the whole point.

Four rules hold it together:

- **One glyph per button, and it is a prop.** `icon={<AddIcon />}`, never a child.
  `ButtonLink external` adds its own arrow, so a caller that also passed one in
  the children got two — the Join button shipped with a video icon *and* an
  arrow. The prop leaves one slot, and rule 7 of the gate makes the old way fail
  the build rather than merely being discouraged. `iconOnly` is the square,
  label-less form.
- **A verb leads, a destination trails.** `icon` renders before the label; the
  external arrow after it. "Open GitHub ↗" reads in that order and "↗ Open
  GitHub" does not.
- **A link out is the accent and carries the glyph; a link in takes the row's
  ink.** `TextLink external` sets all three — colour, glyph, new tab — together,
  so a link that leaves the app cannot look like one that does not. Inside the
  app the whole row is usually the target, and colouring the words as well would
  say it twice.
- **`RemoveIcon` is always the danger tone.** A trash glyph means destruction
  wherever it appears, so the colour is part of the glyph rather than a call-site
  choice.
- **Cancel and Skip carry no glyph.** They are the way out, and one there competes
  with the way forward.

Domain icons are different and stay where they are used: the vault tree's file
shapes in `vault/FileIcons`, the sidebar's sections in `NavIcons`, the Overview
cards' marks in `overview/OverviewIcons`. Those are all `--icon`, because the
title beside them is what names the section.

### The gate

`tests/unit/design-system.test.ts` fails the build on:

1. a colour literal — `oklch`, hex or `rgb` — anywhere but `tokens.css`
2. a `font` that is not a whole `var(--type-*)`, or any loose `font-size`,
   `font-weight`, `font-family`, `line-height` or `letter-spacing`
3. a `padding`, `margin` or `gap` that is not `var(--space-*)`, `--indent` or zero
4. a `border-radius` that is not `var(--radius-*)`
5. a `box-shadow` that is not a shadow token (an `inset` bar from a token colour
   is a line, not an elevation, and is allowed)
6. anything but `Card` and `Dialog` drawing a bordered surface
7. a variant a primitive offers that has no rule in its stylesheet
8. a glyph inside a `Button` or `ButtonLink`'s children rather than its `icon`

Rule 7 exists because of a real bug: `Avatar` gained an `xl` in its type, its
props and the barrel, and a reformat silently dropped the CSS rule. Every photo
on the roster collapsed to nothing and every other test still passed. The same
check immediately found a second one — `Text tone="inherit"` had never had a rule,
so the active sidebar item was not taking its own colour.

`NOT_YET_MIGRATED` in that file is **empty** and is meant to stay that way. A new
entry is a screen that has decided not to use the system; the reason belongs
beside it.

`SELF_CONTAINED` names the two files that will never be migrated, and why:
`app/global-error.tsx`, which must not depend on the stylesheet that may be
exactly what broke, and the `themeColor` in `app/layout.tsx`, which the browser
chrome reads before any stylesheet exists.

Two things the gate cannot check, and they are the ones to watch in review: that
a primitive has not quietly grown a ninth variant, and that a screen reached for
the right one. A `Pill` that toggles something passes every test in the repo.

### What is left of the screens' own CSS

Nine module files, 590 lines, and not one of them sets a colour, a font, a radius
or a spacing value:

| Module | What only it can express |
| --- | --- |
| `Shell.module.css` | the fixed sidebar and the scrolling column |
| `vault/Vault.module.css` | the tree's per-level indentation |
| `notes/Notes.module.css` | the list column beside the editor column |
| `help/Help.module.css` | the section list, and the one bulleted prose list |
| `changelog/Changelog.module.css` | the diff's two aligned columns of lines |
| `people/People.module.css` | the roster's auto-filling grid |
| `people/Person.module.css` | the header's contact column, three field widths |
| `overview/Overview.module.css` | the meetings card's clock column |
| `timebalance/Time.module.css` | the summary dividers, the inline edit form |

CSS across the app went from 3 922 lines to 2 297, and the card shape from
twenty-one declarations to one.

## Storybook

`npm run storybook` on 127.0.0.1:6006 is the design system's own view of itself:
**Rules**, **Catalogue** (every primitive on one page), **Foundations** and
**Components**.

Five things about it are deliberate.

**Stories live under `src/`.** That is what the design-system gate walks, so a
story that writes a colour or a padding out by hand fails the build like any other
file. The story furniture in `src/stories/` is itself built from `Text`, `Card`,
`Banner` and `Table` — the stories demonstrate the system by being made of it.

**Nothing is restated.** The token gallery reads `:root` back out of the live
stylesheet, so a token added to `tokens.css` cannot be missing here — anything
ungrouped shows up under Coverage. The empty-state story imports `@/copy/empty`.
The Catalogue embeds the real stories rather than rebuilding them. Component docs
are the JSDoc already on the components, picked up by `react-docgen`.

**Two stubs, and both are named.** `.storybook/stubs/tasks-actions.ts` stands in
for the three task actions and `app-actions.ts` for `syncSourceAction`, aliased in
`viteFinal`, because a Server Action cannot exist in a browser-only build —
importing the real module drags the vault and `node:fs` into the bundle. A third
is a decision, not a convenience.

**Telemetry is off.** Storybook's usage telemetry and its version check are both
on by default, and "no telemetry, no version check" is a promise this repo makes
on the Help screen. `core.disableTelemetry` and
`core.disableWhatsNewNotifications` in `.storybook/main.ts` are load-bearing.

**`src/stories/Rules.mdx` stays a map.** Each rule, and what gates it — never a
second copy of the prose in this file. If it grows paragraphs, delete them.

---

## The pixel gate

`npm run pixel` renders every screen against a recorded image of itself, at
1440 × 900, and nothing it draws may come from the machine it runs on. Three
things are pinned in `tests/pixel/playwright.config.ts`: the vault (the committed
fixture), the clock (`MERIDIAN_NOW`, a full instant — see `lib/clock.ts`), and
the credentials, because whether a source is configured changes what every card
shows. The values are fake and no request is made with them: `VAULT_PATH` points
inside the repository, so every sync refuses before it fetches.

The tolerance is zero differing pixels. Anything that cannot be made
reproducible is masked and the mask says why — on Changelog that is the commit
hash and its relative time, and nothing else.

It does not prove the app matches anything external — it is the source of truth,
so there is nothing above it to match. It proves the screens have not moved since
somebody last looked at them and agreed.

**When a change to the UI is intended, run `npm run pixel:accept` and commit the
new baselines in the same commit that caused the change.** A baseline updated on
its own, or in a commit that does not explain the visual difference, defeats the
gate entirely.

Baselines live in `tests/pixel/baseline/`, one per screen, suffixed by platform —
font rendering differs enough between systems that one machine's image is not
another's. A platform with no baselines skips with a message rather than failing,
because recording them has to be a deliberate act; a baseline generated
automatically gates nothing. The gate does not run in CI at all, for the same reason: the
baselines belong to the machine somebody actually looks at the screens on.

Thirteen screens are gated, including Changelog in both diff modes and the setup
wizard. Changelog needs a vault that is its own git repository, so
`tests/pixel/global-setup.ts` builds a throwaway one in `artifacts/` with a known
diff, and a second dev server serves it — which is why `next.config.ts` takes its
build directory from `NEXT_DIST_DIR`, since Next allows one dev server per
directory.

---

## The fixture vault

`src/fixtures/vault` is committed test data, built by
`scripts/build-fixture-vault.ts` and by **nothing else**.

`vaultIsInsideApp()` refuses every integration write when `VAULT_PATH` resolves
inside the app folder — each sync, the photo download, `revalidateSources`, and
`writeCache` as a last line of defence. Running the app against the fixture once
synced a real BambooHR into it and put thirteen colleagues into version control,
including into the pixel baselines. That is what the guard exists to prevent, and
`tests/unit/fixture-guard.test.ts` scans for any sync that lacks it.

## Brand

`brand/` holds the sources; `public/` holds what the app serves.

| File | Use |
| --- | --- |
| `brand/meridian-mark.svg` | The mark alone. Vector, inherits `currentColor`. **Use this in the UI.** |
| `brand/meridian-icon.svg` | The app icon: the mark in white on a filled rounded tile. The source for every raster icon. |
| `brand/meridian-logo-512.png` | Full logo with the wordmark, for anything print-sized or external. |
| `brand/favicon.ico` | Multi-size, for browsers that still ask for it. |

The mark is one geometry everywhere — favicon, sidebar and setup screen draw the
same paths, so they are one shape rather than three near-misses. The rounded
square is **broken** where the diagonal crosses it; that break is the mark.

**The icon is a filled tile, the mark is not.** In the interface the mark is
three strokes in `currentColor` on whatever it sits on. As an icon that failed:
at 16px, three hairlines on a transparent ground are gone. So
`brand/meridian-icon.svg` puts the same paths in white on a solid rounded tile —
and places them with an SVG `transform` rather than by rewriting the numbers, so
"one geometry" stays provable rather than asserted.

`public/icon.svg` is that file; `favicon.ico` (16/32/48), `icon-96`, `icon-192`,
`icon-512` and `apple-touch-icon` are rasterised from it. There is no script for
that — it has happened twice — so if it happens again, render the SVG at each size
and pack the three small ones into an ICO with PNG payloads.

**The wordmark needs room.** Below roughly 120 px the word MERIDIAN stops being
legible and reads as a smudge — use the mark alone at those sizes.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on 127.0.0.1:3210 |
| `npm run verify` | type-check, `biome check` and the tests — run this before committing |
| `npm run check:fix` | Apply Biome's safe fixes |
| `npm test` | Unit tests, including the read-only enforcement |
| `npm run pixel` | Every screen against its baseline. Runs alongside `npm run dev`; it owns ports 3311 and 3312 and takes them back if a previous run left something behind. |
| `npm run pixel:accept` | Record the current screens as the new baseline |
| `npm run storybook` | The design system on 127.0.0.1:6006 — tokens, controls, rules |
| `npm run storybook:build` | Static build into `artifacts/storybook` |
| `npm run vault:doctor` | Validate every vault file; exits non-zero on problems |
| `npm run vault:restore` | List and restore a file from `.snapshots/` |
| `npm run vault:scan` | Check the vault for anything that looks like a credential |
| `npm run vault:hook` | Install that check as the vault's git pre-commit hook |
| `npm run vault -- <cmd>` | CLI over the same store: people, tasks, notes, hours, search |
| `npm run bamboo:sync` | Roster + photos from BambooHR |
| `npm run bamboo:comp` | Compensation history |
| `npm run bamboo:inbox` | Approvals and presence (the 5-minute window) |
| `npm run bamboo:whoami -- <name>` | Find an employee id |
| `npm run calendar:sync` · `npm run github:sync` | Refresh those caches by hand |
| `node scripts/shot.mjs <url> <out.png> [selector]` | Ad-hoc screenshot while building |
| `npx tsx scripts/build-fixture-vault.ts` | Rebuild `src/fixtures/vault` |

The sync scripts exist for forcing a refresh or seeing an error message. Normal
use needs none of them: the app fetches what it needs when a page is opened and
keeps it current.

`VAULT_PATH=./src/fixtures/vault npm run dev` runs against the fixture vault. The
fixture is selected by environment, not a query flag, so no fixture code path
exists in the app.

---

## For agents

`mcp/vault-server.ts` exposes the vault over MCP (configured in `.mcp.json`). Every tool routes through the same store layer as the interface, so
an agent gets validation, snapshots and conflict checks rather than hand-editing
JSON. **Prefer those tools, or `npm run vault`, over writing vault files
directly.**

## Layout

```
src/app/         one folder per screen; page.tsx is a server component
src/lib/vault/   paths · schemas · frontmatter · index (read) · write · migrate
src/lib/sources/ calendar, github, cache, egress log
src/lib/sources/bamboohr/  client · cache · roster · inbox · compensation
src/lib/secrets.ts    the credential shapes refused into the vault
src/lib/net-guard.ts  the outbound guard — see the rule above
src/proxy.ts     the Host and cross-origin checks
src/components/ui/    the design system: the only place a token is applied
src/components/  one module per screen, and layout is all any of them holds
src/copy/        empty states and error lines, one wording per situation
src/styles/      tokens.css and the global sheet
src/stories/     Storybook furniture and the Rules page
src/fixtures/    the fixture vault (committed)
mcp/             MCP server over the vault
scripts/         sync, CLI, doctor, fixture builder
tests/unit/      unit tests, including the read-only enforcement
tests/pixel/     the screen gate and its baselines
.storybook/      Storybook config and its one stub
brand/           logo sources; public/ holds the shipped copies
```
