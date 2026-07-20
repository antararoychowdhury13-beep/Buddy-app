import { useState } from 'react';
import {
  Button, Column, Grid, Tag, TextArea, Tile, ToastNotification,
} from '@carbon/react';
import {
  AiGenerate, Notification, Information, Time, CheckmarkFilled, ArrowRight,
} from '@carbon/icons-react';
import { PageHeader } from '../components/PageHeader';
import { useAskStore } from '../hooks/useAskStore';
import { MEETING, PRIMARY_COMMAND, USER } from '../constants/askMock';
import {
  ActivityModal, CompanionModal, CompletionModal, ConsentModal, ExecutionModal,
  ModeModal, MomWorkspaceModal, MonitoringModal, PlanModal, ProcessingModal,
  ScopeModal, WorkflowModal, type FlowName,
} from '../components/ask/AskFlows';
import styles from './AskPage.module.scss';

const PROMPTS: ReadonlyArray<[string, string]> = [
  ['Prepare the MOM for my last meeting', PRIMARY_COMMAND],
  ['Summarise my emails and update the project', 'Summarise my Project Phoenix emails and update the timeline.'],
  ['What needs my approval today?', "What's waiting for my approval right now?"],
  ['Follow up on overdue tasks', 'Follow up with owners on any overdue Phoenix tasks.'],
];

export default function AskPage() {
  const store = useAskStore();
  const [flow, setFlow] = useState<FlowName | null>(null);
  const [composer, setComposer] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  };
  const go = (f: FlowName | null) => setFlow(f);

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    store.pushMessage({ kind: 'user', text: t });
    setComposer('');
    store.transition('request_understood');
    const low = t.toLowerCase();
    window.setTimeout(() => {
      if (/(mom|minutes|meeting|jira|record|follow)/.test(low)) {
        store.pushMessage({ kind: 'plan', text: "Got it. I'll capture the meeting, draft the MOM for your approval, create the Jira tasks, update the timeline and follow up with owners. Here's my plan — nothing runs until you approve." });
        store.transition('plan_ready');
      } else {
        store.pushMessage({ kind: 'text', text: 'I can help with that. For the full agentic demo, try "Prepare the MOM for my last meeting" — I\'ll show consent, the plan, approval and execution.' });
      }
    }, 450);
  };

  const flowProps = { onClose: () => setFlow(null), go, notify };

  return (
    <div className="page">
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <div className={styles.headRow}>
            <PageHeader title="Ask Buddy" subtitle={`${greeting}, ${USER.name.split(' ')[0]} — I plan before I act. Nothing runs without your approval.`} />
            <Button kind="ghost" size="sm" hasIconOnly iconDescription="Activity & audit" renderIcon={Notification} onClick={() => go('activity')} />
          </div>
        </Column>

        {/* Context bar */}
        <Column sm={4} md={8} lg={12}>
          <div className={styles.ctxBar}>
            <button type="button" className={styles.ctxItem} onClick={() => go('scope')}>
              <span className={styles.ctxK}>Scope</span>
              <span className={styles.ctxV}>{store.context.scopeLabel}</span>
            </button>
            <div className={styles.ctxApps} aria-label="Connected apps">
              {store.context.apps.map((a) => <Tag key={a} type="cool-gray" size="sm">{a}</Tag>)}
            </div>
            <button type="button" className={styles.ctxItem} onClick={() => go('mode')}>
              <span className={styles.ctxK}>Mode</span>
              <span className={styles.ctxV}>{store.context.mode}</span>
            </button>
            <span className={styles.ctxPrivacy}>{store.context.privacy}</span>
          </div>
        </Column>

        {/* Conversation / empty state */}
        <Column sm={4} md={8} lg={8}>
          {store.messages.length === 0 ? (
            <>
              <section className="section" aria-label="Suggested prompts">
                <h3 className="section__title">Try asking</h3>
                <div className={styles.promptGrid}>
                  {PROMPTS.map(([label, cmd]) => (
                    <button key={label} type="button" className={styles.promptCard} onClick={() => submit(cmd)}>
                      <AiGenerate />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="section" aria-label="Upcoming meeting">
                <h3 className="section__title">Upcoming meeting</h3>
                <Tile className={styles.assistCard}>
                  <div className={styles.assistTitle}>{MEETING.title}</div>
                  <div className={styles.sub}>{MEETING.date} · {MEETING.platform} · {MEETING.participants.length} people</div>
                  <Button kind="primary" renderIcon={AiGenerate} onClick={() => submit(PRIMARY_COMMAND)}>Set up meeting assistant</Button>
                </Tile>
              </section>
            </>
          ) : (
            <section className="section" aria-label="Conversation" aria-live="polite">
              <div className="stack">
                {store.messages.map((m) => {
                  if (m.kind === 'user') return <div key={m.id} className={`${styles.bubble} ${styles.bubbleUser}`}>{m.text}</div>;
                  if (m.kind === 'text') return <div key={m.id} className={`${styles.bubble} ${styles.bubbleBuddy}`}><AiGenerate className={styles.buddyMark} /> {m.text}</div>;
                  if (m.kind === 'plan') {
                    return (
                      <div key={m.id} className={`${styles.bubble} ${styles.bubbleBuddy}`}>
                        <div><AiGenerate className={styles.buddyMark} /> {m.text}</div>
                        <div className={styles.planPreview}>
                          {['Send internal MOM to 6 employees', 'Send client-safe MOM to 2 vendors', 'Create 4 Jira tasks & assign owners', '+6 more steps'].map((p, i) => (
                            <div key={p} className={styles.planPreviewRow}><span className={styles.ppNum}>{i < 3 ? i + 1 : '…'}</span>{p}</div>
                          ))}
                        </div>
                        <div className={styles.bubbleActions}>
                          <Button size="sm" kind="primary" onClick={() => go('consent')}>Start with the meeting</Button>
                          <Button size="sm" kind="ghost" onClick={() => go('plan')}>Review full plan</Button>
                        </div>
                        <p className={styles.fineprint}>Nothing runs until you approve. External sends need explicit sign-off.</p>
                      </div>
                    );
                  }
                  if (m.kind === 'completion') {
                    return (
                      <div key={m.id} className={`${styles.bubble} ${styles.bubbleBuddy}`}>
                        <div className={styles.compLine}><CheckmarkFilled className={styles.icOk} /> Done — 2 MOM versions sent, 4 Jira tasks created, timeline updated. One task needed your attention.</div>
                        <Button size="sm" kind="primary" onClick={() => go('completion')}>View completion &amp; evidence</Button>
                      </div>
                    );
                  }
                  if (m.kind === 'followup') {
                    return (
                      <div key={m.id} className={`${styles.bubble} ${styles.bubbleBuddy} ${styles.followup}`}>
                        <div className={styles.compLine}><Information className={styles.icAmber} /> <strong>Follow-up watch</strong></div>
                        <p className={styles.body}>Rahul&apos;s API readiness task is due tomorrow and still To Do. It blocks Ananya&apos;s integration work.</p>
                        <Button size="sm" kind="tertiary" onClick={() => go('monitoring')}>Handle follow-up</Button>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </section>
          )}
        </Column>

        {/* Status rail */}
        <Column sm={4} md={8} lg={4}>
          <section className="section" aria-label="Status">
            <h3 className="section__title">Status</h3>
            <div className="stack">
              <button type="button" className={styles.statusCard}
                onClick={() => (store.journey === 'plan_ready' || store.messages.some((m) => m.kind === 'plan')) ? go('plan') : notify('Nothing waiting.')}>
                <Information />
                <div><div className={styles.statusV}>{store.messages.some((m) => m.kind === 'plan') && store.journey !== 'completed' ? '1 plan' : 'None'}</div><div className={styles.sub}>Waiting for approval</div></div>
              </button>
              <button type="button" className={styles.statusCard} onClick={() => store.monitoringOn ? go('monitoring') : notify('No monitoring yet.')}>
                <Time />
                <div><div className={styles.statusV}>{store.monitoringOn ? '1 rule' : 'None'}</div><div className={styles.sub}>Active monitoring</div></div>
              </button>
              {store.workflowSaved && (
                <button type="button" className={styles.statusCard} onClick={() => go('workflow')}>
                  <CheckmarkFilled className={styles.icOk} />
                  <div><div className={styles.statusV}>Active</div><div className={styles.sub}>Saved workflow</div></div>
                </button>
              )}
            </div>
          </section>
        </Column>

        {/* Composer */}
        <Column sm={4} md={8} lg={12}>
          <div className={styles.composer}>
            <TextArea
              id="ask-composer"
              labelText="Ask Buddy"
              hideLabel
              rows={1}
              placeholder="Ask Buddy, or describe what you want done…"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(composer); } }}
            />
            <Button hasIconOnly iconDescription="Send" renderIcon={ArrowRight} onClick={() => submit(composer)} />
          </div>
        </Column>
      </Grid>

      {flow === 'consent' && <ConsentModal {...flowProps} />}
      {flow === 'companion' && <CompanionModal {...flowProps} />}
      {flow === 'processing' && <ProcessingModal {...flowProps} />}
      {flow === 'mom' && <MomWorkspaceModal {...flowProps} />}
      {flow === 'plan' && <PlanModal {...flowProps} />}
      {flow === 'execution' && <ExecutionModal {...flowProps} />}
      {flow === 'completion' && <CompletionModal {...flowProps} />}
      {flow === 'monitoring' && <MonitoringModal {...flowProps} />}
      {flow === 'workflow' && <WorkflowModal {...flowProps} />}
      {flow === 'activity' && <ActivityModal {...flowProps} />}
      {flow === 'scope' && <ScopeModal {...flowProps} />}
      {flow === 'mode' && <ModeModal {...flowProps} />}

      {toast && (
        <div className={styles.toastWrap}>
          <ToastNotification kind="info" lowContrast title={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
