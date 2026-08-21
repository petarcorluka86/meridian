'use client';

import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui/Banner';
import { Card, CardRow } from '@/components/ui/Card';
import { Stack } from '@/components/ui/Layout';
import { Text } from '@/components/ui/Text';
import styles from './Showcase.module.css';

type Children = { children: React.ReactNode };

/** The page. Every story renders one of these. */
export function Doc({ children }: Children) {
  return (
    <div className={styles.docWidth}>
      <Stack gap={6}>{children}</Stack>
    </div>
  );
}

export function Section({
  title,
  note,
  children,
}: Children & { title: string; note?: React.ReactNode }) {
  return (
    <section>
      <Stack gap={3}>
        <Text as="h3" level="subheading">
          {title}
        </Text>
        {note ? <Note>{note}</Note> : null}
        {children}
      </Stack>
    </section>
  );
}

export function Note({ children }: Children) {
  return (
    <div className={styles.proseWidth}>
      <Text as="p" level="small" tone="muted">
        {children}
      </Text>
    </div>
  );
}

/** For a fact about the system that is true and uncomfortable. */
export function Caveat({ children }: Children) {
  return (
    <div className={styles.proseWidth}>
      <Banner tone="warning">{children}</Banner>
    </div>
  );
}

export function Grid({ children }: Children) {
  return <div className={styles.grid}>{children}</div>;
}

/** A labelled list of specimens: the token name, then the thing itself. */
export function Specs({ children }: Children) {
  return <Card>{children}</Card>;
}

export function Spec({ label, children }: Children & { label: string }) {
  return (
    <CardRow>
      <span className={styles.specLabel}>
        <Text level="mono" tone="muted">
          {label}
        </Text>
      </span>
      <span className={styles.specBody}>{children}</span>
    </CardRow>
  );
}

export function RailBox({ children }: Children) {
  return <div className={styles.railBox}>{children}</div>;
}

/**
 * A swatch shows the token by reference and the value by read-back, so it cannot
 * disagree with `tokens.css` — there is nowhere for it to disagree from.
 */
export function Swatch({ name, value }: { name: string; value: string }) {
  const empty = value === '' || /\/\s*0\s*\)/.test(value);
  return (
    <Card>
      <div
        className={empty ? styles.fillEmpty : styles.fill}
        style={{ background: `var(${name})` }}
      />
      <CardRow>
        <Stack gap={1}>
          <Text level="mono" tone="strong">
            {name}
          </Text>
          <Text level="mono" tone="faint">
            {value || '—'}
          </Text>
        </Stack>
      </CardRow>
    </Card>
  );
}

/**
 * Every custom property declared on `:root`, read out of the live stylesheet.
 *
 * Hand-listing them would mean a token added to `tokens.css` and forgotten here
 * simply never appears — the gallery would look complete while being wrong. This
 * cannot miss one, and anything the stories do not group shows up as ungrouped.
 */
export function useRootTokens(): ReadonlyMap<string, string> {
  const [tokens, setTokens] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    setTokens(readRootTokens());
  }, []);
  return tokens;
}

function readRootTokens(): Map<string, string> {
  const found = new Map<string, string>();

  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSImportRule && rule.styleSheet) {
        visitSheet(rule.styleSheet);
      } else if (rule instanceof CSSStyleRule && rule.selectorText.includes(':root')) {
        for (const property of Array.from(rule.style)) {
          if (property.startsWith('--')) {
            found.set(property, rule.style.getPropertyValue(property).trim());
          }
        }
      }
    }
  };

  const visitSheet = (sheet: CSSStyleSheet) => {
    // A stylesheet from another origin throws on access. None of ours is.
    try {
      visit(sheet.cssRules);
    } catch {
      /* not ours to read */
    }
  };

  for (const sheet of Array.from(document.styleSheets)) visitSheet(sheet);
  return found;
}
