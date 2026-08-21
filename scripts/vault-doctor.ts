/**
 * Validates every file in the vault against its schema and reports what the app
 * would refuse to load. Same code path as the index, so what this says is exactly
 * what the screens will say.
 */
import { buildSnapshot } from '../src/lib/vault/index.js';
import { loadConfig } from '../src/lib/env.js';

const config = loadConfig();
if (!config.vaultPath) {
  console.error('VAULT_PATH is not set. Point it at a folder in .env and try again.');
  process.exit(2);
}

console.log(`vault: ${config.vaultPath}`);
if (config.envModeWarning) console.warn(`warning: ${config.envModeWarning}`);

// A file the app cannot read is a problem this reports, not a crash. Reaching
// here means the folder itself is gone or shut, which is a different sentence.
let vault: ReturnType<typeof buildSnapshot>;
try {
  vault = buildSnapshot();
} catch (err) {
  console.error(`\nThe vault could not be read at all — ${(err as Error).message}`);
  console.error(`Check that ${config.vaultPath} exists and is readable, then run this again.`);
  process.exit(2);
}

console.log(
  [
    `${vault.people.length} people`,
    `${vault.notes.length} notes`,
    `${vault.tasks.length} tasks`,
    `${vault.time.length} time entries`,
  ].join(' · '),
);

if (vault.problems.length === 0) {
  console.log('\nNo problems found.');
  process.exit(0);
}

console.log(`\n${vault.problems.length} problem${vault.problems.length === 1 ? '' : 's'}:\n`);
for (const problem of vault.problems) {
  console.log(`  ${problem.path}\n    ${problem.message}`);
}
process.exit(1);
