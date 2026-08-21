/** Refresh approvals and presence on the short window, outside the UI. */
import { installNetGuard } from '../src/lib/net-guard.js';
installNetGuard();

import { syncBambooInbox } from '../src/lib/sources/bamboohr.js';

const r = await syncBambooInbox();
console.log(`${r.pending} pending · ${r.away} away · ${r.wfh} from home`);
