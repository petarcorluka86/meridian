/**
 * Pulls the calendar into .cache/calendar.json, by hand.
 *
 * The app does this by itself when the freshness window expires; this exists for
 * forcing a refresh or seeing the error message. The token exchange it performs
 * is the same one the server does — src/lib/sources/calendar.ts — rather than a
 * second copy of it.
 */
import { installNetGuard } from '../src/lib/net-guard.js';
import { TOKEN_ENDPOINT } from '../src/lib/sources/calendar.js';

installNetGuard({ allowPostTo: [TOKEN_ENDPOINT] });

import { loadConfig } from '../src/lib/env.js';
import { syncCalendar } from '../src/lib/sources/calendar.js';

if (!loadConfig().calendar) {
  console.error(
    'Calendar is not connected. Set either CALENDAR_ICAL_ADDRESS or the GOOGLE_ keys in .env.',
  );
  process.exit(2);
}

try {
  const { events } = await syncCalendar();
  console.log(`${events} events cached.`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
