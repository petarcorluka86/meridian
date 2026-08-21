import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Avatar } from './Avatar';
import { Card, CardHeader } from './Card';
import { Pill } from './Pill';
import { Row } from './Layout';
import { Table, TBody, TD, TH, THead, TR } from './Table';
import { Text } from './Text';

/**
 * For data that genuinely has columns — the roster, the hours log. A list of one
 * thing per row is a stack of `CardRow`s, not a table.
 *
 * The table draws no border of its own, so a `Card` clips it and there is never a
 * double edge.
 */
const meta = {
  title: 'Components/Table',
  component: Table,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Table>;

export default meta;

const PEOPLE = [
  { name: 'Ana Horvat', role: 'Senior engineer', seen: '2 days ago', status: 'in' },
  { name: 'Marko Novak', role: 'Engineer', seen: '3 weeks ago', status: 'out' },
  { name: 'Iva Perić', role: 'Engineering manager', seen: 'yesterday', status: 'in' },
];

export const InACard: StoryObj = {
  name: 'In a card',
  render: () => (
    <Doc>
      <Section title="Headers are micro caps; a numeric column is tabular and never wraps">
        <div style={{ maxWidth: 720 }}>
          <Card>
            <CardHeader title="People" count={3} />
            <Table label="People">
              <THead>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH>Last spoken</TH>
                <TH align="end">Status</TH>
              </THead>
              <TBody>
                {PEOPLE.map((person) => (
                  <TR key={person.name} interactive>
                    <TD>
                      <Row gap={2}>
                        <Avatar name={person.name} photo={null} size="sm" />
                        <Text level="small" tone="strong">
                          {person.name}
                        </Text>
                      </Row>
                    </TD>
                    <TD>{person.role}</TD>
                    <TD numeric>{person.seen}</TD>
                    <TD align="end">
                      {person.status === 'out' ? (
                        <Pill tone="warning">Out</Pill>
                      ) : (
                        <Pill tone="success">In</Pill>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>
      </Section>
      <Note>
        `interactive` lights the row on hover. The whole row is the target, never a word inside it —
        a link you have to aim at is a link most people miss.
      </Note>
    </Doc>
  ),
};
