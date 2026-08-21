import type { EmptyTone } from '@/copy/empty';
import styles from './EmptyState.module.css';
import { Icon } from './Icon';
import { IconTile } from './IconTile';
import { Stack } from './Layout';
import { Text } from './Text';

/**
 * What a card says when it has nothing to show.
 *
 * Three parts and no fourth: the card's own icon on a tinted tile, a title
 * naming what is missing, and one line saying why filling it is worth doing —
 * or, when empty is good news, saying so and staying quiet.
 *
 * The words and the tone always come from `src/copy/empty.ts`, never from the
 * call site, so an entry spreads in whole: `{...EMPTY.tasks.allDone}`. Two
 * screens describing the same emptiness differently is how somebody learns to
 * distrust both.
 *
 * It carries no button. Every empty surface in this app sits in a card that
 * already has the control — Add link, Edit, the field at the top — and a second
 * one in the middle of the card competes with it. An empty state is a sentence,
 * not a step.
 *
 * An unreadable file is not an empty state — it is the opposite claim, and it
 * gets a `Banner` naming the file. Rendering "No tasks yet" over a `tasks.json`
 * the app cannot parse sends somebody to add a task on top of data they still
 * have and cannot see.
 */
export function EmptyState({
  glyph,
  title,
  body,
  tone = 'neutral',
  standalone,
}: {
  /** The card's own icon, as geometry: `NAV_GLYPH`, `OVERVIEW_GLYPH`, `EMPTY_GLYPH`. */
  glyph: React.ReactNode;
  title: string;
  body: React.ReactNode;
  tone?: EmptyTone;
  /** Nothing above it to be separated from, so no hairline. */
  standalone?: boolean;
}) {
  return (
    <div className={styles.empty} data-standalone={standalone || undefined}>
      <Stack gap={4} align="center">
        <IconTile size="lg" tone={tone}>
          <Icon size="xl">{glyph}</Icon>
        </IconTile>
        {/* The title and its reason are one thought, so they sit closer than the
            tile sits to either. */}
        <Stack gap={2} align="center">
          <Text level="subheading" tone="strong">
            {title}
          </Text>
          <div className={styles.copy}>
            <Text level="small" tone="muted">
              {body}
            </Text>
          </div>
        </Stack>
      </Stack>
    </div>
  );
}
