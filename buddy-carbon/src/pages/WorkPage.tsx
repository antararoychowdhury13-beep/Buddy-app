import { Column, Grid, Tag, Tile, ClickableTile } from '@carbon/react';
import {
  Events, Chat, Email, TaskComplete, LogoGithub, Screen, CheckmarkOutline, Portfolio, Meter,
} from '@carbon/icons-react';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import styles from './WorkPage.module.scss';

interface Surface {
  readonly label: string;
  readonly count: string;
  readonly detail: string;
  readonly icon: typeof Events;
}

const SURFACES: readonly Surface[] = [
  { label: 'Meetings', count: '6', detail: '2 need you today', icon: Events },
  { label: 'Slack', count: '3', detail: 'Unread threads', icon: Chat },
  { label: 'Teams', count: '1', detail: 'Mention waiting', icon: Chat },
  { label: 'Email', count: '12', detail: '2 need a reply', icon: Email },
  { label: 'Jira', count: '4', detail: 'Assigned to you', icon: TaskComplete },
  { label: 'GitHub', count: '2', detail: 'PRs to review', icon: LogoGithub },
  { label: 'Design', count: '1', detail: 'Handoff ready', icon: Screen },
  { label: 'Projects', count: '3', detail: 'Active', icon: Portfolio },
];

const APPROVALS: ReadonlyArray<{ title: string; detail: string; urgent: boolean }> = [
  { title: 'External MOM to 2 vendors', detail: 'Ask Buddy · needs your sign-off', urgent: true },
  { title: 'Project timeline shift (+2 days)', detail: 'Beta 26 → 28 Aug', urgent: false },
  { title: 'Design tooling reforecast', detail: 'Finance · Q3 budget 12% over', urgent: false },
];

const INSIGHTS: ReadonlyArray<{ label: string; value: string; helper: string }> = [
  { label: 'Focus time', value: '1h 05m', helper: 'Recoverable to 2h 15m' },
  { label: 'Context switches', value: '9', helper: 'Above your usual' },
  { label: 'Meetings that need you', value: '2 / 6', helper: 'The rest are informational' },
];

export default function WorkPage() {
  return (
    <div className="page">
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <PageHeader title="Work" subtitle="Everything across your work apps, in one place. Buddy surfaces what needs you first." />
        </Column>

        {/* Summary */}
        <Column sm={4} md={8} lg={12}>
          <Tile className={styles.tile}>
            <h2 className={styles.kicker}>Today at work</h2>
            <Grid narrow className={styles.stats}>
              <Column sm={2} md={4} lg={4}><StatTile value="2" label="Need you" helperText="Of 6 meetings" /></Column>
              <Column sm={2} md={4} lg={4}><StatTile value="3" label="Approvals" helperText="1 is urgent" /></Column>
              <Column sm={2} md={4} lg={4}><StatTile value="4" label="Due tasks" helperText="Across Jira" /></Column>
            </Grid>
          </Tile>
        </Column>

        {/* App surfaces */}
        <Column sm={4} md={8} lg={12}>
          <section className="section" aria-label="Connected work apps">
            <h3 className="section__title">Your work apps</h3>
            <div className={styles.surfaceGrid}>
              {SURFACES.map((s) => {
                const Icon = s.icon;
                return (
                  <ClickableTile key={s.label} className={styles.surface} href="#" onClick={(e) => e.preventDefault()}>
                    <div className={styles.surfaceHead}>
                      <Icon size={20} />
                      <span className={styles.surfaceCount}>{s.count}</span>
                    </div>
                    <div className={styles.surfaceLabel}>{s.label}</div>
                    <div className={styles.surfaceDetail}>{s.detail}</div>
                  </ClickableTile>
                );
              })}
            </div>
          </section>
        </Column>

        {/* Approvals */}
        <Column sm={4} md={8} lg={6}>
          <section className="section" aria-label="Approvals">
            <h3 className="section__title">Approvals</h3>
            <div className="stack">
              {APPROVALS.map((a) => (
                <Tile key={a.title} className={styles.approval}>
                  <div className={styles.approvalHead}>
                    <CheckmarkOutline size={18} />
                    <span className={styles.approvalTitle}>{a.title}</span>
                    {a.urgent && <Tag type="red" size="sm">Urgent</Tag>}
                  </div>
                  <div className={styles.surfaceDetail}>{a.detail}</div>
                </Tile>
              ))}
            </div>
          </section>
        </Column>

        {/* Productivity insights */}
        <Column sm={4} md={8} lg={6}>
          <section className="section" aria-label="Productivity insights">
            <h3 className="section__title"><Meter size={16} /> Productivity insights</h3>
            <Tile className={styles.tile}>
              {INSIGHTS.map((i) => (
                <div key={i.label} className={styles.insightRow}>
                  <div>
                    <div className={styles.insightLabel}>{i.label}</div>
                    <div className={styles.surfaceDetail}>{i.helper}</div>
                  </div>
                  <div className={styles.insightValue}>{i.value}</div>
                </div>
              ))}
            </Tile>
          </section>
        </Column>
      </Grid>
    </div>
  );
}
