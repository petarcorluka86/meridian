/** Pull requests waiting on review, into .cache/github.json. */
import { installNetGuard } from '../src/lib/net-guard.js';
installNetGuard();

import { getVault } from '../src/lib/vault/index.js';
import { githubLoginToSlug, syncGithub } from '../src/lib/sources/github.js';

try {
  const result = await syncGithub(githubLoginToSlug(getVault().links));
  console.log(`${result.pullRequests} pull requests waiting on you.`);
  for (const warning of result.warnings) console.warn(`  warning: ${warning}`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
