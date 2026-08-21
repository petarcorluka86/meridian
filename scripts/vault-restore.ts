/**
 * Puts back a file from `.snapshots/`.
 *
 * The snapshot has been taken before every write since the first commit, and
 * nothing has ever read one — not the app, not the CLI, not the MCP server. So
 * the cost was paid on every save and the only thing it buys, getting a file
 * back, meant finding a hidden folder and copying a timestamped file by hand.
 * For a person who is not a developer, on their own laptop, that is data lost.
 *
 *   npm run vault:restore                      what has snapshots
 *   npm run vault:restore -- tasks.json        what is available for one file
 *   npm run vault:restore -- tasks.json 2      put that one back
 *
 * Restoring takes a snapshot of what is there now first, so putting back the
 * wrong version is itself undoable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { installNetGuard } from '@/lib/net-guard';
import { SNAPSHOT_DIR, safeVaultPath, vaultRoot } from '@/lib/vault/paths';
import { writeTextAtomic } from '@/lib/vault/write';

installNetGuard();

const root = vaultRoot();
const snapshots = path.join(root, SNAPSHOT_DIR);

/** Every file that has snapshots, as vault-relative paths. */
function filesWithSnapshots(dir = snapshots, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  // A snapshot folder is named after the file it holds versions of, so the
  // folder whose children are all files is the file.
  if (entries.length > 0 && entries.every((e) => e.isFile())) {
    out.push(path.relative(snapshots, dir).split(path.sep).join('/'));
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) filesWithSnapshots(path.join(dir, entry.name), out);
  }
  return out;
}

function versionsOf(rel: string): { name: string; full: string; when: Date; bytes: number }[] {
  const dir = path.join(snapshots, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => {
      const full = path.join(dir, name);
      return { name, full, when: fs.statSync(full).mtime, bytes: fs.statSync(full).size };
    })
    .sort((a, b) => b.when.getTime() - a.when.getTime());
}

const [rel, pick] = process.argv.slice(2);

if (!rel) {
  const files = filesWithSnapshots();
  if (files.length === 0) {
    console.log('No snapshots yet. One is taken before every write the app makes.');
    process.exit(0);
  }
  console.log('Files with snapshots:\n');
  for (const file of files) {
    const versions = versionsOf(file);
    const newest = versions[0];
    console.log(
      `  ${file}  —  ${versions.length} ${versions.length === 1 ? 'version' : 'versions'}` +
        (newest ? `, newest ${newest.when.toISOString().slice(0, 16).replace('T', ' ')}` : ''),
    );
  }
  console.log('\nnpm run vault:restore -- <file>   to see them');
  process.exit(0);
}

const versions = versionsOf(rel);
if (versions.length === 0) {
  console.error(`No snapshots for ${rel}.`);
  console.error('npm run vault:restore   lists what does have them.');
  process.exit(1);
}

if (!pick) {
  console.log(`Snapshots of ${rel}, newest first:\n`);
  versions.forEach((version, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}  ${version.when.toISOString().slice(0, 19).replace('T', ' ')}  ${version.bytes} bytes`,
    );
  });
  console.log(`\nnpm run vault:restore -- ${rel} <number>   to put one back`);
  process.exit(0);
}

const index = Number(pick);
const chosen = versions[index - 1];
if (!chosen) {
  console.error(`There is no snapshot ${pick} of ${rel}. There are ${versions.length}.`);
  process.exit(1);
}

const target = safeVaultPath(rel);
const contents = fs.readFileSync(chosen.full, 'utf8');

// Through the normal write path, so what is there now is snapshotted first: a
// restore of the wrong version has to be undoable too.
writeTextAtomic(rel, contents);

console.log(`Restored ${rel} from ${chosen.when.toISOString().slice(0, 19).replace('T', ' ')}.`);
console.log(`The version that was there has been snapshotted, so this is undoable.`);
console.log(`  ${target}`);
