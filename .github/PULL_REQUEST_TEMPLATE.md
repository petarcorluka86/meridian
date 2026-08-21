## What this changes

<!-- One paragraph. The diff says what; this says why. -->

Closes #

## How I checked it

- [ ] `npm run verify` passes (type-check, Biome, unit tests)
- [ ] `npm run pixel` passes, or the baselines are updated **in this pull
      request** and the diff is explained below
- [ ] I ran it against the fixture vault: `VAULT_PATH=./src/fixtures/vault npm run dev`

<!-- If you updated baselines, say what moved and why it is correct. -->

## The four things a review slows down on

Tick anything this touches, and say what you did:

- [ ] **`src/lib/net-guard.ts`, the allow-list, or anything about outbound
      requests.** Every request stays a `GET`; the only permitted non-GET is the
      OAuth token endpoint, by exact URL.
- [ ] **`src/lib/vault/write.ts` or `safeVaultPath()`.** Every vault write goes
      through the snapshot, mtime check and atomic rename; every path is
      resolved and asserted inside the vault.
- [ ] **`src/styles/tokens.css` or a primitive in `src/components/ui/`.** Every
      value is defined once and applied by a primitive. A new variant needs a
      rule in the stylesheet, or the gate fails.
- [ ] **`tests/pixel/baseline/`.** Updated deliberately, in the commit that
      caused the visual change.

## Documentation

- [ ] Anything a user reads went to the Help screen, `src/app/help/page.tsx`
- [ ] Anything an engineer reads went to `CLAUDE.md`
- [ ] Neither needed changing

<!-- These two are the only places documentation lives, and nothing is written
     in both. -->

## Commits

- [ ] Every commit follows Conventional Commits, per `CONTRIBUTING.md`
- [ ] Breaking changes are marked with `!` or a `BREAKING CHANGE:` footer
