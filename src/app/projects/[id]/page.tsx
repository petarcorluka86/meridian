import { notFound } from 'next/navigation';
import { getVault } from '@/lib/vault/index';
import { progressOf, taskProgressByPhase } from '@/lib/vault/projects';
import { photoPath } from '@/lib/sources/cache';
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
  const projects = vault.projects.map((p) => ({
    id: p.id,
    title: p.title,
    phases: p.phases.map((ph) => ({ id: ph.id, label: ph.label })),
  }));

  // Soonest due first, and a done task keeps its place — it is struck through
  // and greyed where it is, not moved to the bottom, so the list keeps the
  // shape you learned while working through it.
  const tasks: TaskView[] = vault.tasks
    .filter((t) => t.projectId === id)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
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
      personPhoto: t.personSlug ? photoPath(t.personSlug) : null,
      projectId: t.projectId,
      projectName: project.title,
      phaseId: t.phaseId,
      phaseName: t.phaseId
        ? (project.phases.find((ph) => ph.id === t.phaseId)?.label ?? null)
        : null,
      kind: t.kind,
    }));

  const openTasks = tasks.filter((t) => !t.done).length;

  // Filed means the phase actually exists on the project — a task whose phase
  // is gone falls back to Uncategorized rather than vanishing from both cards.
  const filed = (t: TaskView) => t.phaseId !== null && t.phaseName !== null;
  const tasksByPhase: Record<string, TaskView[]> = {};
  for (const t of tasks.filter(filed)) {
    const key = t.phaseId as string;
    tasksByPhase[key] = [...(tasksByPhase[key] ?? []), t];
  }
  const unfiled = tasks.filter((t) => !filed(t));

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
            <PhasesCard
              id={project.id}
              phases={project.phases}
              progress={progress}
              taskProgress={taskProgressByPhase(
                project,
                vault.tasks.filter((t) => t.projectId === id),
              )}
              tasks={tasksByPhase}
              people={people}
              projects={projects}
            />
          }
          side={
            <>
              {/* First in the narrow column: unlike notes and links it is open
                  work, and the way into it — the pencil that files a task under
                  a phase — should not sit below the fold. */}
              <ProjectTasksCard
                id={project.id}
                tasks={unfiled}
                people={people}
                projects={projects}
                openTasks={unfiled.filter((t) => !t.done).length}
                totalTasks={tasks.length}
              />

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
