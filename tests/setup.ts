import os from 'node:os';
import path from 'node:path';

/**
 * No test may read the developer's own `.env`, ever.
 *
 * `loadConfig()` falls back to the file at `envFilePath()` for any key that is
 * not in `process.env` — so a test that deletes `process.env.VAULT_PATH` to
 * check what happens when there is no vault silently gets the real one instead,
 * and every assertion after that is about somebody's actual folder.
 *
 * That is not hypothetical. It emptied a real vault: a reset test deleted
 * VAULT_PATH, `loadConfig()` read `~/meridian/vault` out of the app's `.env`,
 * and the guards in `lib/vault/reset.ts` correctly decided it was a perfectly
 * good vault to empty. The guards were right; the environment was a lie.
 *
 * `MERIDIAN_ENV_PATH` already exists for this, and `lib/env.ts` says so. This
 * points it at a path that cannot exist, so the fallback has nothing to find and
 * a test must be explicit about every value it depends on.
 */
process.env.MERIDIAN_ENV_PATH = path.join(os.tmpdir(), 'meridian-tests-no-such-env');
