/**
 * Written into a new vault, for whoever opens the folder without the app — a
 * year from now, or on a machine that never had it.
 *
 * The app's Help screen is the documentation and stays the only place that
 * explains the product. This is the minimum needed to make sense of the files
 * on their own, and the two rules somebody hand-editing can get wrong in a way
 * that loses data.
 */
export const VAULT_README = `# Vault

Everything one manager keeps about their team. Plain files: JSON for records,
Markdown for prose. Readable and editable without the app that writes them.

    people/entries.json        the roster — one record per person
    people/<slug>/about.md     your own notes on how someone works
    people/<slug>/links.json   label + url pairs
    people/<slug>/plans.json   planned rises and promotions
    people/<slug>/notes/       dated notes about that person
    notes/general/             about no one in particular
    projects.json              longer-running work, with its phases
    tasks.json                 tasks
    time.json                  hours owed and owing
    config.json                thresholds

Two rules matter if you edit by hand.

**The folder says who a note is about.** A note under people/ana-horvat/notes/
is about Ana. Front matter carries category, draft, pinned and project only —
never the person. Moving the file is what changes who it is about. A project is
not a folder, so it is the one thing front matter names.

**The slug is the identity.** The folder name under people/ and the slug in
entries.json must match. A mismatch is reported rather than repaired, because
repairing it silently orphans someone's notes.

Editing while the app runs is fine — it watches the folder, and refuses to
overwrite a file that changed underneath an edit.

.cache/ is fetched data and disposable. .snapshots/ holds the version before
each write. Both are git-ignored, and nothing fetched — pay, absences, meetings —
is ever committed.
`;
