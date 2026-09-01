import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Card } from './Card';
import { TaskRow, type TaskView } from './TaskRow';

/**
 * The one task row in the system. Overview, Tasks and a person's page all render
 * this component, so a task looks the same wherever you meet it.
 *
 * Assembled entirely from primitives — `CardRow`, `Rail`, `Checkbox`, `Text`,
 * `Pill` and `Avatar` are the shared ones, not copies of them.
 *
 * Everything it needs is resolved on the server and passed down as a `TaskView`:
 * the due label, the tone, the person's name and the cached photo path. A client
 * component cannot read the vault, and it must not compute “late” from the
 * browser's clock.
 *
 * Toggling here calls a stub — see `.storybook/stubs/tasks-actions.ts`. Watch the
 * Actions panel.
 */
const meta = {
  title: 'Components/Task row',
  component: TaskRow,
  parameters: {
    layout: 'padded',
    // The row calls useRouter() to refresh after a toggle, and that needs an
    // App Router to be mounted.
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof TaskRow>;

export default meta;

const base: TaskView = {
  id: 't1',
  title: 'Write the Q3 comp letters',
  done: false,
  priority: 'normal',
  dueDate: '2026-08-21',
  dueLabel: 'Today',
  dueTone: 'today',
  personName: null,
  personSlug: null,
  personPhoto: null,
  projectId: null,
  projectName: null,
  phaseId: null,
  phaseName: null,
  kind: 'task',
};

function List({ tasks, showDue = true }: { tasks: TaskView[]; showDue?: boolean }) {
  return (
    <div style={{ maxWidth: 620 }}>
      <Card>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} showDue={showDue} />
        ))}
      </Card>
    </div>
  );
}

export const EveryTone: StoryObj = {
  name: 'Every priority and tone',
  render: () => (
    <Doc>
      <Section title="A list, read down the rail">
        <List
          tasks={[
            {
              ...base,
              id: 'a',
              priority: 'urgent',
              title: 'Sign off the comp letters',
              dueLabel: '3 days late',
              dueTone: 'late',
            },
            {
              ...base,
              id: 'b',
              priority: 'important',
              title: 'Draft the retro summary',
              dueLabel: 'Today',
              dueTone: 'today',
            },
            {
              ...base,
              id: 'c',
              priority: 'normal',
              title: 'Book the offsite room',
              dueLabel: 'In 4 days',
              dueTone: 'upcoming',
            },
            {
              ...base,
              id: 'd',
              priority: 'normal',
              title: 'Read the platform proposal',
              dueDate: null,
              dueLabel: null,
              dueTone: 'none',
            },
            {
              ...base,
              id: 'e',
              done: true,
              title: 'Send the onboarding plan',
              dueLabel: 'Done',
              dueTone: 'done',
            },
          ]}
        />
      </Section>
      <Note>
        A task with no date carries no pill. No date is most of the list, and a grey “no date” on
        every row that is merely not urgent says nothing — the absence says it.
      </Note>
      <Note>
        A done row keeps its position and loses its hue: the rail goes to the soft border and the
        title drops to the faint ink. Nothing moves, so ticking a box does not reflow the list under
        the pointer.
      </Note>
    </Doc>
  ),
};

export const WithAPerson: StoryObj = {
  name: 'Assigned, and waiting',
  render: () => (
    <Doc>
      <Section
        title="A person is a name and a monogram"
        note="Until a photo has been cached through the app, a person is their initials — never a remote avatar, because that would be the browser fetching from the internet."
      >
        <List
          tasks={[
            {
              ...base,
              id: 'e',
              priority: 'important',
              title: 'Review the hiring plan',
              personName: 'Ana Horvat',
              personSlug: 'ana-horvat',
            },
            {
              ...base,
              id: 'f',
              kind: 'waiting',
              title: 'Signed contract back from legal',
              personName: 'Marko Novak',
              personSlug: 'marko-novak',
              dueLabel: 'In 2 days',
              dueTone: 'upcoming',
            },
          ]}
        />
      </Section>
      <Note>
        <code>waiting</code> is a task you are blocked on rather than one you owe. Tasks filters
        those out; Overview keeps them, which is why the flag lives on the row and not on the page.
      </Note>
    </Doc>
  ),
};

export const WithoutDue: StoryObj = {
  name: 'showDue = false',
  render: () => (
    <Doc>
      <Section
        title="On a screen that is already grouped by date"
        note="The pill would repeat the group heading, so the row drops it rather than the screen hiding it with CSS."
      >
        <List
          showDue={false}
          tasks={[
            { ...base, id: 'g', priority: 'urgent', title: 'Sign off the comp letters' },
            { ...base, id: 'h', title: 'Book the offsite room' },
          ]}
        />
      </Section>
    </Doc>
  ),
};
