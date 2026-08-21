/**
 * The empty-state catalogue.
 *
 * Every empty state in the app takes its words from here, so the same situation
 * is described the same way on every screen. These are not placeholders: change
 * the wording here, never at the call site.
 */
export const EMPTY = {
  overview: {
    inbox: 'Nothing waiting on you.',
    review: 'No pull requests waiting on your review.',
    meetings: 'No meetings today.',
    presence: 'Everyone is in today.',
    hours: 'Balance is even. Nothing owed either way.',
    unsaved: 'Everything is saved to the vault.',
    whole: 'Nothing needs you this morning. Good time for the slow work.',
  },
  people: {
    none: 'BambooHR returned nobody reporting to you. Check BAMBOOHR_MANAGER_EMPLOYEE_ID.',
    noRises: 'No planned rises yet. Add one on a person to see it here.',
    hidden: 'Amounts are hidden. Reveal for 30 seconds.',
  },
  tasks: {
    none: 'No tasks yet. Add the first one above.',
    allDone: 'All clear. Nothing open.',
    group: 'Nothing late.',
    filtered: 'No tasks match this filter.',
  },
  notes: {
    none: 'No notes yet. Write the first one — it can be two lines.',
    filtered: 'No notes match these filters.',
    inbox: 'Inbox is clear. Nothing left to file.',
    emptyBody: 'Empty note. Start typing.',
  },
  timebalance: {
    none: 'No hours logged yet. Log the first time you stay late or leave early.',
    range: 'No entries in this range.',
    zero: 'Even. Nothing owed either way.',
  },
  vault: {
    emptyFolder: 'This folder is empty.',
    emptyFile: 'This file is empty.',
    missing: 'No folder at that path. Meridian will create it on the first save.',
  },
  changelog: {
    nothing: 'Nothing to save. The vault matches what you see.',
    noCommits: 'No history yet. Your first save starts it.',
    noRemote: 'No remote configured. Saving works; sharing needs a remote.',
  },
} as const;
