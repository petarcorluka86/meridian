import { loadConfig, tildeHome } from '@/lib/env';
import { upstream } from '@/lib/git';
import { readEgress } from '@/lib/sources/egress';
import { Card, CardBody, CardHeader, Code, NavItem, NavList, Pill, Text } from '@/components/ui';
import styles from '@/components/help/Help.module.css';

const SECTIONS = [
  {
    id: 'start',
    group: 'Using Meridian',
    label: 'Start here',
    title: 'What Meridian is',
    sub: 'in three minutes',
  },
  {
    id: 'guide',
    group: 'Using Meridian',
    label: 'What you can do',
    title: 'What you can do',
    sub: 'a walk through every page',
  },
  {
    id: 'vault',
    group: 'Your data',
    label: 'The vault',
    title: 'The vault',
    sub: 'the folder on disk, file by file',
  },
  {
    id: 'git',
    group: 'Your data',
    label: 'Saving and sharing',
    title: 'Saving and sharing',
    sub: 'commit, push, and what leaves the machine',
  },
  {
    id: 'sync',
    group: 'Your data',
    label: 'Integrations',
    title: 'Integrations',
    sub: 'read only, in every direction',
  },
  {
    id: 'setup',
    group: 'Running it',
    label: 'Install and configure',
    title: 'Install and configure',
    sub: '.env and the first run',
  },
  {
    id: 'limits',
    group: 'Running it',
    label: 'Limits',
    title: 'Limits and good to know',
    sub: 'what this deliberately does not do',
  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const current = (SECTIONS.some((x) => x.id === s) ? s : 'start') as SectionId;
  const section = SECTIONS.find((x) => x.id === current)!;

  const config = loadConfig();
  // The documentation describes this machine — a Help page naming a folder that
  // does not exist is worse than none.
  const vaultPath = config.vaultPath ? tildeHome(config.vaultPath) : '(not set)';

  const groups = [...new Set(SECTIONS.map((x) => x.group))];

  return (
    <div className={styles.split} data-screen>
      <div className={`scroll ${styles.nav}`}>
        <div className={styles.navHead}>
          <Text as="h1" level="heading">
            Help
          </Text>
          <Text level="small" tone="muted">
            How Meridian works and what you can do with it
          </Text>
        </div>
        {groups.map((group) => (
          <div key={group}>
            <div className={styles.navGroup}>
              <Text as="div" level="micro" tone="faint">
                {group.toUpperCase()}
              </Text>
            </div>
            <NavList label={group}>
              {SECTIONS.filter((x) => x.group === group).map((item) => (
                <NavItem
                  key={item.id}
                  href={item.id === 'start' ? '/help' : `/help?s=${item.id}`}
                  label={item.label}
                  selected={item.id === current}
                />
              ))}
            </NavList>
          </div>
        ))}
      </div>

      <div className={`scroll ${styles.body}`}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Text as="h2" level="title">
              {section.title}
            </Text>
            <Text level="small" tone="muted">
              {section.sub}
            </Text>
          </div>

          {current === 'start' ? <StartHere vaultPath={vaultPath} /> : null}
          {current === 'guide' ? <Guide /> : null}
          {current === 'vault' ? <VaultSection vaultPath={vaultPath} /> : null}
          {current === 'git' ? <GitSection /> : null}
          {current === 'sync' ? <SyncSection /> : null}
          {current === 'setup' ? <SetupSection vaultPath={vaultPath} /> : null}
          {current === 'limits' ? <LimitsSection /> : null}
        </div>
      </div>
    </div>
  );
}

function StartHere({ vaultPath }: { vaultPath: string }) {
  return (
    <>
      <Card>
        <CardHeader title={<>What Meridian is</>} />
        <CardBody>
          <Text as="p" level="body">
            Meridian is a small hub for running your team, on your own Mac. It answers one question
            in the morning: <strong>what do I have to deal with today.</strong>
          </Text>
          <Text as="p" level="body">
            The rest of it holds the slow work: notes per person, planned pay rises, links you keep
            per person, and your own overtime balance. Everything lives in one folder of plain
            files, and nothing leaves your Mac unless you push it.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<>Three things worth knowing first</>} />
        <CardBody>
          <ul className={styles.list}>
            <li>
              <strong>Your data is a folder.</strong> JSON files and Markdown notes you can open in
              any editor, at <Code>{vaultPath}</Code>. Nothing is locked in an app database.
            </li>
            <li>
              <strong>Integrations only read.</strong> BambooHR, Google Calendar and GitHub are
              pulled in; nothing is ever written back to them. The app refuses to make any request
              other than a read, and keeps a log of every one it makes.
            </li>
            <li>
              <strong>Nothing leaves the machine until you say so.</strong> The vault is a Git
              repository — you review a diff, commit locally, and push only after an explicit
              confirmation.
            </li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}

function Guide() {
  const pages: Array<[string, string, string[]]> = [
    [
      'Overview',
      'the morning screen',
      [
        'Quick capture — one field for a task or a thought.',
        'BambooHR inbox — time-off requests waiting on you.',
        'Tasks — what of yours is due or late.',
        'Pull requests waiting on you — reviews you are blocking.',
        'Meetings — your calendar for the day. What is running now is marked; what is over is struck through.',
        'Working from home and Out — who is where.',
        'Meetings, Working from home and Out each step through the days the calendar cache reaches — back a couple, forward three weeks.',
        'Your hours — your overtime balance.',
        'Unsaved changes — edits not yet committed to the vault.',
      ],
    ],
    [
      'People',
      'two views',
      [
        'Simple shows a card per person with their role.',
        'Detailed turns the same list into a compensation table — monthly rate, last rise, next planned rise — sortable, movable to any month, and blurred until you reveal it.',
      ],
    ],
    [
      'A person',
      'everything about one person',
      [
        'About — your own Markdown: how they work, what they want, what to watch.',
        'Tasks — every task linked to this person.',
        'Notes — every note about them.',
        'Links — a label and a URL: GitHub profile, growth plan doc, on-call rotation.',
        'Planned promotions and pay rises — yours, never written to BambooHR.',
        'Compensation — the rate and the rise history. Blurred until revealed.',
      ],
    ],
    [
      'Tasks',
      'grouped by when they are due',
      [
        'Late, Today, Upcoming and No date, with a count per group.',
        'Priority is a thin colour rail rather than a badge; the due date is a pill that turns red when late and blue for today. A task with no date carries no pill.',
        'Add with priority, due date and person in one row — Enter is enough.',
        'Tick the box to mark one done, here or on the Overview or a person’s page.',
        'The pencil opens the task: title, priority, due date, who it is for, and whether you are waiting on somebody. Deleting is in the same dialog, behind a second press — a snapshot is kept, so npm run vault:restore can still bring it back.',
      ],
    ],
    [
      'Notes',
      '',
      [
        'Filter by person, by project, by category, or show only drafts.',
        'Pin a note to hold it at the top of the list.',
        'Changing the date renames the file; changing the person moves it into that person’s folder.',
        'Anything captured without a person lands in the inbox until you give it one.',
      ],
    ],
    [
      'Projects',
      'work that runs longer than a task',
      [
        'A project is a title, a description, and phases — the checkpoints it has to pass. Phases are not tasks: you tick them off yourself, and they are how you know where the project stands.',
        'A project with phases shows how far it has got, as a bar and as a fraction. One without them shows neither, because there is nothing to be a fraction of.',
        'Tasks and notes belong to a project the same way they belong to a person, and can belong to both. Pick the project anywhere you can pick a person — quick capture, the task form, the task dialog, a note’s own row.',
        'Each project has its own page with its phases, its tasks, its notes and its links.',
        'Archive a project and it moves to the Archived list. Nothing is deleted, its tasks stay where they are, and it comes back whenever you want it.',
        'Deleting one is different, and the confirmation says exactly what happens: the project and its phases go, its tasks and notes stay where they are and lose the project.',
      ],
    ],
    [
      'Timebalance',
      '',
      [
        'Time you owe or are owed, outside BambooHR.',
        'Every entry is a date, plus or minus hours, and a reason. The total is always the truth of where you stand.',
        'Total, this week and this month sit at the top; the range filters narrow the log below, and a custom range takes two dates.',
        'The pencil on a row edits the date, the hours and the reason; deleting is in the same row, behind a confirmation.',
      ],
    ],
    [
      'Settings',
      'how Meridian looks',
      [
        'Theme: Light, Dark or System. Meridian opens in Light until you say otherwise; System follows the appearance your Mac is set to and changes with it, including when the Mac switches itself at sunset.',
        'The choice is kept in Meridian’s own .env, not in the vault — it is about this screen, not about your team, so it does not travel when you push.',
        'Everything else configurable lives in a file rather than on a screen: thresholds in the vault’s config.json, keys in .env.',
      ],
    ],
    [
      'Vault and Changelog',
      '',
      [
        'Vault browses the folder as it is on disk and shows any file’s contents. Pressing the path at the top shows the vault in the Finder.',
        'Changelog shows what changed since the last commit, side by side or unified, then commits locally. Push asks for confirmation, because the vault holds private notes and pay amounts.',
      ],
    ],
  ];

  return (
    <>
      {pages.map(([title, sub, items]) => (
        <Card key={title}>
          <CardHeader
            title={title}
            end={
              sub ? (
                <Text level="small" tone="muted">
                  {sub}
                </Text>
              ) : undefined
            }
          />
          <CardBody>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ))}
    </>
  );
}

function VaultSection({ vaultPath }: { vaultPath: string }) {
  const tree = `${vaultPath}/
├── people/
│   ├── entries.json                one record per person, the roster
│   ├── ana-horvat/                 everything about one person
│   │   ├── about.md                your Markdown — how she works
│   │   ├── links.json              label + url pairs
│   │   ├── plans.json              planned rises and promotions
│   │   └── notes/
│   │       ├── 2026-08-12-1on1.md
│   │       └── 2026-07-30-feedback-marko.md
│   └── marko-maric/ …
├── notes/
│   ├── inbox/                      captured, not filed yet
│   └── general/                    not about one person
├── projects.json                   longer-running work, with its phases and links
├── tasks.json                      your tasks
├── time.json                       hours owed and owing
├── config.json                     your thresholds and defaults
├── .cache/                         live data, revalidated each load
│   ├── bamboohr.json               people, absences, approvals, compensation
│   ├── calendar.json               your meetings
│   ├── github.json                 pull requests waiting on your review
│   ├── photos/                     employee photos, served locally
│   └── egress.log                  every outbound request the app made
├── .snapshots/                     pre-write backups, git-ignored
└── .gitignore`;

  return (
    <>
      <Card>
        <CardHeader
          title={<>The vault</>}
          end={
            <Text level="small" tone="muted">
              {vaultPath}
            </Text>
          }
        />
        <CardBody>
          <Text as="p" level="body">
            Four rules shape it: <strong>one folder per person</strong> holds everything about them,
            prose is Markdown and records are JSON, anything pulled from another system stays in a
            cache that is never committed, and nothing derived is ever written down — balances and
            counts are recomputed, so they cannot drift.
          </Text>
        </CardBody>
        <pre className={styles.tree}>{tree}</pre>
        <div className={styles.note}>
          <Text level="small" tone="muted">
            The whole vault is a Git repository. <Code>people/&lt;slug&gt;/</Code> is the unit of
            everything: when someone leaves, you move one folder and nothing is orphaned.
            Credentials live in <Code>.env</Code> in the app folder, never in the vault.
          </Text>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={<>A note</>}
          end={
            <Text level="small" tone="muted">
              Markdown + front matter
            </Text>
          }
        />
        <pre className={styles.code}>{`---
category: 1on1        # 1on1 | feedback | incident | planning | idea | generic
draft: false          # true while it still needs filing
pinned: true          # held at the top of the list
project: platform-split   # optional — an id from projects.json
---
# 1:1 — staff track and on-call

She raised the staff track again, third time this quarter.`}</pre>
        <div className={styles.note}>
          <Text level="small" tone="muted">
            The file name carries the date and a slug. Rename the file and the date changes with it.
            Move it into another person’s <Code>notes/</Code> folder and the app follows; move it to{' '}
            <Code>notes/general/</Code> and it stops being about a person.{' '}
            <strong>Who a note is about comes from the folder</strong>, never from the front matter.
            A project is the one thing a folder cannot say — a note about Ana can belong to a
            project without leaving her folder — so it is the only key here that names something
            outside the note. A note with no front matter still opens: generic, not a draft, no
            project.
          </Text>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={<>A project</>}
          end={
            <Text level="small" tone="muted">
              one record in projects.json
            </Text>
          }
        />
        <pre className={styles.code}>{`{
  "id": "platform-split",
  "title": "Platform split",
  "description": "Break the monolith into three services.",
  "phases": [
    { "id": "p1", "label": "Boundaries agreed", "note": "", "done": true },
    { "id": "p2", "label": "Scheduler extracted", "note": "", "done": false }
  ],
  "links": [{ "label": "Design doc", "url": "https://…" }],
  "archived": false
}`}</pre>
        <div className={styles.note}>
          <Text level="small" tone="muted">
            The <Code>id</Code> is what a task’s <Code>projectId</Code> and a note’s{' '}
            <Code>project</Code> point at, and it is what the URL uses. There is no folder per
            project: its notes stay wherever the notes themselves belong, and its links live in this
            record. <strong>Archiving is a flag</strong> — nothing is removed, and the project comes
            back exactly as it went in. How far the phases have got is never written down; it is
            counted every time, like every other number in this vault.
          </Text>
        </div>
      </Card>

      <Card>
        <CardHeader title={<>What is deliberately not stored</>} />
        <CardBody>
          <ul className={styles.list}>
            <li>
              <strong>Salaries and absences.</strong> They are BambooHR’s record. They are mirrored
              into <Code>.cache/</Code> so the app works offline, and that folder is git-ignored —
              so no pay figure ever enters your history or a remote. What is yours, and is stored,
              are your <Code>plans.json</Code> intentions.
            </li>
            <li>
              <strong>Credentials.</strong> API keys sit in <Code>.env</Code> in the app folder,
              outside the vault, so the vault stays safe to sync.
            </li>
            <li>
              <strong>Derived numbers.</strong> Balances, counts and days-since are recomputed from
              the entries every launch, never written down and never able to drift.
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<>Editing it by hand</>} />
        <CardBody>
          <ul className={styles.list}>
            <li>
              Safe while the app is running — it watches the folder and reloads. If a file changed
              underneath an edit you were making, the app refuses to overwrite it rather than
              silently winning.
            </li>
            <li>
              A malformed file is reported on the page that uses it, and costs only itself: one bad
              entry in a list is skipped and named, the rest still load.
            </li>
            <li>
              <strong>Slugs are the identity.</strong> The folder name and the <Code>slug</Code> in{' '}
              <Code>people/entries.json</Code> must match — a mismatch is reported rather than
              repaired, because repairing it silently orphans their notes.
            </li>
            <li>
              The version before each write is kept in <Code>.snapshots/</Code> — twenty per file,
              pruned after thirty days. To put one back, run <Code>npm run vault:restore</Code> in
              the app folder: with no arguments it lists what has snapshots, then the file, then the
              number. Restoring snapshots what was there first, so putting back the wrong version is
              undoable too.
            </li>
            <li>
              <strong>If a page says it cannot read something</strong>, run{' '}
              <Code>npm run vault:doctor</Code> in the app folder. It checks every file the same way
              the app does, so what it reports is exactly what the screens are reporting, with the
              file and the reason.
            </li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}

function GitSection() {
  return (
    <Card>
      <CardHeader title={<>Changelog</>} />
      <CardBody>
        <ul className={styles.list}>
          <li>
            Every change you make is{' '}
            <strong>written to disk immediately, but not committed.</strong>
          </li>
          <li>
            The Changelog lists the changed files with a diff, side by side or unified, and a
            plus/minus count per file.
          </li>
          <li>
            A commit message is optional; without one the app writes a dated one —{' '}
            <Code>data: update YYYY-MM-DD</Code> — and the diff above it is the record of what
            changed.
          </li>
          <li>
            <strong>Push only appears once there is a commit</strong>, and asks for confirmation
            that names what the vault holds: private notes, evaluations and pay amounts. The first
            push to a new remote asks more loudly.
          </li>
          <li>
            If you never set a remote, nothing can leave the machine at all. Local commits still
            give you the full history and an undo.
          </li>
        </ul>
      </CardBody>
      <div className={styles.note}>
        <Text level="small" tone="muted">
          Committing stages everything under the vault folder, so anything sitting there is
          included. The diff on screen is the whole of what will be committed.
        </Text>
      </div>
    </Card>
  );
}

function SyncSection() {
  const recent = readEgress(8);
  return (
    <>
      <Card>
        <CardHeader title={<>Three sources are read, none written</>} />
        <CardBody>
          <ul className={styles.list}>
            <li>
              <strong>BambooHR</strong> — people, roles, hire dates, absences, approvals waiting on
              you, and the compensation history.
            </li>
            <li>
              <strong>Google Calendar</strong> — your meetings for the day strip on the Overview.
            </li>
            <li>
              <strong>GitHub</strong> — pull requests waiting on your review, for the repositories
              you list.
            </li>
          </ul>
          <Text as="p" level="body">
            <strong>The app cannot write to any of them.</strong> Every outbound request is refused
            unless it is a read, and unless its destination is one of the hosts above — enforced by
            the app itself, not only by the code that calls it. The single exception in the whole
            system is the OAuth token exchange the calendar needs, which is authentication rather
            than a write: it is permitted by its exact address and nothing else, a redirect cannot
            carry it anywhere, and it appears in the log below as the POST it is.
          </Text>
        </CardBody>
        <div className={styles.note}>
          <Text level="small" tone="muted">
            <strong>What the BambooHR inbox covers.</strong> The API exposes time-off requests and
            nothing else of the inbox — documents awaiting signature and onboarding tasks are not
            available through it. Check BambooHR itself for those.
          </Text>
        </div>
      </Card>

      <Card>
        <CardHeader title={<>How fresh stays fast</>} />
        <CardBody>
          <ul className={styles.list}>
            <li>
              <strong>Cache first, then revalidate.</strong> A page paints instantly from{' '}
              <Code>.cache/</Code> and the fetch runs beside it; when it lands, the numbers update
              in place. You never wait on a network round trip to read your own hub.
            </li>
            <li>
              <strong>Short windows where it matters.</strong> Approvals and absences refresh every
              five minutes; the roster and compensation tables change rarely and refresh hourly.
              Both are yours to set in <Code>.env</Code>.
            </li>
            <li>
              <strong>When a source is down</strong>, the page keeps the last good cache and marks
              the affected cards stale with the age of the data — never a blank card, never a
              silently old number pretending to be current.
            </li>
            <li>
              Your own work is unaffected: notes, tasks, plans and hours live on disk and do not
              need the network at all.
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={<>Every outbound request</>}
          end={
            <Text level="small" tone="muted">
              .cache/egress.log
            </Text>
          }
        />
        {recent.length ? (
          <pre className={styles.code}>{recent.join('\n')}</pre>
        ) : (
          <div className={styles.note}>Nothing has been fetched yet.</div>
        )}
        <div className={styles.note}>
          <Text level="small" tone="muted">
            The privacy claim is only worth something if you can check it. These are the most recent
            requests, newest first; the file itself holds every one ever made.
          </Text>
        </div>
      </Card>
    </>
  );
}

async function SetupSection({ vaultPath }: { vaultPath: string }) {
  const config = loadConfig();
  // Read from git, not from a setting. There used to be a VAULT_GIT_REMOTE row
  // here reporting an environment variable that nothing acted on, so a vault with
  // no off-machine copy at all could show it as configured.
  const tracking = await upstream();
  const rows: Array<[string, boolean, string]> = [
    ['VAULT_PATH', Boolean(config.vaultPath), vaultPath],
    ['BAMBOOHR_*', Boolean(config.bamboo), 'people, absences, approvals, compensation'],
    [
      config.calendar?.kind === 'ical' ? 'CALENDAR_ICAL_ADDRESS' : 'GOOGLE_* (calendar)',
      Boolean(config.calendar),
      'the meetings strip on Overview',
    ],
    ['GITHUB_*', Boolean(config.github), 'pull requests waiting on your review'],
    [
      'vault remote',
      tracking !== null,
      tracking
        ? `${tracking.remote}/${tracking.branch} — ${tracking.url}`
        : 'no off-machine copy; a push has nowhere to go',
    ],
  ];

  return (
    <>
      <Card>
        <CardHeader
          title={<>What is configured right now</>}
          end={
            <Text level="small" tone="muted">
              {config.envPath}
            </Text>
          }
        />
        {rows.map(([key, on, what]) => (
          <div key={key} className={styles.statusRow}>
            <span className={styles.statusKey}>{key}</span>
            <Pill tone={on ? 'success' : 'warning'}>{on ? 'set' : 'not set'}</Pill>
            <span>{what}</span>
          </div>
        ))}
        {config.envModeWarning ? (
          <div className={styles.note}>
            <Text level="small" tone="danger">
              {config.envModeWarning}
            </Text>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title={<>Setting it up</>} />
        <CardBody>
          <ul className={styles.list}>
            <li>
              <strong>Start it and let the wizard do the work.</strong> <Code>npm install</Code>{' '}
              then <Code>npm run dev</Code>, open the app, and it walks you through the folder, then
              BambooHR, calendar and GitHub. Each one is checked before it is saved, and only the
              folder is required.
            </li>
            <li>
              The wizard writes <Code>.env</Code> for you, editing only the lines it must — your
              comments and anything you added by hand survive. It never shows a saved credential
              back to you, and never sends one anywhere but this machine.
            </li>
            <li>
              You can skip any step and add it later from here. A source that is not configured
              simply leaves its section empty; everything local keeps working.
            </li>
            <li>
              <strong>To change something afterwards</strong>, edit <Code>.env</Code> and restart.
              There is no settings screen — the file is the setting.
            </li>
            <li>
              <strong>To open it like an app instead of a browser tab</strong>, run{' '}
              <Code>./desktop/build-app.sh</Code> once. It puts <Code>Meridian.app</Code> in{' '}
              <Code>~/Applications</Code> — drag it to the Dock, and opening it starts the server if
              it is not already running. The app is this folder, so a <Code>git pull</Code> is a new
              version and there is nothing to reinstall.
            </li>
            <li>
              Run <Code>git init</Code> in the vault if you want history, and set a remote only if
              you want off-machine backup.
            </li>
          </ul>
        </CardBody>
        <pre className={styles.code}>{`# vault
VAULT_PATH=${vaultPath}

# BambooHR (read only)
BAMBOOHR_SUBDOMAIN=yourcompany
BAMBOOHR_API_KEY=xxxxxxxxxxxxxxxx
BAMBOOHR_MANAGER_EMPLOYEE_ID=123
BAMBOOHR_MAX_AGE=3600            # roster and pay tables
BAMBOOHR_INBOX_MAX_AGE=300       # approvals and absences
# Only if pay is not in BambooHR's standard compensation table:
# BAMBOOHR_COMP_TABLE=customAdditionalOverallCompensation
# BAMBOOHR_COMP_DATE_FIELD=customDate1
# BAMBOOHR_COMP_AMOUNT_FIELD=customTotal1

# Calendar (read only) — either an iCal secret address:
# CALENDAR_ICAL_ADDRESS=https://calendar.google.com/calendar/ical/.../private-.../basic.ics
# or Google OAuth. Reading a Google calendar needs one POST — the token refresh,
# which is authentication, not a write. It is permitted by its exact address, and
# it is the only one Meridian ever makes.
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxx
GOOGLE_CALENDAR_ID=you@yourcompany.com
GOOGLE_REFRESH_TOKEN=xxxxxxxxxxxxxxxx
CALENDAR_MAX_AGE=300

# GitHub (read only)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
GITHUB_LOGIN=your-handle
GITHUB_REPOS=platform/core,web/dashboard
GITHUB_MAX_AGE=300
`}</pre>
        <div className={styles.note}>
          <Text level="small" tone="muted">
            <strong>Keep it out of Git.</strong> <Code>.env</Code> holds keys and belongs in{' '}
            <Code>.gitignore</Code> — the vault repository must never contain it. It should be mode{' '}
            <Code>600</Code>; the app warns at startup if it is not. Missing keys are not an error:
            those sections stay empty and everything local keeps working.
          </Text>
        </div>
      </Card>
    </>
  );
}

function LimitsSection() {
  return (
    <Card>
      <CardHeader title={<>Limits and good to know</>} />
      <CardBody>
        <ul className={styles.list}>
          <li>
            The app is for <strong>one manager on one machine.</strong> There is no multi-user mode
            and no server. It is reachable only from this Mac, and refuses requests that claim to
            come from anywhere else.
          </li>
          <li>
            <strong>BambooHR gives what its API gives.</strong> Anything it does not expose is not
            in the app either, and it is never written back. Where a company keeps a field varies
            too: if the compensation column is blank for everybody, your pay probably lives in a
            custom table rather than BambooHR’s standard one. The People screen says so when that
            happens, and <strong>Install and configure</strong> has the key to set.
          </li>
          <li>
            <strong>
              Blurred amounts protect against a shoulder, not against someone with your laptop.
            </strong>{' '}
            The vault itself is not encrypted; it relies on your disk encryption and a locked
            machine.
          </li>
          <li>
            <strong>Nothing is deleted quietly.</strong> Removing a person leaves their notes; the{' '}
            <Code>.snapshots/</Code> folder keeps the version before each write.
          </li>
          <li>
            No keyboard shortcuts, no settings screen, no snooze on tasks, no alarms, no analytics.
            Each was left out on purpose.
          </li>
        </ul>
      </CardBody>
    </Card>
  );
}
