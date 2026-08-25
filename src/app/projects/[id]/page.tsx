import { notFound } from 'next/navigation';
import { getVault } from '@/lib/vault/index';
import { progressOf } from '@/lib/vault/projects';
import { dueLabel, dueTone, today } from '@/lib/dates';
import { PhasesCard } from '@/components/projects/PhasesCard';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectLinksCard } from '@/components/projects/ProjectLinksCard';
import { ProjectNotesCard } from '@/components/projects/ProjectNotesCard';
import { ProjectTasksCard } from '@/components/projects/ProjectTasksCard';
import { Columns, ButtonLink, Page, Row, Stack, type TaskView } from '@/components/ui';

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

              <ProjectTasksCard
                id={project.id}
                tasks={tasks}
                people={people}
                projects={projects}
                openTasks={openTasks}
              />
            </>
          }
          side={
            <>
              <ProjectNotesCard
                id={project.id}
                notes={notes.map((note) => ({
                  path: note.path,
                  title: note.title,
                  date: note.date,
                  draft: note.draft,
                  category: note.category,
                }))}
              />

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
