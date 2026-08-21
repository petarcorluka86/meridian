import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Sidebar } from './Sidebar';
import styles from './Shell.module.css';
import { OverviewIcon, PeopleIcon, TasksIcon } from './NavIcons';

/**
 * The shell is a fixed 236px sidebar and one scrolling column. There is no
 * header, no breadcrumb and no page chrome above the content — the screen title
 * is the first thing in the content itself.
 */
const meta = {
  title: 'Components/Sidebar',
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/people' } },
  },
} satisfies Meta;

export default meta;

export const TheSidebar: StoryObj = {
  name: 'Sidebar',
  render: () => (
    <div className={styles.shell} style={{ height: 620 }}>
      <Sidebar />
      <div className={styles.main} style={{ padding: 30 }}>
        <Note>
          People stays lit while a person's page is open — the active test is a prefix match for
          every item except Overview, which has to be exact or it would match everything.
        </Note>
      </div>
    </div>
  ),
};

export const NavItemStates: StoryObj = {
  name: 'Nav item states',
  render: () => (
    <div style={{ padding: 24 }}>
      <Doc>
        <Section
          title="Two states, and the active one is a filled row rather than a bar"
          note="A left-edge indicator would compete with the priority rails inside the content. The active row takes a paper fill and one weight step, which is enough at this size."
        >
          <div
            style={{
              width: 216,
              padding: '0 10px',
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-card)',
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            <div className={styles.nav}>
              <span className={styles.navItemActive}>
                <PeopleIcon />
                People
              </span>
              <span className={styles.navItem}>
                <OverviewIcon />
                Overview
              </span>
              <span className={styles.navItem}>
                <TasksIcon />
                Tasks
              </span>
            </div>
          </div>
        </Section>
      </Doc>
    </div>
  ),
};
