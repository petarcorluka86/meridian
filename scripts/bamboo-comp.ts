/** Fetch compensation history for the current roster. */
import { installNetGuard } from '../src/lib/net-guard.js';
installNetGuard();

import { syncBambooCompensation } from '../src/lib/sources/bamboohr.js';

const result = await syncBambooCompensation();
console.log(`Compensation for ${result.people} people · ${result.rows} rows.`);
