# Contributing to Meridian

Thanks for looking. This is a small, opinionated project: one folder of plain
files, no database, and integrations that only ever read. Those are not
implementation details to be traded away — they are the product. A change that
weakens one of them will be declined however good the code is.

## Before you write anything

Read **`CLAUDE.md`**. It is the technical documentation — architecture, the
invariants, the conventions and the commands — and it is the only place any of
that is written down. This file does not repeat it.

Two things there outrank everything else:

- **Nothing is ever written to BambooHR, Google or GitHub.** Every outbound
  request is a `GET`, with one named exception. Three separate gates enforce it.
- **Anything a user reads lives on the Help screen**, `src/app/help/page.tsx`,
  not in a Markdown file. If your change needs user-facing explanation, it goes
  there.

## Getting set up

```bash
npm install
git config core.hooksPath .githooks   # once per clone — runs the pre-commit gates
npm run dev                            # http://127.0.0.1:3210
```

Node 22 or newer; `.nvmrc` has the version.

Work against the committed fixture vault rather than your own data:

```bash
VAULT_PATH=./src/fixtures/vault npm run dev
```

## Before you open a pull request

```bash
npm run verify        # type-check, biome, unit tests — must pass
npm run pixel         # every screen against its recorded baseline (macOS)
```

`npm run verify` is the gate. If you touched anything visual, `npm run pixel`
will fail until you look at the diff and agree with it — then run
`npm run pixel:accept` and **commit the new baselines in the same commit that
caused the change**. A baseline updated on its own defeats the gate.

`npm run check:fix` applies Biome's safe fixes. Never widen `biome.json` to
silence one file; suppress at the site, with the reason in the comment.

## Commits

**Conventional Commits are required.** The format is:

```
<type>(<optional scope>): <summary>

<optional body>

<optional footer>
```

- The summary is imperative, lower-case, no trailing full stop, ≤ 72 characters.
- The scope, when useful, is the area touched: `vault`, `ui`, `sources`,
  `pixel`, `mcp`, `help`.
- A breaking change is marked either with `!` after the type — `feat(vault)!:` —
  or with a `BREAKING CHANGE:` footer explaining the migration.

| Type | Use it for |
| --- | --- |
| `feat` | a capability the app did not have |
| `fix` | a defect |
| `docs` | `CLAUDE.md`, this file, the Help screen, Storybook's Rules page |
| `style` | formatting only, no behaviour change |
| `refactor` | same behaviour, different shape |
| `perf` | a measured improvement |
| `test` | tests and baselines |
| `build` | dependencies, config, the build itself |
| `ci` | the workflows in `.github/` |
| `chore` | anything left over |
| `revert` | undoing a previous commit, naming its hash |

Examples:

```
feat(tasks): carry a due date through the quick capture field
fix(vault): keep a malformed links.json from hiding the person
docs: name the third gate that holds the read-only rule
refactor(ui)!: drop the small CardHeader variant

BREAKING CHANGE: callers passing size="small" must remove the prop.
```

The commit body is for *why*. The diff already says what.

## Pull requests

- One concern per pull request. Two unrelated fixes are two pull requests.
- Fill in the template — what changed, why, and how you checked it.
- Say plainly if you touched the read-only guard, the vault write path, the
  token file or a pixel baseline. Those are the four places a review will slow
  down on, and hiding them wastes both our time.
- Keep the history readable: rebase on `main` rather than merging it in.

## Reporting a security issue

Do not open an issue. See **`SECURITY.md`**.

## Code of conduct

Taking part means agreeing to **`CODE_OF_CONDUCT.md`**.
