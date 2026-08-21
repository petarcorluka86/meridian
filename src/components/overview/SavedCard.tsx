import { OVERVIEW_GLYPH, UploadIcon } from '@/components/overview/OverviewIcons';
import { EMPTY } from '@/copy/empty';
import { ButtonLink, Card, CardBody, EmptyState, GoIcon, Row, Stack, Text } from '@/components/ui';

/**
 * Whether anything is written down but not committed. The only card that is
 * about the vault itself rather than about the team.
 *
 * Nothing waiting is the same fact the Changelog screen states when it has no
 * diff to show, so it is the same entry and the same words.
 */
export function SavedCard({ changed }: { changed: number }) {
  if (changed === 0) {
    return (
      <Card>
        <EmptyState glyph={OVERVIEW_GLYPH.upload} {...EMPTY.changelog.saved} standalone />
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <Stack gap={3} align="start">
          <Row gap={3}>
            <UploadIcon />
            <Text level="subheading" tone="warning">
              {changed} unsaved {changed === 1 ? 'change' : 'changes'}
            </Text>
          </Row>
          <Text level="small" tone="muted">
            Edits are on disk but not committed to the vault.
          </Text>
          <ButtonLink href="/changelog" size="sm" icon={<GoIcon />}>
            Review and save
          </ButtonLink>
        </Stack>
      </CardBody>
    </Card>
  );
}
