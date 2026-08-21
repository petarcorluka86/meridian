'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addLinkAction, removeLinkAction } from '@/app/people/actions';
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
import styles from './Person.module.css';

export type LinkView = { label: string; url: string; host: string };

export function LinksCard({ slug, links }: { slug: string; links: LinkView[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const result = await addLinkAction(slug, label, url);
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
          // Cancel carries no glyph — it is the way out, and one there would
          // compete with the way forward.
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
                await removeLinkAction(slug, index);
                router.refresh();
              })
            }
            ariaLabel={`Remove ${link.label}`}
          />
        </CardRow>
      ))}

      {/* No button of its own: Add link is already in the header, and a second
          one in the middle of the card competes with it. */}
      {links.length === 0 && !adding ? (
        <EmptyState glyph={EMPTY_GLYPH.link} {...EMPTY.person.links} />
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
