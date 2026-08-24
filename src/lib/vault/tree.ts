import fs from 'node:fs';
import path from 'node:path';
import { safeVaultPath, vaultRoot } from './paths';

export type TreeNode = {
  path: string;
  name: string;
  kind: 'folder' | 'json' | 'md' | 'file';
  children?: TreeNode[];
};

/** git internals are noise; everything else on disk is shown, including .cache. */
const HIDDEN = new Set(['.git', '.DS_Store']);

/**
 * Top level follows the order the Help page draws rather than the alphabet, so the
 * folder reads in the order it matters. Anything unlisted falls through to
 * alphabetical after these.
 */
const TOP_ORDER = ['people', 'notes', 'projects.json', 'tasks.json', 'time.json', 'config.json'];

function kindOf(name: string): TreeNode['kind'] {
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.md')) return 'md';
  return 'file';
}

export function buildTree(): TreeNode[] {
  const root = vaultRoot();

  const walk = (rel: string): TreeNode[] => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      return [];
    }
    return entries
      .filter((e) => !HIDDEN.has(e.name))
      .sort((a, b) => {
        // Folders first, then alphabetical — the order the Help page draws. Dot
        // entries sink to the bottom: .cache is disposable and should never be the
        // first thing the eye lands on.
        const aDot = a.name.startsWith('.');
        const bDot = b.name.startsWith('.');
        if (aDot !== bDot) return aDot ? 1 : -1;
        if (rel === '') {
          const ai = TOP_ORDER.indexOf(a.name);
          const bi = TOP_ORDER.indexOf(b.name);
          if (ai !== bi) return (ai < 0 ? TOP_ORDER.length : ai) - (bi < 0 ? TOP_ORDER.length : bi);
        }
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((entry) => {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        return entry.isDirectory()
          ? { path: childRel, name: entry.name, kind: 'folder' as const, children: walk(childRel) }
          : { path: childRel, name: entry.name, kind: kindOf(entry.name) };
      });
  };

  return walk('');
}

export type FilePreview =
  | { state: 'ok'; body: string }
  | { state: 'empty' }
  | { state: 'binary' }
  | { state: 'missing' };

const TEXT = /\.(md|json|txt|gitignore|env|example|yml|yaml|csv)$/i;

export function readPreview(relPath: string): FilePreview {
  let abs: string;
  try {
    abs = safeVaultPath(relPath);
  } catch {
    return { state: 'missing' };
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return { state: 'missing' };
  }
  if (stat.isDirectory()) return { state: 'missing' };
  if (stat.size === 0) return { state: 'empty' };

  const base = path.basename(relPath);
  if (!TEXT.test(base) && base !== '.gitignore') return { state: 'binary' };
  // A preview never needs the whole of a large file.
  const body = fs.readFileSync(abs, 'utf8').slice(0, 200_000);
  return body.trim() ? { state: 'ok', body } : { state: 'empty' };
}

/** Opening the Vault should land on real data, never on the disposable cache. */
export function firstFile(nodes: TreeNode[]): string | null {
  const pick = (list: TreeNode[]): string | null => {
    for (const node of list) {
      if (node.name.startsWith('.')) continue;
      if (node.kind !== 'folder') return node.path;
      const found = node.children ? pick(node.children) : null;
      if (found) return found;
    }
    return null;
  };
  return pick(nodes) ?? null;
}
