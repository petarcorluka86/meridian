import { Pill } from '@/components/ui/Pill';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Code, Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';

/**
 * Which invariants of the design system actually fail a build, and which are
 * only intentions. Built from the `Table` primitive, like anything else with
 * columns.
 */
const ROWS: { rule: string; gate: string | null; verdict: string }[] = [
  {
    rule: 'Colour is written down once, in tokens.css',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'No oklch, hex or rgb anywhere but tokens.css',
  },
  {
    rule: 'Type comes from the eleven levels',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'Every font is a whole --type-* token; no loose size, weight or tracking',
  },
  {
    rule: 'Space comes from the seven steps',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'Every padding, margin and gap is var(--space-*) or zero',
  },
  {
    rule: 'Radius comes from the five tokens',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'Every border-radius is var(--radius-*)',
  },
  {
    rule: 'Two shadows, and no third',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'Every box-shadow is var(--shadow-lift) or var(--shadow-dialog)',
  },
  {
    rule: 'Only Card declares the card',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'Surface plus a border plus a card radius may appear in one file',
  },
  {
    rule: 'A button carries one glyph, and it is a prop',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'A glyph in the children is how Join ended up with two',
  },
  {
    rule: 'Every variant a primitive offers exists in its stylesheet',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'A size in the type with no CSS rule renders with no size at all',
  },
  {
    rule: 'Nothing fetched from an integration reaches a vault in this repo',
    gate: 'tests/unit/fixture-guard.test.ts',
    verdict: 'Fails on a sync that lacks vaultIsInsideApp()',
  },
  {
    rule: 'Every outbound request is a GET',
    gate: 'tests/unit/readonly.test.ts',
    verdict: 'One sanctioned POST, permitted by exact URL. Everything else fails',
  },
  {
    rule: 'Only named files write to disk',
    gate: 'tests/unit/paths.test.ts',
    verdict: 'An eighth writer has to be added to the list deliberately',
  },
  {
    rule: 'The screens have not moved',
    gate: 'npm run pixel',
    verdict: 'Fourteen screens at 1440×900, zero differing pixels',
  },
  {
    rule: 'Every screen is built from the primitives',
    gate: 'tests/unit/design-system.test.ts',
    verdict: 'NOT_YET_MIGRATED is empty, and a new entry needs a reason beside it',
  },
  {
    rule: 'Component APIs stay small',
    gate: null,
    verdict: 'Nothing stops a tenth variant being added to a primitive',
  },
  {
    rule: 'A screen uses the right primitive',
    gate: null,
    verdict: 'A Pill that toggles something passes every test in the repo',
  },
];

export function GateTable() {
  return (
    <Card>
      <Table label="Design system gates">
        <THead>
          <TH>Rule</TH>
          <TH>Gate</TH>
          <TH>Verdict</TH>
        </THead>
        <TBody>
          {ROWS.map((row) => (
            <TR key={row.rule}>
              <TD>
                <Text level="small" tone="strong">
                  {row.rule}
                </Text>
              </TD>
              <TD>{row.gate ? <Code>{row.gate}</Code> : <Pill tone="warning">Nothing</Pill>}</TD>
              <TD>
                <Text level="small" tone={row.gate ? 'default' : 'warning'}>
                  {row.verdict}
                </Text>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
