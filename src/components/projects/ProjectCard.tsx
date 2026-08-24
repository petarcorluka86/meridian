import type { Progress } from '@/lib/vault/projects';
import { CardBody, CardLink, Meter, Pill, Row, Spacer, Stack, Text } from '@/components/ui';

export type ProjectCardView = {
  id: string;
  title: string;
  description: string;
  archived: boolean;
  progress: Progress;
  /** The first phase still open, which is the card's answer to "what next". */
  nextPhase: string | null;
  openTasks: number;
  notes: number;
};

function counts(openTasks: number, notes: number): string {
  const tasks = openTasks
    ? `${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'}`
    : 'No open tasks';
  return `${tasks} · ${notes ? `${notes} ${notes === 1 ? 'note' : 'notes'}` : 'no notes'}`;
}

/**
 * One project in the list. The whole card is the link, because there is nothing
 * else on it to press — everything that changes a project happens on its own
 * page.
 *
 * The bar and the "3 of 5 phases" pill say the same thing twice on purpose: the
 * pill is the number you can quote, the bar is the one you can see. A project
 * with no phases gets neither, and is not pretending to have progress it has no
 * way to measure.
 */
export function ProjectCard({ project }: { project: ProjectCardView }) {
  const { progress } = project;

  return (
    <CardLink href={`/projects/${project.id}`}>
      <CardBody>
        <Stack gap={3}>
          <Row gap={2}>
            <Text level="subheading" tone={project.archived ? 'muted' : 'strong'}>
              {project.title}
            </Text>
            {project.archived ? <Pill>Archived</Pill> : null}
            <Spacer />
            {progress.total > 0 ? (
              <>
                <Text level="small" tone="muted">
                  {progress.done} of {progress.total} phases
                </Text>
                <Pill tone={progress.complete ? 'success' : 'info'}>{progress.percent}%</Pill>
              </>
            ) : null}
          </Row>

          {project.description ? (
            <Text level="small" tone="muted">
              {project.description}
            </Text>
          ) : null}

          {progress.total > 0 ? (
            <Stack gap={2}>
              <Meter
                value={progress.done}
                total={progress.total}
                tone={progress.complete ? 'success' : 'accent'}
                label={`Phases done on ${project.title}`}
              />
              {/* Branched on the value rather than on `complete`, so a project
                  that is somehow neither draws no line instead of "Next: null". */}
              {progress.complete ? (
                <Text level="small" tone="success">
                  All phases done
                </Text>
              ) : project.nextPhase ? (
                <Text level="small" tone="muted">
                  Next: {project.nextPhase}
                </Text>
              ) : null}
            </Stack>
          ) : null}

          <Text level="small" tone="faint">
            {counts(project.openTasks, project.notes)}
          </Text>
        </Stack>
      </CardBody>
    </CardLink>
  );
}
