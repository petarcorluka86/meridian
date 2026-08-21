import { execFileSync } from 'node:child_process';

/**
 * The pixel gate owns 3311 and 3312. A killed or crashed run leaves its dev
 * servers listening on them, and the next run dies with "port is already used"
 * until somebody hunts the processes down by hand — which is a thing that
 * happens often enough to be worth ten lines.
 *
 * Runs before Playwright rather than in its globalSetup: Playwright starts the
 * web servers first, so anything that frees ports there kills the gate's own.
 */
for (const port of [3311, 3312]) {
  let pids = [];
  try {
    pids = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    // lsof exits non-zero when nothing is listening, which is the normal case.
  }
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL');
      console.log(`freed port ${port} (was pid ${pid})`);
    } catch {
      /* already gone */
    }
  }
}
