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
  { href: '/help', label: 'Help', Icon: HelpIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className={styles.sidebar} data-shell-sidebar>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <BrandMark />
        </span>
        <Text level="subheading">Meridian</Text>
      </div>
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
