# What the MCP server reaches, and what it does not

Every capability in this app that an agent could plausibly want, and whether
`mcp/tools.ts` exposes it. This file is the only record of that; the coverage
question is not answered anywhere else.

**Adding or removing a capability means editing this file in the same commit.**
The rule, and what it applies to, is in `CLAUDE.md` under "Rules".

| Status | Meaning |
| --- | --- |
| **Open** | An MCP tool reaches it today. |
| **Closed** | A candidate. The app can do it, the MCP server cannot. |
| **Never** | Deliberately out. The reason is in the row. |

A row is a *capability*, not a function. Several rows can share one store
function, and one tool can open several rows. A **Closed** row is a decision to be
revisited, which is why it is written down rather than left to be rediscovered.

---

## People — read

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| The roster: role, hire date, status | `vault.people` | `list_people` | **Open** |
| Archived people as well as active | `PersonEntry.status` | `list_people` (`includeArchived`) | **Open** |
| One person, whole: about, links, plans, notes, open tasks | `getVault()` maps | `read_person` | **Open** |
| HR fields: department, work email, phone, employee id, supervisor | `PersonEntry.hr` | `read_person` | **Open** |
| Contact cadence and growth levels | `PersonEntry.mine` | `read_person` | **Open** |
| Days since the last note about a person | `vault.notesByPerson` + `daysBetween()` | `list_people` | **Open** |
| Who is past their contact cadence | that, against `mine.contactCadenceDays` | `list_people` (`overdue`) | **Open** |
| Cached photo path for a person | `photoPath()` | `read_person` (`photo`) | **Open** — a local path the client may not be able to open, but whether a photo exists is an answer too. |

## People — write

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Replace a person's About markdown | `saveAbout()` | `write_about` | **Open** |
| Add a labelled link | `addLink()` | `add_link` | **Open** |
| Remove a link | `removeLink()` | `remove_link` | **Open** |
| Record a planned rise or promotion | `addPlan()` | `plan_rise` | **Open** |
| Remove a planned rise | `removePlan()` | `remove_plan` | **Open** |
| Edit a roster entry: cadence, growth levels, status | `updatePerson()` | `update_person` | **Open** — the HR block stays BambooHR's; a sync would put an edit back. |

## Projects — read

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Projects, with progress, next phase, open task and note counts | `vault.projects` + `progressOf()` | `list_projects` | **Open** |
| Archived projects as well as active | `ProjectEntry.archived` | `list_projects` (`includeArchived`) | **Open** |
| One project's phases, each with its label, note and done flag | `ProjectEntry.phases` | `read_project` | **Open** |
| A phase's own task progress, counted from the tasks filed under it | `taskProgressByPhase()` | `read_project` | **Open** |
| One project's links | `ProjectEntry.links` | `read_project` | **Open** |
| A project's tasks | `vault.tasks` by `projectId` | `read_project`, `list_tasks` | **Open** |
| A project's notes | `vault.notesByProject` | `read_project`, `list_notes` | **Open** |
| Description, created and updated timestamps | `ProjectEntry` | `read_project` | **Open** |
| How many active projects have every phase done | `progressOf().complete` | `list_projects` (`phases.complete`) | **Open** — a flag on every row; the count is the client's one line. |

## Projects — write

Shaping was **Never** until 2026-09-01 — "shaping the work is the person's" —
and the owner reversed that: an agent may now create, phase, link and archive a
project. Deleting stays at the screen; its confirmation promises what happens
to the project's tasks and notes, and a promise is read by a person.

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Create a project, optionally with phases | `createProject()` | `create_project` | **Open** |
| Edit a project's title and description | `updateProject()` | `update_project` | **Open** |
| Archive or restore a project | `setProjectArchived()` | `archive_project` | **Open** |
| Delete a project, clearing it off its tasks and notes | `deleteProject()` | — | **Never** — destructive, and its confirmation is words on a screen. |
| Add a phase | `addPhase()` | `add_phase` | **Open** |
| Edit a phase's label and note | `updatePhase()` | `update_phase` | **Open** |
| Mark a phase project-only, keeping its tasks off Tasks and Overview | `updatePhase()` / `hiddenOutsideProject()` | `update_phase` (`projectOnly`) | **Open** |
| Tick a phase off, or untick it | `setPhaseDone()` | `complete_phase` | **Open** |
| Remove a phase | `removePhase()` | `remove_phase` | **Open** |
| Add a link to a project | `addProjectLink()` | `add_project_link` | **Open** |
| Remove a project link | `removeProjectLink()` | `remove_project_link` | **Open** |
| Point a task at a project | `addTask()` / `updateTask()` | `add_task`, `update_task` | **Open** |
| File a task under a phase of its project | `NewTask.phaseId` / `TaskPatch.phaseId` | `add_task`, `update_task` (`phaseId`) | **Open** |
| Point a note at a project | `createNote()` / `setNoteProject()` | `write_note` | **Open** |

## Notes — read

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| One note: front matter and body | `getNote()` | `read_note` | **Open** |
| A person's notes, as a list | `vault.notesByPerson` | `read_person`, `list_notes` | **Open** |
| A project's notes, as a list | `vault.notesByProject` | `read_project`, `list_notes` | **Open** |
| Every note, newest first, by category, draft or pinned | `vault.notes` | `list_notes` | **Open** |
| What is sitting in the inbox, unfiled | `vault.notes` by location | `list_notes` (`location`) | **Open** |

## Notes — write

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Create a note | `createNote()` | `write_note` (no `path`) | **Open** |
| Create it dated other than today | `createNote({ date })` | `write_note` (`date`) | **Open** |
| Replace the body without restating the title | `saveNoteBody()` | `write_note` (with `path`) | **Open** |
| Set category | `setNoteMeta()` | `write_note` | **Open** |
| Set draft | `setNoteMeta()` | `write_note` | **Open** |
| Set pinned | `setNoteMeta()` | `write_note` | **Open** |
| Set or clear the project | `setNoteProject()` / `setNoteMeta()` | `write_note` | **Open** |
| Move a note: change its person or its date | `moveNote()` | `move_note` | **Open** |
| A whole note at once: body, front matter and where it is filed | `writeNoteAction()` | `write_note` then `move_note` | **Open** — two calls rather than one. The page stages the lot because Cancel has to mean something there; an agent has no Cancel, so the composition buys it nothing. |
| Capture a note with no screen open | `captureNoteAction()` | `write_note` covers it | **Open** |
| Delete a note | `deleteNote()` | `delete_note` | **Open** |

## Tasks — read

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Every task, filtered by person, project, priority, kind, due, open or done | `vault.tasks` | `list_tasks` | **Open** |
| A person's open tasks | `vault.tasks` filtered | `read_person`, `list_tasks` | **Open** |
| A project's tasks | `vault.tasks` by `projectId` | `read_project`, `list_tasks` | **Open** |
| What is late, and what is due on a day | `dueLabel()` / `dueTone()` | `list_tasks` (`late`, `dueBefore`), `read_day` | **Open** |
| Which tasks are waiting on somebody rather than on you | `TaskEntry.kind` | `list_tasks` (`kind`) | **Open** |
| Tasks matching a substring, title or description | `vault.tasks` | `search` | **Open** |

## Tasks — write

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Add a task | `addTask()` | `add_task` | **Open** |
| …with a priority, a due date, a person, a project | `NewTask` | `add_task` | **Open** |
| …as a *waiting* item rather than a task | `NewTask.kind` | `add_task` (`kind`) | **Open** |
| Complete a task, or reopen it | `setTaskStatus()` | `complete_task` | **Open** |
| Edit a task: title, priority, due date, person, project, phase, kind | `updateTask()` | `update_task` | **Open** |
| Delete a task | `deleteTask()` | `delete_task` | **Open** |
| Capture a task with no screen open | `captureTaskAction()` | `add_task` covers it | **Open** |
| Give a task a description | `NewTask.description` / `TaskPatch.description` | `add_task`, `update_task` (`description`) | **Open** — the screens do not show it yet; search and the task tools do. |

## Hours

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| The current balance | `sumHours(allTimeEntries())` | `read_hours` | **Open** |
| Every entry, over a date range | `allTimeEntries()` | `read_hours` | **Open** |
| Log overtime or time taken back | `addTimeEntry()` | `log_hours` | **Open** |
| Edit an entry | `updateTimeEntry()` | `update_hours` | **Open** |
| Delete an entry | `deleteTimeEntry()` | `delete_hours` | **Open** |

## Search

Substring, case-insensitive, not fuzzy. Every list is capped by `limit`, and
`truncated` names the ones the cap cut.

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| People by name or slug | `search` handler | `search` | **Open** |
| Projects by title, id or description | `search` handler | `search` | **Open** |
| Task titles and descriptions | `search` handler | `search` | **Open** |
| Note titles and bodies | `search` handler | `search` | **Open** |
| About markdown, with an excerpt around the hit | `vault.about` | `search` | **Open** |
| Phase labels and phase notes | `ProjectEntry.phases` | `search` | **Open** |
| Link labels and URLs, on people and on projects | `vault.links`, `ProjectEntry.links` | `search` | **Open** |
| Notes attached to hours entries | `vault.time` | `search` | **Open** |

## The vault itself

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Files the app cannot read | `vault.problems` | `vault_problems` | **Open** |
| Whether the vault can be written to at all | `vaultHealth()` / `blocksEditing()` | `vault_health` | **Open** |
| Thresholds and data version from `config.json` | `vault.config` | `vault_health` | **Open** |
| Scan the vault for credentials | `scanText()` | folded into `commit` | **Open** |
| The file tree | `buildTree()` | `vault_tree` | **Open** |
| Preview any vault file | `readPreview()` | `read_file` | **Open** — text only, truncated, and `safeVaultPath()` keeps it inside the vault. |
| Restore a file from `.snapshots/` | `npm run vault:restore` | — | **Closed** — the undo for a tool that went wrong, and the only one an agent cannot reach. |
| Data version and pending migrations | `DATA_VERSION`, `migrateVault()` | — | **Never** — a migration is a decision made once, in the app. |
| Show the vault in the desktop file manager | `revealVaultAction()` | — | **Never** — it opens a window on somebody's screen, which is theirs to do. |

## Git

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| What changed since the last commit, with diffs | `changedFiles()` + `fileDiffs()` | `vault_diff` | **Open** |
| Whether the vault is its own git repository | `repoState()` | `vault_diff`, `vault_status` | **Open** |
| Commit the vault locally | `commitAll()` | `commit` | **Open** |
| Recent commits | `recentCommits()` | `vault_status` | **Open** |
| How many commits are unpushed | `unpushedCount()` | `vault_status` | **Open** |
| Where the vault pushes to | `upstream()` | `vault_status` | **Open** |
| Whether this would be the first push | `isFirstPush()` | `vault_status` | **Open** |
| Push | `push()` | — | **Never** — data leaving the machine stays a decision made in the app, behind its confirmation. |

## BambooHR

Every read here is of `.cache/bamboohr.json`. Nothing in this section may write.

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Cached employee count, with cache age and freshness | `readBamboo()` | `read_sources` | **Open** |
| Who is away on a day, and until when | `cache.timeOff` where `wfh` is false | `read_day` | **Open** |
| Who is working from home on a day | `cache.timeOff` where `wfh` is true | `read_day` | **Open** |
| Pending approvals: time off, documents, onboarding | `cache.inbox` | `read_day` | **Open** |
| Compensation history for a person | `cache.compensation` | `read_compensation` | **Open** |
| Bonuses | `cache.compensation[].bonus` | `read_compensation` | **Open** |
| Sync the roster and photos | `syncBamboo()` | — | **Never** — an agent may not make this app go to the network. |
| Sync compensation | `syncBambooCompensation()` | — | **Never** — same. |
| Sync approvals and presence | `syncBambooInbox()` | — | **Never** — same. |
| Find an employee id by name | `npm run bamboo:whoami` | — | **Never** — it is a live BambooHR request, and a setup step besides. |

## Calendar

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Cached event count, with freshness | `readCalendar()` | `read_sources` | **Open** |
| Meetings on a day: running, over, still to come, with the join link | `meetingState()` in `sources/day.ts` | `read_day` | **Open** |
| Sync the calendar | `syncCalendar()` | — | **Never** — an agent may not make this app go to the network. |

## GitHub

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Cached pull request count, with freshness | `readGithub()` | `read_sources` | **Open** |
| Pull requests waiting on review, and how long they have waited | `cache.pullRequests` + `openedLabel()` | `read_day` | **Open** |
| Which person a pull request belongs to | `personSlug` on the cached row | `read_day` | **Open** |
| Sync pull requests | `syncGithub()` | — | **Never** — an agent may not make this app go to the network. |

## Sources, generally

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Freshness and last failure for one source | `freshnessOf()`, `failureOf()` | `read_sources` | **Open** |
| The egress log | `readEgress()` | `read_egress` | **Open** |
| Sync one source now, ignoring its window | `syncSourceAction()` | — | **Never** — an agent may not make this app go to the network. |
| Refresh whatever has expired | `refreshSourcesAction()` | — | **Never** — same. |

## Derived values

Nothing here is stored. Each is recomputed, and each is a question an agent asks.

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Project progress: ticks as total and done, percent weighted by each phase's tasks | `progressOf()` | `list_projects`, `read_project` | **Open** |
| Compensation timeline, actual and planned | `buildTimeline()` | `read_compensation` | **Open** |
| Current rate, last rise, next planned rise | `rateAt()`, `lastRiseLabel()`, `nextRiseLabel()` | `read_compensation` | **Open** |
| Due labels for a task | `dueLabel()` | `list_tasks`, `read_day` | **Open** |
| Age of a cache, in words | `shortAge()`, `ageLabel()` | `read_sources`, `read_day` | **Open** |
| The whole Overview: meetings, approvals, tasks, reviews, presence, hours, unsaved changes | `app/page.tsx` | `read_day` | **Open** |

## Configuration and setup

| Capability | Where it lives | Tool | Status |
| --- | --- | --- | --- |
| Which sources are configured | `loadConfig()` | `read_sources` | **Open** |
| Problems with `.env` | `Config.problems` | `read_sources` | **Open** |
| Read a credential | `rawEnv()` | — | **Never** — credentials never leave the server process, and an MCP client is a different process. |
| Write `.env` | `lib/env-write.ts` | — | **Never** — the setup wizard and the Settings screen write it, after a check the agent cannot perform. |
| Which theme the app is painted in | `Config.theme` | — | **Closed** — one line to expose, and no reason yet: nothing an agent reports back changes with the colour scheme. |
| Set the theme | `setThemeAction()` | — | **Never** — it is a preference about somebody's own screen, and they are looking at it. |
| Test a credential against a source | `setup/actions.ts` | — | **Never** — a credential check is a live request made while somebody is watching it. |
| Which calendars a Google account can read | `listCalendars()` | — | **Never** — it exists to check credentials being typed in, and an agent has no business holding those. |
| Point the app at a different vault | `checkVaultAction()` | — | **Never** — same reason. |
| Install the vault's credential hook | `npm run vault:hook` | — | **Never** — writing an executable into somebody's repository is not a side effect. |
| Any write to BambooHR, Google or GitHub | — | — | **Never** — the rule at the top of `CLAUDE.md`. |
| Empty the vault, or reset the app completely | `lib/vault/reset.ts` | — | **Never** — the one deletion no snapshot can undo. It exists behind a confirmation that names what goes; a tool call is not that. |
| Reload the app from disk: drop the config and index caches | `reloadAppAction()` | — | **Closed** — an agent's file edits already reach the index through the watcher, and the other half of Reload is the page reloading itself — or, in the desktop app, quitting and reopening — which only a screen has. |

---

## The rule the sync rows come from

**An agent may not make this app go to the network.** Decided, not pending.

Every sync is a GET, so this is not the read-only rule at the top of `CLAUDE.md`
— that one is about writes and this one is about requests at all. What it settles
is who spends the quota and when. An agent can read every cache and is told
exactly how old each one is; if the numbers are stale it says so. Refreshing is a
person pressing a sync badge, or the shell's own minute timer.

The cost is real and accepted: an agent that can see a four-hour-old cache and
cannot do anything about it will report stale numbers. Saying how old they are is
the whole mitigation.

Enforced rather than remembered. `tests/unit/readonly.test.ts` fails the build if
anything under `mcp/` names a sync, the layers under one, or `fetch` itself —
because adding `syncCalendar` to a tool is one import that type-checks, leaves
every other test green, and quietly hands an agent BambooHR.

## Where it stands

Counted by row: **94 Open**, **8 Closed**, **30 Never** — 132 capabilities, against thirty-three tools.

Reading is effectively finished: the Overview, the caches behind it, pay, the
whole task and note surface, the vault's own health and its git state are all
reachable, and every cached answer says how old it is. Writing covers the vault's
own records, and every one of those writes can now be corrected or taken back.

Eight rows are Closed, each with its reason: the vault's file browser and its
snapshot restore, a person's cached photo, how many projects are finished,
setting a task description — which the app cannot do either — editing a roster
entry, same, and which theme the app is painted in. Everything else that is shut is shut
on purpose: projects are read-only by decision, and nothing here goes to the
network.
