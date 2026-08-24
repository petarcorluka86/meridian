'use client';

import { useState } from 'react';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import { Card, EmptyState, Segment, Segmented, Stack } from '@/components/ui';
import { ProjectCard, type ProjectCardView } from './ProjectCard';

/**
 * The list, and the one switch on it.
 *
 * Active and archived are this screen's own state rather than a URL parameter,
 * the way the Overview tasks card holds its priority filter: there are exactly
 * two of them, both lists are already on the page, and neither is a view
 * somebody needs to link to or come back to. A reload lands on Active, which is
 * the right place to land.
 *
 * Both arrays arrive from the server component already shaped — the switch only
 * chooses which one to draw, so pressing it costs nothing.
 */
export function ProjectList({
  active,
  archived,
}: {
  active: ProjectCardView[];
  archived: ProjectCardView[];
}) {
  const [show, setShow] = useState<'active' | 'archived'>('active');
  const shown = show === 'archived' ? archived : active;

  return (
    <Stack gap={4}>
      <Segmented label="Which projects">
        <Segment selected={show === 'active'} onClick={() => setShow('active')}>
          Active · {active.length}
        </Segment>
        <Segment selected={show === 'archived'} onClick={() => setShow('archived')}>
          Archived · {archived.length}
        </Segment>
      </Segmented>

      <Stack gap={3}>
        {shown.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {shown.length === 0 ? (
          <Card>
            <EmptyState
              glyph={NAV_GLYPH.projects}
              {...(show === 'archived'
                ? EMPTY.projects.archived
                : // Having archived every project is not the same as having none,
                  // and saying "No projects yet" over three of them would be the
                  // opposite of true.
                  archived.length
                  ? EMPTY.projects.allArchived
                  : EMPTY.projects.none)}
            />
          </Card>
        ) : null}
      </Stack>
    </Stack>
  );
}
