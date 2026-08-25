/**
 * Rebuilds src/fixtures/vault from the seed data below, so the pixel gate always
 * renders the same people, tasks and notes. Run after editing the seed; the
 * output is committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_VERSION } from '../src/lib/vault/migrate.js';
import { VAULT_README } from '../src/lib/vault/readme.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/fixtures/vault');
fs.rmSync(root, { recursive: true, force: true });

const write = (rel: string, body: string) => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
};
const json = (rel: string, value: unknown) => write(rel, `${JSON.stringify(value, null, 2)}\n`);

const PEOPLE = [
  ['ana-horvat', 'Ana Horvat', 'Senior Backend Engineer', '2023-04-03', '123'],
  ['marko-maric', 'Marko Marić', 'Backend Engineer', '2024-09-02', '124'],
  ['petra-kovac', 'Petra Kovač', 'Platform Engineer', '2024-01-08', '125'],
  ['dora-simic', 'Dora Šimić', 'Frontend Engineer', '2022-03-14', '126'],
  ['lea-novak', 'Lea Novak', 'Engineer, Data', '2026-05-04', '127'],
  ['ivan-babic', 'Ivan Babić', 'Staff Engineer', '2021-06-01', '128'],
] as const;

json(
  'people/entries.json',
  PEOPLE.map(([slug, displayName, jobTitle, hireDate, employeeId]) => ({
    slug,
    displayName,
    hr: {
      jobTitle,
      department: 'Engineering',
      hireDate,
      supervisorEmployeeId: '100',
      workEmail: `${slug.split('-')[0]}@yourcompany.com`,
      workPhone: null,
      employeeId,
    },
    mine: { contactCadenceDays: 14, growth: { currentLevel: null, targetLevel: null } },
    status: 'active',
  })),
);

const ABOUT: Record<string, string> = {
  'ana-horvat':
    '**Works best with a long block and no meetings.** Motivated by owning a system end to end.\n\n- Wants feedback direct, no preamble\n- Hybrid, in the office Wednesdays\n\n### Watch\nOn-call load is heavier than it looks on paper.\n',
  'marko-maric':
    '**Asks for the staff track often.** Prefers written feedback he can reread.\n\n- Works from home most days\n- Rewrote the on-call handover doc unprompted\n',
};

for (const [slug] of PEOPLE) {
  if (ABOUT[slug]) write(`people/${slug}/about.md`, ABOUT[slug]!);
}

json('people/ana-horvat/links.json', [
  { label: 'GitHub', url: 'https://github.com/anahorvat' },
  { label: 'Growth plan', url: 'https://docs.google.com/document/d/ana-staff-track' },
  { label: 'On-call rotation', url: 'https://pagerduty.com/schedules/backend' },
]);
json('people/marko-maric/links.json', [{ label: 'GitHub', url: 'https://github.com/markomaric' }]);

json('people/ana-horvat/plans.json', [
  { id: 'sp-ana', amount: 4500, month: 4, year: 2027, promotion: 'Staff Engineer' },
]);
json('people/marko-maric/plans.json', [
  { id: 'sp-marko', amount: 3400, month: 11, year: 2026, promotion: 'Senior Engineer' },
]);
json('people/petra-kovac/plans.json', [
  { id: 'sp-petra', amount: 3600, month: 1, year: 2027, promotion: '' },
]);

const note = (category: string, draft: boolean, pinned: boolean, body: string, project?: string) =>
  `---\ncategory: ${category}\ndraft: ${draft}\npinned: ${pinned}${
    project ? `\nproject: ${project}` : ''
  }\n---\n${body}`;

write(
  'people/ana-horvat/notes/2026-08-12-1on1.md',
  note(
    '1on1',
    false,
    true,
    "# 1:1 — staff track and on-call\n\nShe raised the staff track again, third time this quarter. Wants a concrete list of what's missing rather than a general keep going. Fair.\n\nOn-call is heavier than it looks on paper — two nights woken in the last rotation. She'd swap a week with Ivan if he's willing.\n\nNext: write the three-team project into her growth plan, and ask Ivan about the rotation swap.\n",
    'platform-split',
  ),
);
write(
  'people/ana-horvat/notes/2026-07-30-feedback-marko.md',
  note(
    'feedback',
    false,
    false,
    '# Feedback from Marko\n\nMarko paired with her through the migration. Says she explained decisions as she made them, which is why he could take the second half alone.\n\nOne thing to watch: she moves fast enough that quieter people stop asking questions.\n',
  ),
);
write(
  'people/marko-maric/notes/2026-08-02-1on1.md',
  note(
    '1on1',
    false,
    false,
    '# 1:1 — on-call docs and the staff question\n\nHe rewrote the on-call handover doc without being asked. That is the kind of thing the staff conversation needs as evidence.\n\nHe wants a date for the conversation, not a promise. Give him one this month.\n',
  ),
);
write('README.md', VAULT_README);
write(
  'notes/general/2026-08-18-misao.md',
  note(
    'idea',
    true,
    false,
    '# Marko asked about the staff track again\n\nThird time. Needs a real answer, not another quarter of maybe.\n',
  ),
);
write(
  'notes/general/2026-08-15-plan-zaposljavanja.md',
  note(
    'planning',
    false,
    false,
    '# Hiring plan\n\nTwo backend, one platform. Backend first — the payments team is carrying too much.\n\nOpen question for Iva: do we hire senior or grow Marko into the gap?\n',
    'hiring-two-backend-roles',
  ),
);
write(
  'notes/general/2026-08-14-zahtjevi.md',
  note(
    'generic',
    false,
    false,
    '# Zahtjevi\n\n- TO DO lista\n- Notes per person\n- Google Calendar integration\n- BambooHR integration\n',
  ),
);

const stamp = '2026-08-12T08:44:41.102Z';

const phase = (id: string, label: string, done: boolean, note = '') => ({ id, label, note, done });

json('projects.json', [
  {
    id: 'platform-split',
    title: 'Platform split',
    description:
      'Break the monolith into the scheduler, the payments service and a thin API in front of both. Three teams, one shared deadline.',
    phases: [
      phase(
        'p1',
        'Boundaries agreed with all three teams',
        true,
        'Written down in the architecture note, signed off by Ana, Ivan and Petra.',
      ),
      phase(
        'p2',
        'Scheduler extracted and running in staging',
        true,
        'Two weeks in staging with no incidents before we call it done.',
      ),
      phase(
        'p3',
        'Payments service extracted',
        false,
        'The risky one — needs a migration window and a rollback path.',
      ),
      phase('p4', 'API gateway in front of both', false),
      phase('p5', 'Monolith retired', false),
    ],
    links: [
      { label: 'Architecture note', url: 'https://docs.google.com/document/d/platform-split' },
      { label: 'Tracking board', url: 'https://github.com/yourcompany/platform/projects/2' },
    ],
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: 'on-call-reset',
    title: 'On-call reset',
    description:
      'Rewrite the rotation so nobody carries two heavy weeks in a row, and the handover docs are usable by someone new.',
    phases: [
      phase('p1', 'Current load measured per person', true, 'Six weeks of pager data, per night.'),
      phase('p2', 'New rotation drafted', true),
      phase('p3', 'Handover docs rewritten', true),
      phase(
        'p4',
        'Autumn rotation published',
        false,
        'Publish by the end of September so nobody plans around a guess.',
      ),
    ],
    links: [],
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: 'hiring-two-backend-roles',
    title: 'Hiring — two backend roles',
    description:
      'Two open roles for the second half. Everything from the scorecard to the first day.',
    phases: [
      phase(
        'p1',
        'Scorecard and levels agreed with HR',
        true,
        'Mid and senior, same bar as last round.',
      ),
      phase('p2', 'Roles posted', false),
      phase('p3', 'First loop run and calibrated', false),
      phase('p4', 'Offers out', false),
    ],
    links: [],
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: 'design-review-ritual',
    title: 'Design review ritual',
    description:
      'A lightweight weekly review so architecture decisions stop happening in DMs. No phases — it either runs or it does not.',
    phases: [],
    links: [],
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: 'q2-reorg',
    title: 'Q2 reorg',
    description: 'Done and dusted. Kept for the decisions in its notes.',
    phases: [phase('p1', 'Teams announced', true), phase('p2', 'First month reviewed', true)],
    links: [],
    archived: true,
    createdAt: stamp,
    updatedAt: stamp,
  },
]);

json('tasks.json', [
  {
    id: '2026-08-12-pay-rise-proposal',
    title: 'Send the Q3 pay-rise proposal to HR',
    description: null,
    priority: 'urgent',
    dueDate: '2026-08-12',
    status: 'todo',
    kind: 'task',
    personSlug: null,
    projectId: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-15-ana-evaluation',
    title: "Write Ana's evaluation draft",
    description: null,
    priority: 'urgent',
    dueDate: '2026-08-15',
    status: 'todo',
    kind: 'task',
    personSlug: 'ana-horvat',
    projectId: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-18-q3-kickoff',
    title: 'Prepare the Q3 cycle kickoff',
    description: null,
    priority: 'important',
    dueDate: '2026-08-19',
    status: 'todo',
    kind: 'task',
    personSlug: null,
    projectId: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-20-hiring-plan',
    title: 'Review the hiring plan with Iva',
    description: null,
    priority: 'important',
    dueDate: '2026-08-20',
    status: 'todo',
    kind: 'task',
    personSlug: null,
    projectId: 'hiring-two-backend-roles',
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-25-lea-checkin',
    title: '1:1 with Lea — 30 day check-in',
    description: null,
    priority: 'normal',
    dueDate: '2026-08-25',
    status: 'todo',
    kind: 'task',
    personSlug: 'lea-novak',
    projectId: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-01-oncall-autumn',
    title: 'Draft the on-call rotation for autumn',
    description: null,
    priority: 'normal',
    dueDate: null,
    status: 'todo',
    kind: 'task',
    personSlug: null,
    projectId: 'on-call-reset',
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-17-rotation-swap',
    title: 'Ask Ivan about the rotation swap',
    description: null,
    priority: 'normal',
    dueDate: '2026-08-17',
    status: 'done',
    kind: 'task',
    personSlug: 'ivan-babic',
    projectId: 'on-call-reset',
    completedAt: '2026-08-17T09:00:00.000Z',
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-18-budget-confirmation',
    title: 'Budget confirmation from Ivan, Finance',
    description: null,
    priority: 'important',
    dueDate: '2026-08-18',
    status: 'todo',
    kind: 'waiting',
    personSlug: null,
    projectId: 'platform-split',
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: '2026-08-21-petra-feedback',
    title: 'Feedback on Petra from Nikola',
    description: null,
    priority: 'normal',
    dueDate: '2026-08-21',
    status: 'todo',
    kind: 'waiting',
    personSlug: 'petra-kovac',
    projectId: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  },
]);

json(
  'time.json',
  [
    ['2026-08-12', -1.5, 'Doctor, left early'],
    ['2026-08-10', 0.5, 'Release check'],
    ['2026-08-06', -1, 'Long lunch, personal'],
    ['2026-07-20', 1, 'Workshop prep on the weekend'],
    ['2026-07-06', -2, 'Left early'],
    ['2026-06-24', -0.5, ''],
    ['2026-06-18', -1, 'Sick afternoon'],
    ['2026-06-16', -2, 'Took time back'],
    ['2026-06-15', 2, 'Incident, evening work'],
    ['2026-06-02', 5.5, 'Release night'],
  ].map(([date, hoursDelta, note], i) => ({
    id: `${date}-${String(i + 1).padStart(2, '0')}`,
    date,
    hoursDelta,
    note,
    createdAt: `${date}T12:30:55.099Z`,
    updatedAt: `${date}T12:30:55.099Z`,
  })),
);

json('config.json', {
  thresholds: { contactGapDays: 14, timeBalanceLimitHours: 20, uncommittedChangesDays: 3 },
  // The version this build writes, not a number typed here: a fixture claiming
  // an older format is migrated on every start, which writes into committed
  // test data.
  dataVersion: DATA_VERSION,
});
write('.gitignore', '.cache/\n.snapshots/\n.DS_Store\n');

const COMP: Record<string, Array<[string, string | null, number, string]>> = {
  'ana-horvat': [
    ['2026-04-01', null, 4200, 'Merit increase'],
    ['2025-07-01', '2026-03-31', 3900, 'Market adjustment'],
    ['2023-04-03', '2025-06-30', 3650, 'New hire'],
  ],
  'marko-maric': [
    ['2026-07-01', null, 3100, 'Merit increase'],
    ['2024-09-02', '2026-06-30', 2900, 'New hire'],
  ],
  'petra-kovac': [
    ['2026-04-01', null, 3400, 'Merit increase'],
    ['2024-01-08', '2026-03-31', 3150, 'New hire'],
  ],
  'dora-simic': [
    ['2026-04-01', null, 4050, 'Merit increase'],
    ['2025-04-01', '2026-03-31', 3800, 'Promotion'],
    ['2022-03-14', '2025-03-31', 3500, 'New hire'],
  ],
  'lea-novak': [['2026-05-04', null, 2450, 'New hire']],
  'ivan-babic': [
    ['2026-01-01', null, 5200, 'Merit increase'],
    ['2021-06-01', '2025-12-31', 4300, 'New hire'],
  ],
};

const BONUS: Record<string, Array<[string, number, string]>> = {
  'ana-horvat': [['2026-01-15', 1200, 'Annual performance']],
  'petra-kovac': [['2026-01-15', 600, 'Annual performance']],
  'dora-simic': [['2026-01-15', 900, 'Annual performance']],
};

/**
 * Fixed, not `Date.now()`. A fixture stamped at build time is "Live" for the
 * hour after it is rebuilt and "Stale · 1h old" afterwards, which quietly
 * changes what every screen renders. Twenty minutes before the pinned clock,
 * so every source reads Live.
 */
const FETCHED_AT = '2026-08-19T11:40:00.000Z';

json('.cache/bamboohr.json', {
  fetchedAt: FETCHED_AT,
  etag: null,
  employees: PEOPLE.map(([slug, displayName, jobTitle, hireDate, id]) => ({
    id,
    slug,
    displayName,
    jobTitle,
    department: 'Engineering',
    hireDate,
    workEmail: `${slug.split('-')[0]}@yourcompany.com`,
    workPhone: null,
    supervisorId: '100',
  })),
  compensation: Object.fromEntries(
    Object.entries(COMP).map(([slug, rows]) => [
      slug,
      {
        type: 'Salary',
        paidPer: 'Month',
        paySchedule: 'Monthly',
        currency: 'EUR',
        rows: rows.map(([startDate, endDate, rate, reason]) => ({
          startDate,
          endDate,
          rate,
          reason,
          comment: '',
        })),
        bonus: (BONUS[slug] ?? []).map(([date, amount, reason]) => ({ date, amount, reason })),
      },
    ]),
  ),
  timeOff: [
    { slug: 'ana-horvat', type: 'Annual leave', start: '2026-08-17', end: '2026-08-21' },
    { slug: 'dora-simic', type: 'Sick leave', start: '2026-08-18', end: '2026-08-28' },
  ],
  inbox: [
    {
      kind: 'time off',
      slug: 'ana-horvat',
      title: 'Ana Horvat — annual leave, 1–5 September',
      detail: 'Waiting on your approval',
      since: '2026-08-15',
    },
    {
      kind: 'document',
      slug: null,
      title: 'Updated on-call policy',
      detail: 'Needs your signature',
      since: '2026-08-16',
    },
    {
      kind: 'time off',
      slug: 'marko-maric',
      title: 'Marko Marić — annual leave, 25–29 August',
      detail: 'Waiting on your approval',
      since: '2026-08-17',
    },
    {
      kind: 'onboarding',
      slug: 'lea-novak',
      title: 'Lea Novak — 90 day review checklist',
      detail: '2 of 5 items left',
      since: '2026-08-18',
    },
  ],
});
json('.cache/calendar.json', { fetchedAt: FETCHED_AT, etag: null, days: {} });
json('.cache/github.json', { fetchedAt: FETCHED_AT, etag: null, pullRequests: [] });

console.log('fixture vault rebuilt at', root);
