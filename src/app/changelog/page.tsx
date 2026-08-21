import {
  changedFiles,
  fileDiffs,
  upstream,
  isFirstPush,
  recentCommits,
  repoState,
  unpushedCount,
  type DiffRow,
} from '@/lib/git';
import { ChangelogActions } from '@/components/changelog/ChangelogActions';
import { EMPTY } from '@/copy/empty';
import {
  Card,
  CardGroup,
  CardHeader,
  CardRow,
  EmptyState,
  Icon,
  NavItem,
  NavList,
  Page,
  PageHeader,
  Pill,
  Row,
  Segment,
  Segmented,
  Spacer,
  Stack,
  Text,
} from '@/components/ui';
import styles from '@/components/changelog/Changelog.module.css';

const FileGlyph = () => (
  <Icon tone="muted">
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
  </Icon>
);

const SideIcon = () => (
  <Icon size="sm">
    <rect x="3" y="5" width="7.5" height="14" rx="1.5" />
    <rect x="13.5" y="5" width="7.5" height="14" rx="1.5" />
  </Icon>
);

const UnifiedIcon = () => (
  <Icon size="sm">
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
);

function SideRow({ row }: { row: DiffRow }) {
  const left =
    row.kind === 'ctx'
      ? { num: row.line, mark: ' ', text: row.text, cell: styles.cell, markCls: styles.mark }
      : row.kind === 'chg'
        ? {
            num: row.line,
            mark: '−',
            text: row.before,
            cell: styles.cellDel,
            markCls: styles.markDel,
          }
        : row.kind === 'del'
          ? {
              num: row.line,
              mark: '−',
              text: row.text,
              cell: styles.cellDel,
              markCls: styles.markDel,
            }
          : { num: '', mark: ' ', text: '', cell: styles.cellEmpty, markCls: styles.markEmpty };

  const right =
    row.kind === 'ctx'
      ? { num: row.line, mark: ' ', text: row.text, cell: styles.cell, markCls: styles.mark }
      : row.kind === 'chg'
        ? {
            num: row.line,
            mark: '+',
            text: row.after,
            cell: styles.cellAdd,
            markCls: styles.markAdd,
          }
        : row.kind === 'add'
          ? {
              num: row.line,
              mark: '+',
              text: row.text,
              cell: styles.cellAdd,
              markCls: styles.markAdd,
            }
          : { num: '', mark: ' ', text: '', cell: styles.cellEmpty, markCls: styles.markEmpty };

  return (
    <span className={styles.row}>
      <span className={styles.half}>
        <span className={styles.num}>{left.num}</span>
        <span className={left.markCls}>{left.mark}</span>
        <span className={left.cell}>{left.text}</span>
      </span>
      <span className={styles.gutter} />
      <span className={styles.half}>
        <span className={styles.num}>{right.num}</span>
        <span className={right.markCls}>{right.mark}</span>
        <span className={right.cell}>{right.text}</span>
      </span>
    </span>
  );
}

function UnifiedRows({ row }: { row: DiffRow }) {
  // CSS-module lookups widen to string | undefined under noUncheckedIndexedAccess.
  const line = (
    num: number,
    sign: string,
    text: string,
    cell: string | undefined,
    markCls: string | undefined,
    key: string,
  ) => (
    <span className={styles.row} key={key}>
      <span className={styles.num}>{num}</span>
      <span className={markCls}>{sign}</span>
      <span className={cell}>{text}</span>
    </span>
  );

  if (row.kind === 'ctx') return line(row.line, ' ', row.text, styles.cell, styles.mark, 'c');
  if (row.kind === 'add') return line(row.line, '+', row.text, styles.cellAdd, styles.markAdd, 'a');
  if (row.kind === 'del') return line(row.line, '−', row.text, styles.cellDel, styles.markDel, 'd');
  return (
    <>
      {line(row.line, '−', row.before, styles.cellDel, styles.markDel, 'd')}
      {line(row.line, '+', row.after, styles.cellAdd, styles.markAdd, 'a')}
    </>
  );
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; file?: string }>;
}) {
  const { mode = 'side', file = 'all' } = await searchParams;
  const unified = mode === 'unified';

  const repo = await repoState();
  if (repo.kind !== 'ok') {
    return (
      <Page>
        <PageHeader
          title="Changelog"
          subtitle={
            repo.kind === 'not-a-repo'
              ? 'The vault is not a git repository yet'
              : 'The vault sits inside another repository'
          }
        />
        <Card>
          <EmptyState size="lg" standalone>
            {repo.kind === 'not-a-repo'
              ? 'Run git init in the vault folder to start tracking history. Everything else keeps working without it.'
              : `The vault resolves to the repository at ${repo.toplevel}. Committing from here would sweep up files outside the vault, so saving is disabled until the vault is its own repository.`}
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const files = await changedFiles();
  const diffs = await fileDiffs(files);
  const shown = file === 'all' ? diffs : diffs.filter((d) => d.path === file);
  const [unpushed, tracking, firstPush, commits] = await Promise.all([
    unpushedCount(),
    upstream(),
    isFirstPush(),
    recentCommits(8),
  ]);

  const subtitle =
    files.length > 0
      ? `${files.length} ${files.length === 1 ? 'file' : 'files'} changed since last commit`
      : unpushed > 0
        ? `${unpushed} ${unpushed === 1 ? 'commit' : 'commits'} ready to push`
        : tracking
          ? `Everything is pushed to ${tracking.remote}/${tracking.branch}`
          : EMPTY.changelog.noRemote;

  const href = (next: { mode?: string; file?: string }) => {
    const params = new URLSearchParams();
    const m = next.mode ?? mode;
    const f = next.file ?? file;
    if (m !== 'side') params.set('mode', m);
    if (f !== 'all') params.set('file', f);
    const q = params.toString();
    return q ? `/changelog?${q}` : '/changelog';
  };

  const statusTone = (status: string) =>
    status === 'added' ? 'success' : status === 'deleted' ? 'danger' : 'info';
  const statusDot = (status: string) =>
    status === 'added'
      ? styles.dotAdded
      : status === 'deleted'
        ? styles.dotDeleted
        : styles.dotChanged;

  return (
    <Page>
      <PageHeader
        title="Changelog"
        subtitle={subtitle}
        end={
          <>
            <Segmented label="Diff mode">
              <Segment href={href({ mode: 'side' })} selected={!unified}>
                <SideIcon />
                Side by side
              </Segment>
              <Segment href={href({ mode: 'unified' })} selected={unified}>
                <UnifiedIcon />
                Unified
              </Segment>
            </Segmented>
            <ChangelogActions
              canCommit={files.length > 0}
              canPush={unpushed > 0 && tracking !== null}
              neverPushed={firstPush}
              upstream={tracking}
            />
          </>
        }
      />

      <div className={styles.columns}>
        <div className={styles.fileCol}>
          <Card>
            <CardGroup label="Changed files" />
            <NavList label="Changed files">
              <NavItem href={href({ file: 'all' })} label="All files" selected={file === 'all'} />
              {diffs.map((d) => {
                const dir = d.path.split('/').slice(0, -1).join('/');
                return (
                  <NavItem
                    key={d.path}
                    href={href({ file: d.path })}
                    selected={file === d.path}
                    icon={<span className={statusDot(d.status)} />}
                    label={
                      <Stack gap={0}>
                        <Text level="label" tone="strong" truncate>
                          {d.path.split('/').pop()}
                        </Text>
                        {dir ? (
                          <Text level="mono" tone="faint" truncate>
                            {dir}
                          </Text>
                        ) : null}
                      </Stack>
                    }
                  />
                );
              })}
            </NavList>
          </Card>
        </div>

        <div className={styles.diffCol}>
          {shown.map((d) => (
            <Card key={d.path}>
              <CardHeader
                title={
                  <Row gap={2}>
                    <FileGlyph />
                    <Text level="mono" tone="faint">
                      {d.path.split('/').slice(0, -1).join('/')}
                      {d.path.includes('/') ? '/' : ''}
                    </Text>
                    <Text level="label" tone="strong">
                      {d.path.split('/').pop()}
                    </Text>
                    <Pill tone={statusTone(d.status)}>
                      {d.status === 'added'
                        ? 'Added'
                        : d.status === 'deleted'
                          ? 'Deleted'
                          : 'Changed'}
                    </Pill>
                  </Row>
                }
                end={
                  <>
                    <Text level="mono" tone="success">
                      +{d.additions}
                    </Text>
                    <Text level="mono" tone="danger">
                      {'−'}
                      {d.deletions}
                    </Text>
                    <Text level="mono" tone="faint">
                      {d.hunk}
                    </Text>
                  </>
                }
              />
              {d.rows.map((row, i) =>
                // biome-ignore lint/suspicious/noArrayIndexKey: a diff line is defined by its position in the hunk
                unified ? <UnifiedRows key={i} row={row} /> : <SideRow key={i} row={row} />,
              )}
            </Card>
          ))}
          {files.length === 0 ? (
            <Card>
              <EmptyState size="lg" standalone>
                Nothing left to commit. The vault matches the last commit.
              </EmptyState>
            </Card>
          ) : null}

          <div data-history>
            <Card>
              <CardGroup label="History" />
              {commits.map((commit) => (
                <CardRow key={commit.hash}>
                  <Text level="mono" tone="faint">
                    {commit.hash}
                  </Text>
                  <Text level="small">{commit.message}</Text>
                  <Spacer />
                  <Text level="small" tone="muted">
                    {commit.when}
                  </Text>
                  {/* A local-only commit is the normal state, not a warning. */}
                  <Pill tone={commit.pushed ? 'success' : 'warning'}>
                    {commit.pushed ? 'pushed' : 'local only'}
                  </Pill>
                </CardRow>
              ))}
              {commits.length === 0 ? <EmptyState>{EMPTY.changelog.noCommits}</EmptyState> : null}
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}
