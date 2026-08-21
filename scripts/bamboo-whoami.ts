/**
 * Finds the employee id BambooHR knows you by, so BAMBOOHR_MANAGER_EMPLOYEE_ID
 * can be filled in with something verified rather than guessed from a URL.
 *
 * Needs only BAMBOOHR_SUBDOMAIN and BAMBOOHR_API_KEY in .env. Prints nothing
 * secret — the key never leaves this process.
 *
 * Usage: npm run bamboo:whoami -- <part of your name or email>
 */
import { rawEnv, bambooSubdomainOf } from '../src/lib/env.js';
import { installNetGuard } from '../src/lib/net-guard.js';

installNetGuard();

const subdomain = bambooSubdomainOf(rawEnv('BAMBOOHR_SUBDOMAIN'));
const apiKey = rawEnv('BAMBOOHR_API_KEY');

if (!subdomain || !apiKey) {
  console.error('Set BAMBOOHR_SUBDOMAIN and BAMBOOHR_API_KEY in .env first.');
  console.error('(BAMBOOHR_MANAGER_EMPLOYEE_ID is what this script is for — leave it blank.)');
  process.exit(2);
}

const auth = `Basic ${Buffer.from(`${apiKey}:x`).toString('base64')}`;

type Directory = { employees?: Record<string, unknown>[] };

async function get(
  endpoint: string,
): Promise<{ ok: true; body: Directory } | { ok: false; status: number }> {
  const url = `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1/${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: auth },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, body: (await response.json()) as Directory };
}

type Employee = {
  id: string;
  displayName: string;
  workEmail: string;
  jobTitle: string;
  supervisorId: string;
  supervisor: string;
};

const directory = await get('employees/directory');
if (!directory.ok) {
  if (directory.status === 401) {
    console.error('BambooHR rejected the API key. Check BAMBOOHR_API_KEY.');
  } else if (directory.status === 403) {
    console.error('BambooHR refused the employee directory (403).');
    console.error('The key is valid but your BambooHR account cannot read the directory.');
    console.error('Ask whoever administers BambooHR to enable directory access for your user.');
  } else {
    console.error(`BambooHR returned ${directory.status} for the employee directory.`);
    console.error(
      `Check that BAMBOOHR_SUBDOMAIN is the bare company name — resolved to "${subdomain}".`,
    );
  }
  process.exit(1);
}

const employees: Employee[] = (directory.body.employees ?? []).map(
  (e: Record<string, unknown>) => ({
    id: String(e.id ?? ''),
    displayName: String(e.displayName ?? [e.firstName, e.lastName].filter(Boolean).join(' ')),
    workEmail: String(e.workEmail ?? ''),
    jobTitle: String(e.jobTitle ?? ''),
    supervisorId: e.supervisorId == null ? '' : String(e.supervisorId),
    supervisor: String(e.supervisor ?? ''),
  }),
);

console.log(`\n${employees.length} people in the directory.\n`);

const wanted = (process.argv[2] ?? '').toLowerCase();
const matches = wanted
  ? employees.filter(
      (e) =>
        e.displayName.toLowerCase().includes(wanted) || e.workEmail.toLowerCase().includes(wanted),
    )
  : // With no argument, show whoever actually has people reporting to them.
    employees.filter((e) => employees.some((o) => o.supervisorId === e.id));

if (matches.length === 0) {
  console.log(`Nobody matched "${process.argv[2]}".`);
  console.log('Run without an argument to list everyone who has direct reports.');
  process.exit(1);
}

for (const person of matches.slice(0, 30)) {
  const reports = employees.filter((e) => e.supervisorId === person.id);
  console.log(`  employeeId ${person.id.padEnd(6)} ${person.displayName}  <${person.workEmail}>`);
  console.log(`             ${person.jobTitle || '—'}`);
  console.log(
    `             ${reports.length} ${reports.length === 1 ? 'person reports' : 'people report'} to this id` +
      (reports.length ? `: ${reports.map((r) => r.displayName).join(', ')}` : ''),
  );
  console.log('');
}

console.log('Put the id whose reports look right into .env:');
console.log('  BAMBOOHR_MANAGER_EMPLOYEE_ID=<id>');
