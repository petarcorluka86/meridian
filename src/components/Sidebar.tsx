'use client';

import { usePathname } from 'next/navigation';
import { NavItem, NavList } from '@/components/ui/NavList';
import { Text } from '@/components/ui/Text';
import styles from './Shell.module.css';
import {
  BrandMark,
  ChangelogIcon,
  HelpIcon,
  NotesIcon,
  OverviewIcon,
  PeopleIcon,
  ProjectsIcon,
  SettingsIcon,
  TasksIcon,
  TimebalanceIcon,
  VaultIcon,
} from './NavIcons';

const NAV = [
  { href: '/', label: 'Overview', Icon: OverviewIcon },
  { href: '/people', label: 'People', Icon: PeopleIcon },
  { href: '/tasks', label: 'Tasks', Icon: TasksIcon },
  { href: '/notes', label: 'Notes', Icon: NotesIcon },
  { href: '/projects', label: 'Projects', Icon: ProjectsIcon },
  { href: '/timebalance', label: 'Timebalance', Icon: TimebalanceIcon },
  { href: '/vault', label: 'Vault', Icon: VaultIcon },
  { href: '/changelog', label: 'Changelog', Icon: ChangelogIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
  { href: '/help', label: 'Help', Icon: HelpIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className={styles.sidebar} data-shell-sidebar>
      {/*
       * A plain anchor, and deliberately not `next/link`: this is the one
       * control in the app that reloads the document rather than navigating
       * inside it. Everything else in this nav is a client navigation, which
       * keeps the running app — including anything it has got wrong. The mark is
       * the way back to a freshly loaded Overview, which is what somebody means
       * when they press a logo after something looks stale.
       *
       * `TextLink` would colour it the accent, and it is a brand rather than a
       * link in a sentence; `Text` sets its own font and colour, so the anchor
       * around it changes nothing about how it looks.
       */}
      <a className={styles.brand} href="/" title="Meridian — reload the app">
        <span className={styles.brandMark}>
          <BrandMark />
        </span>
        <Text level="subheading">Meridian</Text>
      </a>
      <NavList label="Screens">
        {NAV.map(({ href, label, Icon }) => {
          // People stays lit while a person's page is open, and Projects while a
          // project's is.
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <NavItem key={href} href={href} icon={<Icon />} label={label} selected={active} />;
        })}
      </NavList>
    </div>
  );
}
