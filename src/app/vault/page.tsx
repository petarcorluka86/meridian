import path from 'node:path';
import os from 'node:os';
import { loadConfig } from '@/lib/env';
import { buildTree, firstFile, readPreview } from '@/lib/vault/tree';
import { VaultTree } from '@/components/vault/VaultTree';
import { HeaderFileIcon } from '@/components/vault/FileIcons';
import { EMPTY } from '@/copy/empty';
import { Text } from '@/components/ui/Text';
import styles from '@/components/vault/Vault.module.css';

function tildeHome(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>;
}) {
  const { file } = await searchParams;
  const config = loadConfig();
  if (!config.vaultPath) return null;

  const tree = buildTree();
  const selected = file ?? firstFile(tree);
  const preview = selected ? readPreview(selected) : { state: 'missing' as const };

  const emptyLine =
    preview.state === 'empty'
      ? EMPTY.vault.emptyFile
      : preview.state === 'binary'
        ? 'Not a text file.'
        : EMPTY.vault.missing;

  return (
    <div className={styles.split} data-screen>
      <VaultTree tree={tree} selected={selected} vaultPath={tildeHome(config.vaultPath)} />
      <div className={`scroll ${styles.previewCol}`}>
        {selected ? (
          <>
            <div className={styles.previewHead}>
              <HeaderFileIcon />
              <Text level="subheading">{path.basename(selected)}</Text>
              <Text level="mono" tone="faint">
                {selected}
              </Text>
            </div>
            <div className={styles.previewBody}>
              {preview.state === 'ok' ? (
                <Text as="pre" level="mono">
                  {preview.body}
                </Text>
              ) : (
                <Text level="small" tone="muted">
                  {emptyLine}
                </Text>
              )}
            </div>
          </>
        ) : (
          <div className={styles.previewBody}>
            <Text level="small" tone="muted">
              {EMPTY.vault.emptyFolder}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
