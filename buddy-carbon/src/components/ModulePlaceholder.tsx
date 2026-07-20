import { Column, Grid, InlineNotification, UnorderedList, ListItem } from '@carbon/react';
import { PageHeader } from './PageHeader';

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  summary: string;
  willInclude: readonly string[];
}

/**
 * Honest interim state for a module whose Carbon migration is in progress.
 * Uses Carbon InlineNotification and list components rather than claiming the
 * screen is finished.
 */
export function ModulePlaceholder({ title, subtitle, summary, willInclude }: ModulePlaceholderProps) {
  return (
    <div className="page">
      <Grid>
        <Column sm={4} md={8} lg={8}>
          <PageHeader title={title} subtitle={subtitle} />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Migration in progress"
            subtitle="This module is being rebuilt in Carbon. The Home screen is fully migrated; this one is next."
          />
          <p className="page__subheading" style={{ marginBlockStart: '1rem' }}>
            {summary}
          </p>
          <h2 className="section__title">What this screen will include</h2>
          <UnorderedList>
            {willInclude.map((entry) => (
              <ListItem key={entry}>{entry}</ListItem>
            ))}
          </UnorderedList>
        </Column>
      </Grid>
    </div>
  );
}
