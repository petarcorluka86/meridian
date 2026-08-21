---
name: vault-doctor
description: Validate every file in the Meridian vault and explain anything the app cannot read. Use when the app shows a file problem, after hand-editing the vault, or before committing.
---

# Checking the vault

Run the validator, which uses the same code path as the app — what it says is
exactly what the screens will say:

```bash
npm run vault:doctor
```

It exits non-zero when there are problems and prints, for each one, the file and
the reason.

## Reading the output

- **`Not valid JSON`** — a syntax error, with the character position. Fix the
  file; nothing else in the vault is affected.
- **`entry N (field): …`** — one row of a list failed validation. That row is
  skipped and everything else still loads, so the app is usable meanwhile.
- **`Folder has no matching slug`** — a folder under `people/` has no entry in
  `people/entries.json`, so that person will not appear on the roster. Either add
  the entry or rename the folder. **Do not "fix" this by deleting the folder** —
  it holds their notes.

## Before changing anything

The version before each write is in `.snapshots/<path>/`. If a fix goes wrong,
the previous content is there.

Never repair `people/entries.json` by removing entries to make an error go away —
that orphans notes. Correct the slug instead.
