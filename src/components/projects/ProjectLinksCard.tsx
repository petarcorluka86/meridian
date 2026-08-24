'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addProjectLinkAction, removeProjectLinkAction } from '@/app/projects/actions';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { EMPTY } from '@/copy/empty';
import {
  AddIcon,
  Button,
  Card,
  CardFooter,
  CardHeader,
  CardRow,
  EmptyState,
  RemoveIcon,
  Spacer,
  Text,
  TextInput,
  TextLink,
} from '@/components/ui';
import styles from './Projects.module.css';

export type ProjectLink = { label: string; url: string; host: string };

/**
 * The design doc, the tracking board, the dashboard you keep reopening.
 *
 * The same card a person has, and deliberately so — the shape of "a label and a
 * URL" does not change because the thing it hangs off is a project. It differs in
 * one thing only: a project's links live inside its record in `projects.json`,
 * because a project has no folder of its own to keep a `links.json` in.
 */
export function ProjectLinksCard({ id, links }: { id: string; links: ProjectLink[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const result = await addProjectLinkAction(id, label, url);
      if (result.ok) {
        setLabel('');
        setUrl('');
        setAdding(false);
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });

  return (
    <Card>
      <CardHeader
        title="Links"
        count={links.length || undefined}
        end={
          <Button
            size="sm"
            icon={adding ? undefined : <AddIcon />}
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? 'Cancel' : 'Add link'}
          </Button>
        }
      />

      {links.map((link, index) => (
        <CardRow key={`${link.url}-${link.label}`}>
          <TextLink href={link.url} external>
            {link.label}
          </TextLink>
          <Text level="mono" tone="muted" truncate>
            {link.host}
          </Text>
          <Spacer />
          <Button
            iconOnly
            size="sm"
            icon={<RemoveIcon />}
            onClick={() =>
              startTransition(async () => {
                await removeProjectLinkAction(id, index);
                router.refresh();
              })
            }
            ariaLabel={`Remove ${link.label}`}
          />
        </CardRow>
      ))}

      {links.length === 0 && !adding ? (
        <EmptyState glyph={EMPTY_GLYPH.link} {...EMPTY.project.links} />
      ) : null}

      {adding ? (
        <CardFooter>
          <span className={styles.narrow}>
            <TextInput
              value={label}
              onChange={setLabel}
              placeholder="Label"
              ariaLabel="Link label"
            />
          </span>
          <span className={styles.grow}>
            <TextInput
              value={url}
              onChange={setUrl}
              placeholder="https://…"
              ariaLabel="Link URL"
              onKeyDown={(event) => {
                if (event.key === 'Enter') add();
              }}
            />
          </span>
          <Button variant="primary" onClick={add} pending={pending} icon={<AddIcon />}>
            Add
          </Button>
          {error ? (
            <Text level="small" tone="danger">
              {error}
            </Text>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
