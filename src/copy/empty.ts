/**
 * The empty-state catalogue.
 *
 * Every empty state in the app takes its words from here, so the same situation
 * is described the same way on every screen. These are not placeholders: change
 * the wording here, never at the call site.
 *
 * An entry is three things, and all three belong together:
 *
 *   title  what is missing, named in one line
 *   body   why filling it is worth doing — or, when empty is good news, saying so
 *   tone   which of the four meanings this emptiness has
 *
 * The tone is here rather than at the call site for the same reason the words
 * are: two screens colouring the same emptiness differently is how somebody
 * learns to distrust both. The glyph is not, because it is the card's own icon —
 * the card knows it and the catalogue does not.
 *
 * The four tones, and what they mean when nothing is there:
 *
 *   success  empty is good news. Nothing is owed, the queue is clear
 *   info     content you have not written yet. An invitation
 *   warning  a source is not connected, or a key is unset. Nothing is broken
 *   neutral  a filter matched nothing, or a fact about the vault
 *
 * `danger` is deliberately absent: nothing that has lost data is an empty state.
 * A file the app cannot read is the opposite claim and gets a `Banner` naming it,
 * from `src/copy/problems.ts`.
 */

export type EmptyTone = 'neutral' | 'info' | 'success' | 'warning';

export type Empty = { title: string; body: string; tone: EmptyTone };

/**
 * A source that has no credentials, said once. Every card that needs the source
 * says the same thing, because it is the same missing key.
 */
const SOURCES = {
  bamboo: {
    title: 'BambooHR is not connected',
    body: 'Add BAMBOOHR_SUBDOMAIN and BAMBOOHR_API_KEY to .env and restart. Approvals, absences and compensation stay empty until then.',
    tone: 'warning',
  },
  calendar: {
    title: 'Calendar is not connected',
    body: 'Connect Google Calendar in Settings to see the day here.',
    tone: 'warning',
  },
  github: {
    title: 'GitHub is not connected',
    body: 'Add GITHUB_TOKEN, GITHUB_LOGIN and GITHUB_REPOS to .env and restart to see reviews waiting on you.',
    tone: 'warning',
  },
} as const satisfies Record<string, Empty>;

export const EMPTY = {
  sources: SOURCES,

  overview: {
    tasks: {
      title: 'Nothing left',
      body: 'Everything due is done. The rest of the list is on the Tasks page when you want it.',
      tone: 'success',
    },
    tasksFiltered: {
      title: 'Nothing at this priority',
      body: 'Change the filter above to see the rest.',
      tone: 'neutral',
    },
    meetings: {
      title: 'A clear day',
      body: 'No meetings in the calendar — a good day for the work that needs a long block.',
      tone: 'info',
    },
    meetingsOtherDay: {
      title: 'A clear day',
      body: 'Nothing in the calendar for this one.',
      tone: 'info',
    },
    home: {
      title: 'Everyone is in the office',
      body: 'Nobody has flagged a day at home.',
      tone: 'success',
    },
    out: {
      title: 'Full team today',
      body: 'Nobody is on leave, sick or travelling.',
      tone: 'success',
    },
    /*
     * BambooHR is only asked for time off from today onwards, so an empty past
     * day would read as "nobody was away" when what is true is "leave that had
     * already ended is not here".
     */
    presencePast: {
      title: 'Cannot say for a past day',
      body: 'Meridian only asks BambooHR for time off from today onwards, so leave that had already ended is not here.',
      tone: 'neutral',
    },
    inbox: {
      title: 'Nothing waiting on you',
      body: 'No time-off request is sitting in BambooHR for your approval.',
      tone: 'success',
    },
    review: {
      title: 'No reviews waiting on you',
      body: 'Nobody is blocked on your review right now.',
      tone: 'success',
    },
    /** Not an empty state — the card carries a number. One line under it. */
    hours: 'Balance is even. Nothing owed either way.',
  },

  person: {
    tasks: {
      title: 'Nothing open with this name on it',
      body: 'Tasks you tag with them land here, and stay visible on their profile until done.',
      tone: 'success',
    },
    tasksFiltered: {
      title: 'No tasks match this filter',
      body: 'Change the filter above to see the rest.',
      tone: 'neutral',
    },
    notes: {
      title: 'No notes about this person yet',
      body: 'A 1:1, a piece of feedback, something you want to remember before the next conversation.',
      tone: 'info',
    },
    about: {
      title: 'Nothing written down yet',
      body: 'How they work, what they want, what to watch.',
      tone: 'info',
    },
    links: {
      title: 'No links yet',
      body: 'A growth plan, an on-call rotation, a repo — anything you would otherwise hunt for in a chat thread.',
      tone: 'info',
    },
    plans: {
      title: 'No rise planned',
      body: 'Add one when you have a date and a number — it shows in the history below, marked as planned.',
      tone: 'info',
    },
    compensation: {
      title: 'No compensation history',
      body: 'BambooHR has no compensation rows for them.',
      tone: 'neutral',
    },
  },

  people: {
    none: {
      title: 'Nobody reports to you yet',
      body: 'Check BAMBOOHR_MANAGER_EMPLOYEE_ID in .env — Meridian builds the roster from the reporting line under that id.',
      tone: 'neutral',
    },
    /*
     * The roster's own version of `sources.bamboo`: it is the one place with a
     * way forward that needs no credentials at all, and the body says so.
     */
    unconfigured: {
      title: 'BambooHR is not connected',
      body: 'Add the BAMBOOHR_ keys to .env and restart, or add people to people/entries.json by hand.',
      tone: 'warning',
    },
    /** Both are one line under a table, not an empty card. */
    hidden: 'Amounts are hidden. Reveal for 30 seconds.',
    noRises: 'No planned rises yet. Add one on a person to see it here.',
  },

  tasks: {
    none: {
      title: 'No tasks yet',
      body: 'Add the first one with the field at the top — a title is enough.',
      tone: 'info',
    },
    allDone: {
      title: 'All clear. Nothing open.',
      body: 'Change the filters above to see what is done, or add something with the field at the top.',
      tone: 'success',
    },
    filtered: {
      title: 'No tasks match these filters',
      body: 'Widen the filters above, or switch to All.',
      tone: 'neutral',
    },
  },

  projects: {
    none: {
      title: 'No projects yet',
      body: 'A project is anything that runs longer than a task — a migration, a hiring round, a ritual you are trying to establish. Give it phases and it tells you where it stands.',
      tone: 'info',
    },
    archived: {
      title: 'Nothing archived',
      body: 'Finished or parked projects land here when you archive them — out of the way, still readable, and restorable any time.',
      tone: 'neutral',
    },
    /*
     * Not `none`. "No projects yet" over a vault that holds three archived ones
     * is the same wrong claim as "no tasks" over a tasks.json that will not
     * parse: it says there is nothing when there is something you cannot see.
     */
    allArchived: {
      title: 'Nothing active right now',
      body: 'Every project you have is archived. Switch to Archived to read one, or restore it to bring it back here.',
      tone: 'success',
    },
  },

  project: {
    phases: {
      title: 'No phases yet',
      body: 'Phases are the checkpoints this project has to pass — not tasks, just how you know where it stands. Add the first one below.',
      tone: 'info',
    },
    tasks: {
      title: 'No tasks on this project yet',
      body: 'Pick the project in the task form and it shows up here, with its chip on the task wherever you meet it.',
      tone: 'info',
    },
    notes: {
      title: 'No notes on this project yet',
      body: 'Decisions, retros, the reason a phase slipped — tag a note with this project and it lands here, wherever the note itself lives.',
      tone: 'info',
    },
    links: {
      title: 'No links yet',
      body: 'The design doc, the tracking board, the dashboard you keep reopening — put them here so the project carries them.',
      tone: 'info',
    },
  },

  notes: {
    none: {
      title: 'No notes yet',
      body: 'Write the first one — two lines is a note.',
      tone: 'info',
    },
    filtered: {
      title: 'No notes match these filters',
      body: 'Widen the person, project or category filter, or turn off Drafts only.',
      tone: 'neutral',
    },
    /** The editor column, when the list beside it has nothing to select. */
    unselected: {
      title: 'Nothing to read here',
      body: 'Pick a note from the list to read and edit it.',
      tone: 'neutral',
    },
  },

  timebalance: {
    none: {
      title: 'Nothing logged yet',
      body: 'Log a late evening or an early leave above — the balance is only as honest as what you put in.',
      tone: 'info',
    },
    range: {
      title: 'Nothing logged in this range',
      body: 'Widen the range above to see the rest of the ledger.',
      tone: 'neutral',
    },
    zero: {
      title: 'Even',
      body: 'Nothing owed either way.',
      tone: 'success',
    },
  },

  vault: {
    emptyFolder: {
      title: 'This folder is empty',
      body: 'Nothing has been written here yet. Meridian creates files the first time you save something of that kind.',
      tone: 'neutral',
    },
    emptyFile: {
      title: 'This file is empty',
      body: 'It exists, and nothing has been written into it yet.',
      tone: 'neutral',
    },
    binary: {
      title: 'Not a text file',
      body: 'Meridian previews text. Open this one with something that knows the format.',
      tone: 'neutral',
    },
    missing: {
      title: 'No file at that path',
      body: 'Meridian will create it on the first save.',
      tone: 'neutral',
    },
  },

  changelog: {
    saved: {
      title: 'Everything is saved',
      body: 'The vault matches the last commit. Nothing is waiting to leave this machine.',
      tone: 'success',
    },
    noCommits: {
      title: 'No history yet',
      body: 'Your first save starts it.',
      tone: 'neutral',
    },
    notARepo: {
      title: 'The vault is not a git repository yet',
      body: 'Run git init in the vault folder to start tracking history. Everything else keeps working without it.',
      tone: 'warning',
    },
    /** The body names the repository it resolved to, so the call site finishes it. */
    nested: {
      title: 'The vault sits inside another repository',
      body: 'Committing from here would sweep up files outside the vault, so saving is disabled until the vault is its own repository.',
      tone: 'warning',
    },
    /** A subtitle, not an empty state. */
    noRemote: 'No remote configured. Saving works; sharing needs a remote.',
  },
} as const;
