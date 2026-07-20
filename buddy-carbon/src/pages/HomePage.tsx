import {
  Accordion,
  AccordionItem,
  Column,
  Dropdown,
  ExpandableTile,
  Grid,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile,
  TileAboveTheFoldContent,
  TileBelowTheFoldContent,
} from '@carbon/react';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import { ConfidenceTag } from '../components/ConfidenceTag';
import { useHomeModel } from '../hooks/useHomeModel';
import type { HomeMode, PriorityTier } from '../types/home';
import styles from './HomePage.module.scss';

const TIER_TAG: Record<PriorityTier, { type: 'red' | 'magenta' | 'blue' | 'gray'; label: string }> = {
  critical: { type: 'red', label: 'Critical' },
  high: { type: 'magenta', label: 'High' },
  medium: { type: 'blue', label: 'Medium' },
  low: { type: 'gray', label: 'Low' },
};

const SEVERITY_TAG: Record<'high' | 'medium' | 'low', 'red' | 'magenta' | 'blue'> = {
  high: 'red',
  medium: 'magenta',
  low: 'blue',
};

export default function HomePage() {
  const model = useHomeModel();
  const { summary, groups, priorities, conflicts, modeConfig, modes, mode, setMode, auto, fmtMins } = model;

  const modeItems = modes.map((m) => ({ id: m, label: modeConfig[m].label }));
  const selectedModeItem = modeItems.find((m) => m.id === mode) ?? modeItems[0];

  const stats: ReadonlyArray<{ value: string; label: string; helper?: string }> = [
    { value: String(summary.meetings), label: 'Meetings', helper: `${summary.activeMeetings} need you` },
    { value: String(summary.criticalTasks), label: 'Critical tasks', helper: 'Due today' },
    { value: String(summary.conflicts), label: 'Conflicts', helper: summary.conflicts ? 'To resolve' : 'All clear' },
    { value: fmtMins(summary.focusMins), label: 'Focus time', helper: 'Protected' },
    { value: String(summary.personalCommitments), label: 'Personal', helper: 'Commitments' },
    { value: `~${summary.estTimeSavedMins}m`, label: 'Time saved', helper: 'If you accept' },
  ];

  return (
    <div className="page">
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <PageHeader
            title="Home"
            subtitle="Your daily operating plan. Nothing runs on its own — you stay in control."
          />
        </Column>

        <Column sm={4} md={8} lg={12}>
          <div className={styles.modeRow}>
            <Dropdown
              id="home-mode"
              titleText="View mode"
              label="Select a view"
              size="md"
              items={modeItems}
              itemToString={(item) => (item ? item.label : '')}
              selectedItem={selectedModeItem}
              onChange={({ selectedItem }) => {
                if (selectedItem) setMode(selectedItem.id as HomeMode);
              }}
            />
            <p className={styles.modeReason}>{mode === auto.mode ? `Suggested: ${auto.reason}` : modeConfig[mode].reasonHint}</p>
          </div>
        </Column>

        <Column sm={4} md={8} lg={12}>
          <Tile className={styles.planTile}>
            <h2 className={styles.planKicker}>Daily operating plan</h2>
            <p className={styles.planUpdated}>
              Updated {summary.updatedAt} · {modeConfig[mode].summaryTone}
            </p>
            <p className={styles.narrative}>{summary.narrative}</p>
            <Grid narrow className={styles.statGrid}>
              {stats.map((s) => (
                <Column key={s.label} sm={2} md={4} lg={4}>
                  <StatTile value={s.value} label={s.label} helperText={s.helper} />
                </Column>
              ))}
            </Grid>
          </Tile>
        </Column>

        {groups.map((group) => (
          <Column key={group.category} sm={4} md={8} lg={12}>
            <section className="section" aria-label={group.label}>
              <h3 className="section__title">{group.label}</h3>
              <div className="stack">
                {group.items.map((rec) => (
                  <ExpandableTile
                    key={rec.id}
                    tileCollapsedIconText="Show why Buddy suggests this"
                    tileExpandedIconText="Hide details"
                  >
                    <TileAboveTheFoldContent>
                      <div className={styles.recHead}>
                        <span className={styles.recTitle}>{rec.title}</span>
                        <ConfidenceTag level={rec.explanation.confidence} />
                      </div>
                      <p className={styles.recSummary}>{rec.summary}</p>
                    </TileAboveTheFoldContent>
                    <TileBelowTheFoldContent>
                      <p className={styles.whyLabel}>Why now</p>
                      <p className={styles.whyText}>{rec.explanation.whyNow}</p>
                      <p className={styles.whyLabel}>If ignored</p>
                      <p className={styles.whyText}>{rec.explanation.consequenceIfIgnored}</p>
                      <div className={styles.tagRow}>
                        <Tag type="outline" size="sm">
                          {rec.reversible ? 'Reversible' : 'Needs confirmation'}
                        </Tag>
                        {rec.requiredPermission ? (
                          <Tag type="cool-gray" size="sm">
                            {rec.requiredPermission}
                          </Tag>
                        ) : null}
                      </div>
                    </TileBelowTheFoldContent>
                  </ExpandableTile>
                ))}
              </div>
            </section>
          </Column>
        ))}

        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="What's important">
            <h3 className="section__title">What&apos;s important</h3>
            <StructuredListWrapper aria-label="Ranked priorities" isCondensed>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Priority</StructuredListCell>
                  <StructuredListCell head>Item</StructuredListCell>
                  <StructuredListCell head>Why</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {priorities.map((item) => (
                  <StructuredListRow key={item.id}>
                    <StructuredListCell>
                      <Tag type={TIER_TAG[item.tier].type} size="sm">
                        {TIER_TAG[item.tier].label}
                      </Tag>
                    </StructuredListCell>
                    <StructuredListCell>{item.title}</StructuredListCell>
                    <StructuredListCell>{item.explanation}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </section>
        </Column>

        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="Conflicts">
            <h3 className="section__title">Conflicts Buddy found</h3>
            <Accordion>
              {conflicts.map((conflict) => (
                <AccordionItem
                  key={conflict.id}
                  title={
                    <span className={styles.conflictTitle}>
                      <Tag type={SEVERITY_TAG[conflict.severity]} size="sm">
                        {conflict.severity[0].toUpperCase() + conflict.severity.slice(1)}
                      </Tag>
                      {conflict.title}
                    </span>
                  }
                >
                  <p className={styles.whyText}>{conflict.description}</p>
                  <p className={styles.whyLabel}>Recommended</p>
                  <p className={styles.whyText}>
                    {conflict.recommended.label} — {conflict.recommended.impact}
                  </p>
                  <p className={styles.whyLabel}>Alternative</p>
                  <p className={styles.whyText}>
                    {conflict.alternative.label} — {conflict.alternative.impact}
                  </p>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </Column>
      </Grid>
    </div>
  );
}
