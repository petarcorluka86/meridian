'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revealVaultAction } from '@/app/vault/actions';
import type { TreeNode } from '@/lib/vault/tree';
import { ExternalIcon, NavItem, NavList, Text } from '@/components/ui';
import styles from './Vault.module.css';
import { Chevron, FileIcon, FolderIcon, NoteIcon } from './FileIcons';

type Props = { tree: TreeNode[]; selected: string | null; vaultPath: string };

export function VaultTree({ tree, selected, vaultPath }: Props) {
  const router = useRouter();
  // Top level opens by default; deeper folders stay shut until asked for.
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [revealFailed, setRevealFailed] = useState<string | null>(null);
  const [revealing, startReveal] = useTransition();

  const reveal = () =>
    startReveal(async () => {
      const result = await revealVaultAction();
      setRevealFailed(result.ok ? null : result.message);
    });

  const rows: React.ReactNode[] = [];

  const walk = (nodes: TreeNode[], depth: number) => {
    for (const node of nodes) {
      if (node.kind === 'folder') {
        const open = !closed[node.path];
        rows.push(
          <NavItem
            key={node.path}
            indent={depth}
            expanded={open}
            onClick={() => setClosed((c) => ({ ...c, [node.path]: open }))}
            icon={
              <>
                <Chevron className={open ? styles.chevronOpen : styles.chevron} />
                <FolderIcon />
              </>
            }
            label={node.name}
          >
            <Text level="mono" tone="faint">
              {node.children?.length ?? 0}
            </Text>
          </NavItem>,
        );
        if (open && node.children) walk(node.children, depth + 1);
      } else {
        rows.push(
          <NavItem
            key={node.path}
            indent={depth}
            selected={node.path === selected}
            onClick={() =>
              router.push(`/vault?file=${encodeURIComponent(node.path)}`, { scroll: false })
            }
            icon={node.kind === 'md' ? <NoteIcon /> : <FileIcon />}
            label={node.name}
          />,
        );
      }
    }
  };

  walk(tree, 0);

  return (
    <div className={`scroll ${styles.treeCol}`}>
      <div className={styles.treeHead}>
        <Text level="micro" tone="muted">
          VAULT
        </Text>
      </div>
      <NavList label="Vault folder">
        <NavItem
          onClick={reveal}
          title={`${vaultPath} — press to show it in the Finder`}
          icon={<FolderIcon />}
          label={
            <Text level="mono" tone="faint" truncate>
              {vaultPath}
            </Text>
          }
        >
          <ExternalIcon />
        </NavItem>
      </NavList>
      {revealFailed && !revealing ? (
        <div className={styles.treeMessage}>
          <Text level="micro" tone="danger">
            {revealFailed}
          </Text>
        </div>
      ) : null}
      <NavList label="Vault files">{rows}</NavList>
    </div>
  );
}
