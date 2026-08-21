/** Ad-hoc screenshot for eyeballing a page during development. */
import { chromium } from '@playwright/test';
const [, , url, out, sel] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await (sel ? p.locator(sel) : p).screenshot({ path: out });
await b.close();
console.log('wrote', out);
