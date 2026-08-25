import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The wizard takes credentials from a browser form and writes them to disk. Its
 * actions had no tests at all — every input is a raw string from the page, and
 * the one thing that must never happen is a saved credential coming back out.
 *
 * revalidatePath needs a request scope that does not exist here, and the checks
 * reach the network. Both are replaced, so what is under test is the action's
 * own handling of input and output.
 */

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const API_KEY = 'sk-live-0123456789abcdef0123456789abcdef';
const TOKEN = `ghp_${'z'.repeat(36)}`;

let dir: string;
let envFile: string;
const realFetch = globalThis.fetch;

function respond(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-actions-'));
  envFile = path.join(dir, '.env');
  fs.writeFileSync(envFile, '# my own notes\nVAULT_PATH=\n', { mode: 0o600 });
  process.env.MERIDIAN_ENV_PATH = envFile;
  // Deliberately not set: an explicit VAULT_PATH beats the file, so setting one
  // here would mean the wizard's own write is never what takes effect — which is
  // the thing being tested.
  delete process.env.VAULT_PATH;
  const { resetConfig } = await import('@/lib/env');
  resetConfig();
});

afterEach(async () => {
  globalThis.fetch = realFetch;
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.MERIDIAN_ENV_PATH;
  delete process.env.VAULT_PATH;
  const { resetConfig } = await import('@/lib/env');
  resetConfig();
});

describe('choosing a vault folder', () => {
  it('refuses a path that is not absolute, before touching the disk', async () => {
    const { checkVaultAction } = await import('@/app/setup/actions');
    const result = await checkVaultAction('somewhere/relative');

    expect(result.ok).toBe(false);
    expect(fs.readFileSync(envFile, 'utf8')).not.toContain('somewhere/relative');
  });

  it('refuses an empty choice', async () => {
    const { checkVaultAction } = await import('@/app/setup/actions');
    expect((await checkVaultAction('   ')).ok).toBe(false);
  });

  it('creates the folder, records it, and scaffolds .gitignore first', async () => {
    const { checkVaultAction } = await import('@/app/setup/actions');
    const target = path.join(dir, 'chosen');
    const result = await checkVaultAction(target);

    expect(result.ok).toBe(true);
    expect(fs.readFileSync(envFile, 'utf8')).toContain(`VAULT_PATH=${target}`);
    // The single thing that must be true before any cache file can exist: the
    // .cache folder holds salaries and photographs.
    expect(fs.readFileSync(path.join(target, '.gitignore'), 'utf8')).toContain('.cache/');
  });

  it('keeps the rest of .env exactly as it found it', async () => {
    const { checkVaultAction } = await import('@/app/setup/actions');
    await checkVaultAction(path.join(dir, 'chosen'));
    expect(fs.readFileSync(envFile, 'utf8')).toContain('# my own notes');
  });

  it('leaves .env readable only by its owner', async () => {
    const { checkVaultAction } = await import('@/app/setup/actions');
    fs.chmodSync(envFile, 0o644);
    await checkVaultAction(path.join(dir, 'chosen'));
    expect(fs.statSync(envFile).mode & 0o077).toBe(0);
  });
});

describe('connecting BambooHR', () => {
  it('reports a rejected key without repeating it', async () => {
    globalThis.fetch = vi.fn(async () => respond(401, {})) as typeof fetch;
    const { checkBambooAction } = await import('@/app/setup/actions');

    const result = await checkBambooAction('yourcompany', API_KEY, 'horvat');

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(API_KEY);
  });

  it('finds a person by surname, diacritics or not', async () => {
    globalThis.fetch = vi.fn(async () =>
      respond(200, {
        employees: [
          { id: '1', displayName: 'Ana Ćorluka', supervisor: '' },
          { id: '2', displayName: 'Marko Marić', supervisor: 'Ana Ćorluka' },
        ],
      }),
    ) as typeof fetch;
    const { checkBambooAction } = await import('@/app/setup/actions');

    // People type their own surname without the diacritic. Failing to match it
    // tells them they do not exist.
    const result = await checkBambooAction('yourcompany', API_KEY, 'corluka');

    expect(result.ok).toBe(true);
    expect(result.ok && result.candidates?.[0]).toMatchObject({ id: '1', reports: 1 });
  });

  it('saves the key but never gives one back', async () => {
    const { saveBambooAction, setupStateAction } = await import('@/app/setup/actions');

    // Saving now also asks where pay lives. Nothing answers here, which is the
    // ordinary case for a company that keeps it in the standard table.
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 })) as typeof fetch;

    const saved = await saveBambooAction('yourcompany.bamboohr.com', API_KEY, '42');
    expect(saved.ok).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(API_KEY);

    // It reached the file.
    const written = fs.readFileSync(envFile, 'utf8');
    expect(written).toContain(`BAMBOOHR_API_KEY=${API_KEY}`);
    expect(written).toContain('BAMBOOHR_SUBDOMAIN=yourcompany');

    // And what the wizard asks for afterwards is a yes or a no, never a value.
    const state = await setupStateAction();
    expect(state.bamboo).toBe(true);
    expect(JSON.stringify(state)).not.toContain(API_KEY);
  });
});

describe('connecting GitHub', () => {
  it('reports a rejected token without repeating it', async () => {
    globalThis.fetch = vi.fn(async () => respond(401, {})) as typeof fetch;
    const { checkGithubAction } = await import('@/app/setup/actions');

    const result = await checkGithubAction(TOKEN, 'someone', 'owner/repo');

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(fs.readFileSync(envFile, 'utf8')).not.toContain(TOKEN);
  });

  it('saves only the repositories the token can actually reach', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/good/one') ? respond(200, {}) : respond(404, {}),
    ) as typeof fetch;
    const { checkGithubAction } = await import('@/app/setup/actions');

    const result = await checkGithubAction(TOKEN, 'someone', 'good/one, bad/two');

    expect(result.ok).toBe(true);
    expect(fs.readFileSync(envFile, 'utf8')).toContain('GITHUB_REPOS=good/one');
  });
});

describe('finding where a company keeps pay', () => {
  const TABLES = JSON.stringify([
    { alias: 'jobInfo' },
    { alias: 'compensation' },
    { alias: 'dependents' },
    { alias: 'customAdditionalOverallCompensation' },
  ]);

  it('saves the custom table when the standard one is empty', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/meta/tables')) return new Response(TABLES, { status: 200 });
      if (url.endsWith('/tables/compensation')) return new Response('[]', { status: 200 });
      return new Response(
        JSON.stringify([{ customDate1: '2026-01-01', customTotal1: '1', customGrosssalary: '2' }]),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const { saveBambooAction } = await import('@/app/setup/actions');

    const result = await saveBambooAction('yourcompany', 'key-not-a-real-one', '42');

    expect(result.ok).toBe(true);
    expect(result.ok && result.detail).toContain('customAdditionalOverallCompensation');
    // The key that used to be nobody's job to write, and whose absence looked
    // exactly like a company that pays nobody.
    expect(fs.readFileSync(envFile, 'utf8')).toContain(
      'BAMBOOHR_COMP_TABLE=customAdditionalOverallCompensation',
    );
  });

  it('prefers the standard table when it answers', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/meta/tables')) return new Response(TABLES, { status: 200 });
      return new Response(JSON.stringify([{ startDate: '2026-01-01', rate: '1' }]), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const { saveBambooAction } = await import('@/app/setup/actions');

    const result = await saveBambooAction('yourcompany', 'key-not-a-real-one', '42');

    expect(fs.readFileSync(envFile, 'utf8')).toContain('BAMBOOHR_COMP_TABLE=compensation');
    // It carries neither default field name, and the step says so rather than
    // leaving a blank column to be discovered later.
    expect(result.ok && result.detail).toContain('BAMBOOHR_COMP_DATE_FIELD');
  });

  it('connects anyway when nothing answers, and says which it was', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/meta/tables')) return new Response(TABLES, { status: 200 });
      return new Response('[]', { status: 200 });
    }) as unknown as typeof fetch;
    const { saveBambooAction } = await import('@/app/setup/actions');

    const result = await saveBambooAction('yourcompany', 'key-not-a-real-one', '42');

    expect(result.ok).toBe(true);
    expect(result.ok && result.detail).toContain('BAMBOOHR_COMP_TABLE');
    expect(fs.readFileSync(envFile, 'utf8')).not.toContain('BAMBOOHR_COMP_TABLE=');
  });
});

describe('connecting a calendar', () => {
  it('refuses an incomplete set, without asking the network', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('should not have been called');
    }) as typeof fetch;
    const { checkCalendarAction } = await import('@/app/setup/actions');

    expect((await checkCalendarAction('', 's', 'r', 'c')).ok).toBe(false);
    expect((await checkCalendarAction('12345', 's', 'r', 'c')).ok).toBe(false);
    expect(fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').not.toContain(
      'GOOGLE_CLIENT_ID',
    );
  });

  it('writes nothing when the account cannot read the calendar asked for', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'short-lived' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          items: [{ id: 'someone.else@yourcompany.com', summary: 'Someone else' }],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const { checkCalendarAction } = await import('@/app/setup/actions');

    const result = await checkCalendarAction(
      '000-x.apps.googleusercontent.com',
      'GOCSPX-secret',
      '1//0e-refresh',
      'you@yourcompany.com',
    );

    expect(result.ok).toBe(false);
    // The failure people actually hit, so it names what would have worked.
    expect(result.ok === false && result.hint).toContain('someone.else@yourcompany.com');
    expect(fs.readFileSync(envFile, 'utf8')).not.toContain('GOOGLE_REFRESH_TOKEN');
  });

  it('saves all four once Google confirms the calendar is readable', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'short-lived' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          items: [{ id: 'you@yourcompany.com', summary: 'You', primary: true }],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const { checkCalendarAction } = await import('@/app/setup/actions');

    const result = await checkCalendarAction(
      '000-x.apps.googleusercontent.com',
      'GOCSPX-secret',
      '1//0e-refresh',
      'you@yourcompany.com',
    );

    expect(result.ok).toBe(true);
    const written = fs.readFileSync(envFile, 'utf8');
    expect(written).toContain('GOOGLE_CLIENT_ID=000-x.apps.googleusercontent.com');
    expect(written).toContain('GOOGLE_REFRESH_TOKEN=1//0e-refresh');
    expect(written).toContain('GOOGLE_CALENDAR_ID=you@yourcompany.com');
  });
});

describe('no server action can hand a credential back', () => {
  /**
   * Scanned rather than called, so an action written next year is covered too.
   * A Server Action's return value is serialised straight to the browser, which
   * makes "what does it return" the whole of the question.
   *
   * Only exported functions, and only the return statement itself: a private
   * helper inside the same module may legitimately put an API key in a request
   * header, and a naive window that runs past the semicolon reads the next
   * statement as if it were part of the return.
   */
  const CREDENTIAL = /\b(apiKey|clientSecret|refreshToken)\b|\bconfig\.(bamboo|github|calendar)\b/;

  /**
   * The function's body, not its signature and not its return type.
   *
   * `export async function f(): Promise<{ ok: boolean }> {` has two braces at
   * paren-depth zero, and the first one belongs to the type. The body is the one
   * whose closing brace sits at the start of a line, which is what a top-level
   * function looks like once formatted.
   */
  function body(source: string, from: number): string {
    let parens = 0;
    for (let i = from; i < source.length; i++) {
      const c = source[i];
      if (c === '(') parens++;
      else if (c === ')') parens--;
      else if (c === '{' && parens === 0) {
        let depth = 0;
        for (let j = i; j < source.length; j++) {
          if (source[j] === '{') depth++;
          else if (source[j] === '}') {
            depth--;
            if (depth === 0) {
              if (j === 0 || source[j - 1] === '\n') return source.slice(i, j + 1);
              i = j;
              break;
            }
          }
        }
      }
    }
    return '';
  }

  /** From `return` to the semicolon that ends it, ignoring nested brackets. */
  function statement(source: string, from: number): string {
    let depth = 0;
    for (let i = from; i < source.length; i++) {
      const c = source[i];
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') {
        if (depth === 0) return source.slice(from, i);
        depth--;
      } else if (c === ';' && depth === 0) return source.slice(from, i);
    }
    return source.slice(from);
  }

  const modules = (() => {
    const root = path.resolve(import.meta.dirname, '../../src');
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          if (fs.readFileSync(full, 'utf8').includes("'use server'")) out.push(full);
        }
      }
    };
    walk(root);
    return out.map((file) => ({
      file: path.relative(root, file),
      source: fs.readFileSync(file, 'utf8'),
    }));
  })();

  const actions = modules.flatMap(({ file, source }) =>
    [...source.matchAll(/export async function (\w+)/g)].map((m) => ({
      file,
      name: m[1] as string,
      body: body(source, m.index),
    })),
  );

  it('finds the actions it claims to be checking', () => {
    // A scan that matches nothing passes for the wrong reason.
    expect(modules.length).toBeGreaterThanOrEqual(7);
    expect(actions.length).toBeGreaterThanOrEqual(25);
    expect(actions.map((a) => a.name)).toContain('setupStateAction');
    // And that what was captured is a body, not a signature — the mistake that
    // makes this whole test pass without reading anything.
    for (const action of actions) {
      expect(action.body.length, `${action.file} ${action.name}`).toBeGreaterThan(20);
    }
  });

  it('never returns one', () => {
    const offenders: string[] = [];

    for (const action of actions) {
      for (const match of action.body.matchAll(/\breturn\b/g)) {
        const returned = statement(action.body, match.index);
        if (CREDENTIAL.test(returned)) {
          offenders.push(`${action.file} ${action.name}: ${returned.split('\n')[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
