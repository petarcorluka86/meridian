'use client';

import { useRouter } from 'next/navigation';
import { CATEGORIES, Row, Select, Stack, Toggle } from '@/components/ui';

type Props = {
  people: { slug: string; name: string }[];
  person: string;
  category: string;
  draftsOnly: boolean;
};

export function NoteFilters({ people, person, category, draftsOnly }: Props) {
  const router = useRouter();

  const go = (next: Partial<{ person: string; cat: string; drafts: boolean }>) => {
    const params = new URLSearchParams();
    const p = next.person ?? person;
    const c = next.cat ?? category;
    const d = next.drafts ?? draftsOnly;
    if (p !== 'all') params.set('person', p);
    if (c !== 'all') params.set('cat', c);
    if (d) params.set('drafts', '1');
    const q = params.toString();
    // Filters persist across pages by living in the URL, and dropping the selected
    // note is deliberate: it may not be in the filtered list any more.
    router.push(q ? `/notes?${q}` : '/notes', { scroll: false });
  };

  return (
    <Stack gap={3}>
      <Row gap={2}>
        <Select
          size="sm"
          value={person}
          onChange={(value) => go({ person: value })}
          ariaLabel="Filter by person"
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'general', label: 'General only' },
            { value: 'inbox', label: 'Inbox' },
            ...people.map((p) => ({ value: p.slug, label: p.name })),
          ]}
        />
        <Select
          size="sm"
          value={category}
          onChange={(value) => go({ cat: value })}
          ariaLabel="Filter by category"
          options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
      </Row>
      <Row gap={2} justify="end">
        <Toggle
          checked={draftsOnly}
          onChange={(checked) => go({ drafts: checked })}
          label="Drafts only"
        />
      </Row>
    </Stack>
  );
}
