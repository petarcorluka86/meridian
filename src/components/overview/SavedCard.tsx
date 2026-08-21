import { UploadIcon } from '@/components/overview/OverviewIcons';
import { EMPTY } from '@/copy/empty';
import { ButtonLink, Card, CardBody, GoIcon, Row, Stack, Text } from '@/components/ui';

/**
 * Whether anything is written down but not committed. The only card that is
 * about the vault itself rather than about the team.
 */
export function SavedCard({ changed }: { changed: number }) {
  return (
    <Card>
      <CardBody>
        <Stack gap={3} align="start">
          <Row gap={3}>
            <UploadIcon />
            <Text level="subheading" tone={changed ? 'warning' : 'strong'}>
              {changed
                ? `${changed} unsaved ${changed === 1 ? 'change' : 'changes'}`
                : 'Everything is saved'}
            </Text>
          </Row>
          <Text level="small" tone="muted">
            {changed ? 'Edits are on disk but not committed to the vault.' : EMPTY.overview.unsaved}
          </Text>
          {changed ? (
            <ButtonLink href="/changelog" size="sm" icon={<GoIcon />}>
              Review and save
            </ButtonLink>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
