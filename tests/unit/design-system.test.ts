import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The design system, enforced.
 *
 * The promise is propagation: change a colour, a radius or a spacing step in
 * `src/styles/tokens.css` and every screen follows. That is only true while no
 * component writes a value out itself, which is not something review catches
 * reliably — so it is checked here.
 *
 * Five rules, over every stylesheet and every component in `src/`:
 *
 *   1. no colour literal
 *   2. no font declared outside the primitives
 *   3. every padding, margin and gap is a `--space-*` step
 *   4. every radius is a `--radius-*` token
 *   5. every shadow is a `--shadow-*` token
 *
 * Plus one structural rule: nothing outside the primitives may re-declare the
 * card, which is the duplication this system exists to end.
 *
 * `NOT_YET_MIGRATED` is empty: every screen is built out of the primitives, and
 * there is no longer an alias layer to fall back to.
 */

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'src');

/** The one file allowed to write a value down. */
const FOUNDATIONS = ['styles/tokens.css'];

/** The primitives, and the only place a font or a colour role may be applied. */
const PRIMITIVES = 'components/ui/';

/**
 * The two files that cannot take a token, and will not be migrated.
 *
 * `global-error.tsx` is the last resort: an error in the root layout itself,
 * where the app's own stylesheet is exactly the thing that may have failed. A
 * fallback that depends on what just broke is not a fallback, so it inlines
 * everything and depends on nothing.
 *
 * `layout.tsx` declares `themeColor`, which the browser chrome reads before any
 * stylesheet exists. It is `--bg`, written out a second time, and the comment
 * there says so.
 */
const SELF_CONTAINED = ['app/global-error.tsx', 'app/layout.tsx'];

/**
 * Empty, and the point of this file is that it stays that way.
 *
 * It held sixty-two entries — every screen and island written before the design
 * system existed. Each one left when it moved onto the primitives, and the alias
 * layer they depended on, `src/styles/legacy.css`, went with the last of them.
 *
 * A new entry here is a screen that has decided not to use the system. If one is
 * ever needed, the reason belongs beside it.
 */
const NOT_YET_MIGRATED: string[] = [];

/** The two files allowed to draw a bordered surface. */
const CONTAINERS = ['components/ui/Card.module.css', 'components/ui/Dialog.module.css'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'fixtures') continue;
      walk(full, out);
    } else if (/\.(css|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

type File = { file: string; source: string };

const all: File[] = walk(SRC).map((full) => ({
  file: path.relative(SRC, full).split(path.sep).join('/'),
  source: fs.readFileSync(full, 'utf8'),
}));

const migrated = all.filter(
  ({ file }) =>
    !FOUNDATIONS.includes(file) &&
    !SELF_CONTAINED.includes(file) &&
    !NOT_YET_MIGRATED.includes(file),
);

/** A data URI is a picture, not a colour decision. */
function withoutUrls(source: string): string {
  return source.replace(/url\((?:[^()]|\([^()]*\))*\)/g, '');
}

/**
 * The seven steps, plus `--indent`: the one derived length in the app, a step
 * multiplied by a tree depth. A second derived length needs a reason and a line
 * here.
 */
const SPACE_TOKEN = /^var\(--(space-\d|indent)/;

/** Values that are always fine wherever a length is expected. */
const NEUTRAL = /^(0|auto|inherit|initial|unset|none|normal)$/;

/** Every length in a value must be a token, `0`, or arithmetic over those. */
function offScale(value: string, allowed: RegExp): boolean {
  const cleaned = value.replace(/calc\(|\)/g, ' ').trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .some((part) => {
      if (NEUTRAL.test(part) || /^[-+*/]$/.test(part) || /^[\d.]+$/.test(part)) return false;
      if (part.startsWith('var(')) return !allowed.test(part);
      // A bare unit — 11px, 0.5rem, 3vw — is the thing this rule is about.
      return /\d(px|rem|em|%|vw|vh)$/.test(part);
    });
}

describe('the design system is where the values live', () => {
  it('scans something', () => {
    expect(all.length).toBeGreaterThan(40);
    expect(migrated.length).toBeGreaterThan(20);
  });

  it('has no stale entry in the backlog or the exceptions', () => {
    // An entry for a file that no longer exists hides a rule nobody is checking.
    const present = new Set(all.map(({ file }) => file));
    expect([...NOT_YET_MIGRATED, ...SELF_CONTAINED].filter((file) => !present.has(file))).toEqual(
      [],
    );
  });

  it('writes no colour outside tokens.css and legacy.css', () => {
    const offenders: string[] = [];
    for (const { file, source } of migrated) {
      for (const match of withoutUrls(source).matchAll(
        /oklch\([^)]*\)|#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g,
      )) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('sets type only from the scale', () => {
    // `Text` is how markup asks for a level. A stylesheet may name one directly
    // for something a component cannot express — a diff line — but only as a
    // whole `--type-*` token: a loose size, weight or tracking is what turned
    // nineteen sizes into sixty-four rules.
    const offenders: string[] = [];
    for (const { file, source } of migrated) {
      if (!file.endsWith('.css')) continue;
      const primitive = file.startsWith(PRIMITIVES) || file === 'styles/global.css';
      for (const match of source.matchAll(/^\s*font:\s*([^;]+);/gm)) {
        const value = match[1]!.trim();
        // `font: inherit` is a reset, not a choice: a button or a cell that has
        // to stop imposing its own type on the `Text` inside it.
        if (value !== 'inherit' && !/^var\(--type-[a-z]+(?:-[a-z]+)*\)$/.test(value)) {
          offenders.push(`${file}: font: ${match[1]!.trim()}`);
        }
      }
      if (primitive) continue;
      for (const match of source.matchAll(
        /^\s*(font-size|font-weight|font-family|line-height|letter-spacing):/gm,
      )) {
        offenders.push(`${file}: ${match[1]}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('spends space only in steps', () => {
    const offenders: string[] = [];
    for (const { file, source } of migrated) {
      if (!file.endsWith('.css')) continue;
      for (const match of source.matchAll(
        /^\s*(padding|padding-\w+|margin|margin-\w+|gap|row-gap|column-gap):\s*([^;]+);/gm,
      )) {
        if (offScale(match[2]!, SPACE_TOKEN)) offenders.push(`${file}: ${match[0]!.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('rounds corners only with the radius scale', () => {
    const offenders: string[] = [];
    for (const { file, source } of migrated) {
      if (!file.endsWith('.css')) continue;
      for (const match of source.matchAll(/^\s*border-radius:\s*([^;]+);/gm)) {
        if (offScale(match[1]!, /^var\(--radius-/)) offenders.push(`${file}: ${match[0]!.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('casts a shadow only from the two tokens', () => {
    const offenders: string[] = [];
    for (const { file, source } of migrated) {
      if (!file.endsWith('.css')) continue;
      for (const match of source.matchAll(/^\s*box-shadow:\s*([^;]+);/gm)) {
        const value = match[1]!.trim();
        if (value === 'none' || /^var\(--shadow-[a-z]+\)$/.test(value)) continue;
        // An `inset` box-shadow is a line, not an elevation: it draws a bar
        // inside an element without the layout shift a real border would cause.
        // Its colour still has to be a token.
        if (/^inset [\d\s]+px[\d\s]*(px)?\s*var\(--[a-z-]+\)$/.test(value)) continue;
        offenders.push(`${file}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('lets nothing but Card declare the card', () => {
    // Surface plus a border plus a card radius is the container, and there is one
    // of it. This is the duplication the system exists to end: it was written out
    // twenty-one times across eleven modules.
    const offenders: string[] = [];
    for (const { file, source } of migrated) {
      if (!file.endsWith('.css')) continue;
      // Card and the dialog are the two containers in the system, and the
      // dialog is not a card: it carries the other shadow and its own width.
      if (CONTAINERS.includes(file)) continue;
      for (const block of source.split('}')) {
        const looksLikeCard =
          /background:\s*var\(--surface\)/.test(block) &&
          /border:\s*1px solid/.test(block) &&
          /border-radius:\s*var\(--radius-card\)/.test(block);
        if (looksLikeCard) offenders.push(`${file}: ${block.trim().split('\n')[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * A primitive's variants are a promise: `size="xl"` says there is an `xl`. If the
 * stylesheet has no rule for it, the component renders with no size at all — and
 * nothing else in the repo notices, because the types still line up.
 *
 * That is not hypothetical. `Avatar` gained an `xl` in the type and the barrel and
 * the props, and the CSS rule was silently dropped by a reformat. Every photo on
 * the roster collapsed to nothing, and every test in this file still passed.
 */
describe('every variant a primitive offers exists in its stylesheet', () => {
  /** `size` becomes `data-size`, and so on. Booleans are not enumerations. */
  const ENUMERATED = ['size', 'variant', 'tone', 'level', 'align', 'justify', 'priority', 'width'];

  const primitives = all.filter(({ file }) => file.startsWith(PRIMITIVES) && file.endsWith('.tsx'));

  const members = (text: string) => [...text.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]!);

  /** The shared aliases — `Tone`, `PillTone`, `Priority`. */
  const shared = new Map<string, string[]>();
  for (const { source } of all.filter(({ file }) => file.startsWith(PRIMITIVES))) {
    for (const match of source.matchAll(
      /(?:export )?type\s+(\w+)\s*=\s*((?:\s*\|?\s*'[a-z-]+')+)\s*;/g,
    )) {
      shared.set(match[1]!, members(match[2]!));
    }
  }

  /**
   * A prop's own union, resolved in its own file. Reading these globally is what
   * made the first version of this test wrong: `size` means four things in
   * `Avatar` and two everywhere else.
   */
  const inFile = (source: string) => {
    const own = new Map<string, string[]>();
    for (const match of source.matchAll(/^\s*(\w+)\??:\s*((?:\s*\|?\s*'[a-z-]+')+);/gm)) {
      const found = members(match[2]!);
      if (found.length > 1) own.set(match[1]!, found);
    }
    return own;
  };

  it('found the unions to check', () => {
    expect(shared.size).toBeGreaterThan(2);
    expect(primitives.length).toBeGreaterThan(15);
  });

  it('has a rule for every member that is not the default', () => {
    const offenders: string[] = [];

    for (const { file, source } of primitives) {
      const css = all.find((entry) => entry.file === file.replace('.tsx', '.module.css'));
      if (!css) continue;

      for (const attr of ENUMERATED) {
        if (!new RegExp(`data-${attr}=\\{`).test(source)) continue;

        // The value the prop falls back to needs no rule: the base class is it.
        const fallback = source.match(new RegExp(`\\b${attr}\\s*=\\s*'([a-z-]+)'`))?.[1];

        // Either the members written inline, or `tone: Tone` naming a shared one.
        const named = source.match(new RegExp(`\\b${attr}\\??:\\s*(\\w+);`))?.[1];
        const variants = inFile(source).get(attr) ?? shared.get(named ?? '');
        if (!variants) continue;

        for (const member of variants) {
          if (member === fallback) continue;
          if (css.source.includes(`data-${attr}='${member}'`)) continue;
          if (css.source.includes(`data-${attr}="${member}"`)) continue;
          offenders.push(`${file}: ${attr}="${member}" has no rule in ${css.file}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

/**
 * A button carries one glyph, and it is a prop.
 *
 * `ButtonLink external` adds the external arrow itself so no call site has to
 * remember — which meant a caller that also passed its own got two, and the Join
 * button on the meetings card shipped with a video icon *and* an arrow. Making the
 * glyph a prop rather than a child leaves one slot, and this makes the old way
 * impossible rather than merely discouraged.
 */
describe('a button carries one glyph', () => {
  const GLYPH = /<[A-Z]\w*Icon\b|<Icon\b/;

  /**
   * Where a JSX opening tag ends.
   *
   * Regex cannot do this: an attribute holds `() => …`, and every pattern that
   * stops at the first `>` stops in the middle of an arrow. Braces are what tell
   * an attribute value from the end of the tag, so counting them is the whole job.
   */
  function openTagEnd(source: string, from: number): number {
    let depth = 0;
    for (let i = from; i < source.length; i++) {
      const c = source[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) return i + 1;
    }
    return -1;
  }

  /** Every `<Button>`/`<ButtonLink>` with children, and what is between the tags. */
  function bodies(source: string): { tag: string; body: string }[] {
    const found: { tag: string; body: string }[] = [];
    for (const tag of ['Button', 'ButtonLink']) {
      let at = 0;
      while (true) {
        const open = source.indexOf(`<${tag}`, at);
        if (open === -1) break;
        // `<ButtonLink` also starts with `<Button`; only the exact tag counts.
        const after = source[open + tag.length + 1];
        if (after && /[A-Za-z]/.test(after)) {
          at = open + 1;
          continue;
        }
        const end = openTagEnd(source, open);
        at = end === -1 ? open + 1 : end;
        if (end === -1 || source.slice(end - 2, end) === '/>') continue;
        const close = source.indexOf(`</${tag}>`, end);
        if (close !== -1) found.push({ tag, body: source.slice(end, close) });
      }
    }
    return found;
  }

  const components = all.filter(({ file }) => file.endsWith('.tsx'));

  it('found the buttons to check', () => {
    const total = components.reduce((n, { source }) => n + bodies(source).length, 0);
    expect(total).toBeGreaterThan(20);
  });

  it('never puts a glyph in the children', () => {
    const offenders: string[] = [];
    for (const { file, source } of components) {
      if (file === 'components/ui/Button.tsx') continue;
      for (const { tag, body } of bodies(source)) {
        if (!GLYPH.test(body)) continue;
        const label = body
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40);
        offenders.push(`${file}: <${tag}> "${label}" — pass it as icon={…}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
