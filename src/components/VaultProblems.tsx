import { PROBLEMS } from '@/copy/problems';
import { getVault } from '@/lib/vault/index';
import { Banner, Code, Stack, Text } from '@/components/ui';
import styles from './Shell.module.css';

/**
 * Every file the app could not read, on every screen, until it is fixed.
 *
 * `problems[]` has been collected since the first commit and was read by nothing
 * but the CLI and the MCP server. In the interface a corrupt `entries.json`
 * rendered as "BambooHR returned nobody reporting to you. Check
 * BAMBOOHR_MANAGER_EMPLOYEE_ID." — sending somebody to fix a setting that was
 * never wrong, about data that was never gone.
 *
 * In the shell rather than per screen, because the file that will not parse is
 * rarely on the screen you happen to be looking at.
 */
export function VaultProblems() {
  let problems: { path: string; message: string }[] = [];
  try {
    problems = getVault().problems;
  } catch {
    // A vault that cannot be indexed at all is the setup panel's business.
    return null;
  }
  if (problems.length === 0) return null;

  return (
    <div className={styles.aboveScreen}>
      <Banner
        tone="warning"
        title={problems.length === 1 ? PROBLEMS.one : PROBLEMS.many(problems.length)}
        description={PROBLEMS.reassurance}
      >
        <Stack gap={1}>
          {problems.slice(0, 8).map((problem) => (
            <Text key={`${problem.path}-${problem.message}`} level="small">
              <Code>{problem.path}</Code> — {problem.message}
            </Text>
          ))}
          {problems.length > 8 ? <Text level="small">…and {problems.length - 8} more.</Text> : null}
          <Text level="small">{PROBLEMS.action}</Text>
        </Stack>
      </Banner>
    </div>
  );
}
