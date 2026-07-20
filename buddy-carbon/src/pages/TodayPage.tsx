import { useState } from 'react';
import {
  Button,
  Column,
  ContentSwitcher,
  DataTable,
  ExpandableTile,
  Grid,
  ProgressBar,
  RadioButton,
  RadioButtonGroup,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
  TileAboveTheFoldContent,
  TileBelowTheFoldContent,
  Toggle,
} from '@carbon/react';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import { ConfidenceTag } from '../components/ConfidenceTag';
import { MeetingBriefModal } from '../components/MeetingBriefModal';
import { useTodayModel } from '../hooks/useTodayModel';
import type { EnergyState, EventType } from '../types/today';
import type { Scenario } from '../services/today/engines';
import styles from './TodayPage.module.scss';

const TYPE_TAG: Record<EventType, { type: 'blue' | 'purple' | 'teal' | 'green' | 'magenta' | 'gray'; label: string }> = {
  meeting: { type: 'blue', label: 'Meeting' },
  focus: { type: 'purple', label: 'Focus' },
  prep: { type: 'teal', label: 'Prep' },
  travel: { type: 'teal', label: 'Travel' },
  break: { type: 'green', label: 'Break' },
  personal: { type: 'magenta', label: 'Personal' },
  task: { type: 'green', label: 'Task' },
  buddy: { type: 'blue', label: 'Buddy' },
  buffer: { type: 'gray', label: 'Buffer' },
};

const SCENARIOS: ReadonlyArray<{ id: Scenario; label: string }> = [
  { id: 'current', label: 'Current' },
  { id: 'optimised', label: 'Optimised' },
  { id: 'delegated', label: 'Delegated' },
  { id: 'personal_first', label: 'Family-first' },
];

const ENERGY_OPTIONS: ReadonlyArray<{ id: EnergyState; label: string }> = [
  { id: 'energised', label: 'Energised' },
  { id: 'ok', label: 'Okay' },
  { id: 'low', label: 'Low energy' },
  { id: 'over', label: 'Overloaded' },
  { id: 'unspecified', label: 'Prefer not to say' },
];

const COMPARE_ROWS = [
  { id: 'focus', metric: 'Focus time', current: '1h 05m', optimised: '2h 15m' },
  { id: 'buffer', metric: 'Buffer time', current: '0 min', optimised: '20 min' },
  { id: 'switches', metric: 'Context switches', current: '9', optimised: '5' },
  { id: 'travel', metric: 'Travel handled', current: 'No', optimised: 'Yes' },
  { id: 'completion', metric: 'Task completion', current: '58%', optimised: '82%' },
  { id: 'personal', metric: 'Personal protected', current: 'At risk', optimised: 'Yes' },
  { id: 'finish', metric: 'Expected finish', current: '7:10 PM', optimised: '6:15 PM' },
];

export default function TodayPage() {
  const model = useTodayModel();
  const [briefOpen, setBriefOpen] = useState(false);
  const currentPct = Math.round(model.current.internalProbability * 100);
  const optimisedPct = Math.round(model.optimised.internalProbability * 100);
  const estimatePct = Math.round(model.activeEstimate.internalProbability * 100);

  return (
    <div className="page">
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <PageHeader title="Today" subtitle="Your day, orchestrated. Buddy keeps it optimised — you stay in control." />
        </Column>

        {/* Schedule optimisation */}
        <Column sm={4} md={8} lg={12}>
          <Tile className={styles.tile}>
            <h2 className={styles.kicker}>Schedule optimisation</h2>
            <Grid narrow className={styles.statGrid}>
              <Column sm={2} md={4} lg={4}>
                <StatTile value={String(model.openSuggestions.length)} label="Suggestions" helperText="Ready to apply" />
              </Column>
              <Column sm={2} md={4} lg={4}>
                <StatTile value={`~${model.recoverableMins}m`} label="Recoverable" helperText="Focus time" />
              </Column>
              <Column sm={2} md={4} lg={4}>
                <StatTile value={`${currentPct}→${optimisedPct}%`} label="Completion" helperText="If you optimise" />
              </Column>
            </Grid>
            <Button className={styles.briefBtn} kind="tertiary" size="md" onClick={() => setBriefOpen(true)}>
              Brief me on the next meeting
            </Button>
          </Tile>
        </Column>

        {/* Suggestions */}
        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="Optimisation suggestions">
            <h3 className="section__title">Suggestions</h3>
            <div className="stack">
              {model.openSuggestions.map((s) => (
                <ExpandableTile
                  key={s.id}
                  tileCollapsedIconText="Show why Buddy suggests this"
                  tileExpandedIconText="Hide details"
                >
                  <TileAboveTheFoldContent>
                    <div className={styles.sugHead}>
                      <span className={styles.sugTitle}>{s.title}</span>
                      <Tag type={s.safe ? 'green' : 'magenta'} size="sm">
                        {s.safe ? 'Safe' : 'Affects others'}
                      </Tag>
                    </div>
                    <p className={styles.sugReason}>{s.reason}</p>
                    <p className={styles.sugImpact}>{s.impact}</p>
                  </TileAboveTheFoldContent>
                  <TileBelowTheFoldContent>
                    <p className={styles.whyLabel}>Why now</p>
                    <p className={styles.whyText}>{s.confidenceReason}</p>
                    <div className={styles.metaGrid}>
                      <span>
                        <span className={styles.k}>From</span> {s.originalTime}
                      </span>
                      <span>
                        <span className={styles.k}>To</span> {s.proposedTime}
                      </span>
                      <span>
                        <span className={styles.k}>Affects</span> {s.affectedPeople.length ? s.affectedPeople.join(', ') : 'Only you'}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => model.applySuggestion(s.id)}>
                      Apply suggestion
                    </Button>
                  </TileBelowTheFoldContent>
                </ExpandableTile>
              ))}
              {model.openSuggestions.length === 0 ? (
                <p className={styles.whyText}>All suggestions applied. Your day is optimised.</p>
              ) : null}
            </div>
          </section>
        </Column>

        {/* Current vs optimised */}
        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="Current versus optimised">
            <h3 className="section__title">Current vs optimised</h3>
            <DataTable rows={COMPARE_ROWS} headers={[{ key: 'metric', header: 'Metric' }, { key: 'current', header: 'Current' }, { key: 'optimised', header: 'Optimised' }]}>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <TableContainer title="Plan comparison" description="Estimates, not guarantees.">
                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => {
                          const { key: _headerKey, ...headerProps } = getHeaderProps({ header });
                          return (
                            <TableHeader key={header.key} {...headerProps}>
                              {header.header}
                            </TableHeader>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const { key: _rowKey, ...rowProps } = getRowProps({ row });
                        return (
                          <TableRow key={row.id} {...rowProps}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          </section>
        </Column>

        {/* Completion estimate */}
        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="Completion estimate">
            <h3 className="section__title">Completion estimate</h3>
            <ContentSwitcher
              selectedIndex={SCENARIOS.findIndex((s) => s.id === model.scenario)}
              onChange={({ index }) => model.setScenario(SCENARIOS[index ?? 0].id)}
              size="md"
            >
              {SCENARIOS.map((s) => (
                <Switch key={s.id} name={s.id} text={s.label} />
              ))}
            </ContentSwitcher>

            <Tile className={styles.estTile}>
              <div className={styles.estHead}>
                <span className={styles.estBand}>{model.activeEstimate.band[0].toUpperCase() + model.activeEstimate.band.slice(1)}</span>
                <ConfidenceTag level={model.activeEstimate.confidence} />
              </div>
              <ProgressBar
                value={estimatePct}
                max={100}
                label="Estimated chance of finishing all three due tasks"
                helperText={`~${estimatePct}% · calculated ${model.activeEstimate.calculatedAt}`}
              />
              <div className={styles.factors}>
                <div>
                  <p className={styles.whyLabel}>What&apos;s helping</p>
                  {model.activeEstimate.positiveFactors.length ? (
                    <ul className={styles.factorList}>
                      {model.activeEstimate.positiveFactors.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.whyText}>Nothing notable in your favour yet — try the Optimised plan.</p>
                  )}
                </div>
                <div>
                  <p className={styles.whyLabel}>Working against it</p>
                  {model.activeEstimate.negativeFactors.length ? (
                    <ul className={styles.factorList}>
                      {model.activeEstimate.negativeFactors.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.whyText}>No significant risks to this plan.</p>
                  )}
                </div>
              </div>
              <p className={styles.disclaimer}>{model.activeEstimate.disclaimer}</p>
            </Tile>
          </section>
        </Column>

        {/* Adaptive timeline */}
        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="Timeline">
            <h3 className="section__title">Timeline</h3>
            <StructuredListWrapper aria-label="Adaptive timeline" isCondensed>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Time</StructuredListCell>
                  <StructuredListCell head>Type</StructuredListCell>
                  <StructuredListCell head>Item</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {model.timeline.map((block) => (
                  <StructuredListRow key={block.id}>
                    <StructuredListCell>{block.start}</StructuredListCell>
                    <StructuredListCell>
                      <Tag type={TYPE_TAG[block.type].type} size="sm">
                        {TYPE_TAG[block.type].label}
                      </Tag>
                    </StructuredListCell>
                    <StructuredListCell>
                      <strong>{block.title}</strong>
                      <div className={styles.blockSub}>{block.sub}</div>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </section>
        </Column>

        {/* Energy-aware */}
        <Column sm={4} md={8} lg={8}>
          <section className="section" aria-label="Energy-aware scheduling">
            <h3 className="section__title">Energy-aware</h3>
            <Tile className={styles.tile}>
              <RadioButtonGroup
                legendText="How are you feeling? This works without any health data."
                name="energy-checkin"
                valueSelected={model.energy}
                onChange={(value) => model.setEnergy(value as EnergyState)}
                orientation="vertical"
              >
                {ENERGY_OPTIONS.map((option) => (
                  <RadioButton key={option.id} id={`energy-${option.id}`} labelText={option.label} value={option.id} />
                ))}
              </RadioButtonGroup>

              {model.energy !== 'unspecified' ? (
                <div className={styles.tips}>
                  <p className={styles.whyLabel}>How Buddy will adjust</p>
                  {model.energyTips.map((tip) => (
                    <div key={tip.title} className={styles.tip}>
                      <strong>{tip.title}</strong>
                      <p className={styles.whyText}>{tip.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Toggle
                id="health-consent"
                size="sm"
                labelText="Use optional health data"
                labelA="Off"
                labelB="On"
                toggled={model.healthConsent}
                onToggle={(checked) => model.setHealthConsent(checked)}
              />
              <p className={styles.disclaimer}>
                Off by default. Private to you — never shared with managers, never used for performance decisions. Buddy never diagnoses from
                wearable, sleep or activity data.
              </p>
            </Tile>
          </section>
        </Column>
      </Grid>

      <MeetingBriefModal open={briefOpen} onClose={() => setBriefOpen(false)} />
    </div>
  );
}
