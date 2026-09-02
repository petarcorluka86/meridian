import { getVault } from '@/lib/vault/index';
import { progressOf } from '@/lib/vault/projects';
import { NewProject } from '@/components/projects/NewProject';
import type { ProjectCardView } from '@/components/projects/ProjectCard';
import { ProjectList } from '@/components/projects/ProjectList';
import { Page, PageHeader } from '@/components/ui';

export default async function ProjectsPage() {
  const vault = getVault();

  const view = (project: (typeof vault.projects)[number]): ProjectCardView => {
    const progress = progressOf(project, vault.tasks);
    const openTasks = vault.tasks.filter(
      (t) => t.projectId === project.id && t.status !== 'done',
    ).length;
    const notes = vault.notesByProject.get(project.id)?.length ?? 0;
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      archived: project.archived,
      progress,
      // The first phase still open is the only one worth naming on a card: it is
      // the answer to "what happens next", which a percentage does not give.
      nextPhase: progress.complete
        ? null
        : (project.phases.find((phase) => !phase.done)?.label ?? null),
      openTasks,
      notes,
    };
  };

  const active = vault.projects.filter((p) => !p.archived).map(view);
  const archived = vault.projects.filter((p) => p.archived).map(view);

  // A count, and how many are done. "0 of 3 finished" is a worse line than no
  // line at all: it reports the ordinary case as a shortfall.
  const finished = active.filter((p) => p.progress.complete).length;
  const subtitle = active.length
    ? `${active.length} ${active.length === 1 ? 'project' : 'projects'}${
        finished ? ` · ${finished} finished` : ''
      }`
    : 'No active projects';

  return (
    <Page width="narrow">
      <PageHeader title="Projects" subtitle={subtitle} end={<NewProject />} />
      <ProjectList active={active} archived={archived} />
    </Page>
  );
}
