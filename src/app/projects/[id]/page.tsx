import { notFound } from 'next/navigation';
import { getVault } from '@/lib/vault/index';
import { progressOf } from '@/lib/vault/projects';
import { dueLabel, dueTone, shortDate, today } from '@/lib/dates';
import { PhasesCard } from '@/components/projects/PhasesCard';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectLinksCard } from '@/components/projects/ProjectLinksCard';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import {
  Card,
  CardHeader,
  CardRow,
  CategoryPill,
  categoryOf,
  Columns,
  EmptyState,
  ButtonLink,
  Page,
  Pill,
  Row,
  Spacer,
  Stack,
  TaskRow,
  type TaskView,
  Text,
  TextLink,
} from '@/components/ui';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vault = getVault();
  const project = vault.projectsById.get(id);
  if (!project) notFound();

  const now = today();
  const progress = progressOf(project);
  const notes = vault.notesByProject.get(id) ?? [];

  // The roster and the project list, for the edit dialog on each task row: a task
  // on this page can be moved to somebody else or to another project, which is
  // the whole reason those fields are there.
  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  const projects = vault.projects.map((p) => ({ id: p.id, title: p.title }));

  const tasks: TaskView[] = vault.tasks
    .filter((t) => t.projectId === id)
    .sort(
      (a, b) =>
        Number(a.status === 'done') - Number(b.status === 'done') ||
        (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      done: t.status === 'done',
      priority: t.priority,
      dueDate: t.dueDate,
      dueLabel: dueLabel(t.dueDate, now),
      dueTone: dueTone(t.dueDate, t.status === 'done', now),
      personName: t.personSlug ? (vault.peopleBySlug.get(t.personSlug)?.displayName ?? null) : null,
      personSlug: t.personSlug,
      personPhoto: null,
      projectId: t.projectId,
      projectName: project.title,
      kind: t.kind,
    }));

  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <Page>
      <Stack gap={5}>
        <Stack gap={4}>
          <Row gap={2}>
            <ButtonLink href="/projects" variant="ghost" size="sm">
              ← All projects
            </ButtonLink>
          </Row>
          <ProjectHeader
            id={project.id}
            title={project.title}
            description={project.description}
            archived={project.archived}
            openTasks={openTasks}
            notes={notes.length}
          />
        </Stack>

        <Columns
          main={
            <>
              <PhasesCard id={project.id} phases={project.phases} progress={progress} />

              <Card>
                <CardHeader title="Tasks" count={openTasks || undefined} />
                {tasks.map((task) => (
                  // The project is the page, so every row would carry the same
                  // chip. It is the one place the chip is noise.
                  <TaskRow
                    key={task.id}
                    task={task}
                    people={people}
                    projects={projects}
                    showProject={false}
                  />
                ))}
                {tasks.length === 0 ? (
                  <EmptyState glyph={NAV_GLYPH.tasks} {...EMPTY.project.tasks} />
                ) : null}
              </Card>
            </>
          }
          side={
            <>
              <Card>
                <CardHeader title="Notes" count={notes.length || undefined} />
                {notes.map((note) => (
                  <CardRow key={note.path}>
                    <Text level="mono" tone="muted">
                      {note.date ? shortDate(note.date) : '—'}
                    </Text>
                    <TextLink href={`/notes?note=${encodeURIComponent(note.path)}`} truncate>
                      {note.title}
                    </TextLink>
                    <Spacer />
                    {note.draft ? <Pill tone="warning">Draft</Pill> : null}
                    <CategoryPill
                      category={note.category}
                      label={categoryOf(note.category).label}
                    />
                  </CardRow>
                ))}
                {notes.length === 0 ? (
                  <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.project.notes} />
                ) : null}
              </Card>

              <ProjectLinksCard
                id={project.id}
                links={project.links.map((l) => ({
                  label: l.label,
                  url: l.url,
                  host: l.url.replace(/^https?:\/\//i, '').split('/')[0] ?? l.url,
                }))}
              />
            </>
          }
        />
      </Stack>
    </Page>
  );
}
