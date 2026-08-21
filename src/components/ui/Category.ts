/**
 * The six note categories. Data only — the colours live in the category palette
 * in `tokens.css` and are applied by `CategoryPill`, so recolouring a category
 * is one edit in the same file as every other colour decision.
 */
export const CATEGORIES = [
  { value: '1on1', label: '1:1' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'incident', label: 'Incident' },
  { value: 'planning', label: 'Planning' },
  { value: 'idea', label: 'Idea' },
  { value: 'generic', label: 'Generic' },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]['value'];

/** An unknown category reads as Generic rather than throwing or inventing a colour. */
export function categoryOf(value: string) {
  return CATEGORIES.find((category) => category.value === value) ?? CATEGORIES[5];
}
