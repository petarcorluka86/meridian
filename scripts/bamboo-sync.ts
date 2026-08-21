/** One-shot roster sync, so the first run can be checked outside the UI. */
import { syncBamboo } from '../src/lib/sources/bamboohr.js';
import { installNetGuard } from '../src/lib/net-guard.js';

installNetGuard();

const result = await syncBamboo();
console.log(`Synced ${result.people} people.`);
if (result.warning) console.log(`Warning: ${result.warning}`);
