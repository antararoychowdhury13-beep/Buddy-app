import { useEffect, useRef, useState } from 'react';
import {
  Accordion, AccordionItem, ActionableNotification, Button, Checkbox, ContentSwitcher, DataTable,
  InlineNotification, ListItem, Modal, RadioButton, RadioButtonGroup, StructuredListBody,
  StructuredListCell, StructuredListHead, StructuredListRow, StructuredListWrapper, Switch, Table,
  TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag, TextInput,
  Toggle, UnorderedList,
} from '@carbon/react';
import {
  CheckmarkFilled, Information, WarningAltFilled, Undo, Security, Send,
} from '@carbon/icons-react';
import {
  CONSENT, MEETING, PARTICIPANTS, USER, buildMom,
} from '../../constants/askMock';
import { GRANTED, runnerFor } from '../../services/ask/services';
import { canExecute, enabledSteps, useAskStore } from '../../hooks/useAskStore';
import type { MomAudience } from '../../types/ask';
import { ConfTag, Field, RiskTag } from './askShared';
import styles from './AskFlows.module.scss';

type Notify = (msg: string) => void;
export type FlowName =
  | 'consent' | 'companion' | 'processing' | 'mom' | 'plan' | 'execution'
  | 'completion' | 'monitoring' | 'workflow' | 'activity' | 'scope' | 'mode';

interface FlowProps {
  onClose: () => void;
  go: (f: FlowName | null) => void;
  notify: Notify;
}

// ============ CONSENT ============
export function ConsentModal({ onClose, go, notify }: FlowProps) {
  const { meetingTo, setConsentPath, logAudit } = useAskStore();
  useEffect(() => { meetingTo('consent_pending'); }, [meetingTo]);

  const choose = (path: 'record' | 'notes_only') => {
    setConsentPath(path);
    logAudit('Consent chosen', path === 'record' ? 'Recording with consent' : 'Notes only');
    go('companion');
  };

  return (
    <Modal open onRequestClose={onClose} modalHeading="Before Buddy captures this meeting" modalLabel="Consent" passiveModal size="md">
      <InlineNotification kind="info" lowContrast hideCloseButton title="Nothing is captured yet"
        subtitle="External guests are notified, not recorded individually. Choose a path below." />
      <Section label="Purpose"><p className={styles.body}>{CONSENT.purpose}</p></Section>
      <Section label="What's captured">
        <UnorderedList>{CONSENT.captured.map((x) => <ListItem key={x}>{x}</ListItem>)}</UnorderedList>
      </Section>
      <Section label="Participants & consent">
        <StructuredListWrapper aria-label="Participants" isCondensed>
          <StructuredListBody>
            {PARTICIPANTS.map((p) => (
              <StructuredListRow key={p.id}>
                <StructuredListCell>
                  <strong>{p.name}</strong>
                  <div className={styles.sub}>{p.org === 'external' ? 'External' : 'Internal'} · {p.role}</div>
                </StructuredListCell>
                <StructuredListCell>
                  <Tag size="sm" type={p.consent === 'consented' ? 'green' : p.consent === 'pending' ? 'blue' : 'gray'}>
                    {p.consent === 'consented' ? 'Consented' : p.consent === 'pending' ? 'Pending' : p.consent === 'not_required' ? 'Notified' : 'Declined'}
                  </Tag>
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </Section>
      <Section label="Access scope"><p className={styles.body}>{CONSENT.accessScope}</p></Section>
      <Section label="Retention"><p className={styles.body}>Recording &amp; transcript kept for {CONSENT.retentionDays} days, then deleted.</p></Section>
      <Section label="Alternatives">
        <UnorderedList>{CONSENT.alternatives.map((a) => <ListItem key={a}>{a}</ListItem>)}</UnorderedList>
      </Section>
      <div className={styles.actionCol}>
        <Button kind="primary" onClick={() => choose('record')}>I have consent — start recording</Button>
        <Button kind="tertiary" onClick={() => choose('notes_only')}>Notes only (no audio kept)</Button>
        <Button kind="ghost" onClick={() => { notify('Capture declined — nothing recorded.'); meetingTo('upcoming'); onClose(); }}>Decline</Button>
      </div>
      <p className={styles.fineprint}>Simulated capture — no real audio is recorded in this demo.</p>
    </Modal>
  );
}

// ============ LIVE COMPANION ============
export function CompanionModal({ onClose, go, notify }: FlowProps) {
  const { meetingTo, consentPath } = useAskStore();
  const path = consentPath === 'notes_only' ? 'notes_only' : 'record';
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [offRecord, setOffRecord] = useState(false);

  useEffect(() => { meetingTo(path === 'record' ? 'recording' : 'ready'); }, [meetingTo, path]);
  useEffect(() => {
    const t = window.setInterval(() => { if (!paused) setSeconds((s) => s + 1); }, 1000);
    return () => window.clearInterval(t);
  }, [paused]);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const stateLabel = offRecord ? 'Off the record' : path === 'record' ? 'Recording' : 'Notes only';

  return (
    <Modal open onRequestClose={onClose} modalHeading="Meeting companion" modalLabel="Live capture" passiveModal size="md">
      <div className={styles.recBar}>
        {path === 'record' && !offRecord ? <span className={styles.recDot} aria-hidden /> : <Information />}
        <strong>{stateLabel}</strong>
        <span className={styles.timer}>{clock}</span>
        <Tag type="green" size="sm">Consent ✓</Tag>
      </div>
      <Section label="Active speaker"><p className={styles.body}>Rahul Mehta</p></Section>
      <Section label="Decisions so far">
        <UnorderedList>
          <ListItem>Beta launch → 28 August (corrected from 18 Aug)</ListItem>
          <ListItem>Accessibility testing before stakeholder review</ListItem>
        </UnorderedList>
      </Section>
      <Section label="Proposed actions">
        <UnorderedList>
          <ListItem>Ananya — revise onboarding flow (24 Jul)</ListItem>
          <ListItem>Rahul — confirm API readiness (28 Jul)</ListItem>
        </UnorderedList>
      </Section>
      <div className={styles.chipRow}>
        <Button size="sm" kind="ghost" onClick={() => notify('Moment marked ✓')}>Mark important</Button>
        <Button size="sm" kind="ghost" onClick={() => notify('Note added ✓')}>Add note</Button>
        <Button size="sm" kind="ghost" onClick={() => { setOffRecord((o) => !o); notify(offRecord ? 'Back on record.' : 'Off the record — not captured.'); }}>
          {offRecord ? 'Back on record' : 'Off record'}
        </Button>
      </div>
      <div className={styles.actionCol}>
        <Button kind="ghost" onClick={() => { setPaused((p) => !p); notify(paused ? 'Resumed.' : 'Paused.'); }}>Pause / Resume</Button>
        <Button kind="primary" onClick={() => { meetingTo('processing'); go('processing'); }}>End meeting</Button>
      </div>
      <p className={styles.fineprint}>Deterministic simulated meeting — no real microphone or Teams connection.</p>
    </Modal>
  );
}

// ============ PROCESSING ============
const PROC_STEPS = ['Processing transcript', 'Identifying speakers', 'Extracting decisions', 'Detecting action items', 'Checking project context', 'Generating MOM'];
export function ProcessingModal({ onClose, go }: FlowProps) {
  const { meetingTo, logAudit, pushMessage } = useAskStore();
  const [idx, setIdx] = useState(0);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (idx >= PROC_STEPS.length) {
      meetingTo('review_ready');
      logAudit('MOM generated', MEETING.title);
      pushMessage({ kind: 'text', text: 'Your MOM is ready to review. I flagged one action item that needs confirmation and a launch date to double-check.' });
      const t = window.setTimeout(() => go('mom'), reduce ? 60 : 300);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setIdx((i) => i + 1), reduce ? 120 : 700);
    return () => window.clearTimeout(t);
  }, [idx, go, meetingTo, logAudit, pushMessage, reduce]);

  return (
    <Modal open onRequestClose={onClose} modalHeading="Processing meeting" modalLabel="Working" passiveModal size="sm">
      <p className={styles.body}>Buddy is turning the meeting into a structured MOM. You can leave — I&apos;ll notify you when it&apos;s ready.</p>
      <div className={styles.procList}>
        {PROC_STEPS.map((s, i) => (
          <div key={s} className={`${styles.procRow} ${i < idx ? styles.procDone : i === idx ? styles.procActive : ''}`}>
            {i < idx ? <CheckmarkFilled className={styles.procIcOk} /> : <span className={styles.procDot} aria-hidden />}
            <span>{s}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ============ MOM WORKSPACE ============
const AUDIENCES: ReadonlyArray<{ id: MomAudience; label: string; note: string }> = [
  { id: 'internal', label: 'Internal', note: 'Full detail' },
  { id: 'external', label: 'Client-safe', note: 'Confidential removed' },
  { id: 'leadership', label: 'Leadership', note: 'Summary + decisions' },
  { id: 'actions_only', label: 'Actions only', note: 'Tasks + owners' },
];
export function MomWorkspaceModal({ onClose, go, notify }: FlowProps) {
  const store = useAskStore();
  const mom = buildMom();
  const audience = store.activeAudience;

  const decisions = store.launchCorrected
    ? mom.decisions.map((d) => (d.id === 'd1' ? { ...d, text: 'Beta launch moved to 28 August.' } : d))
    : mom.decisions;

  const sections = mom.sections.filter((s) => {
    if (audience === 'actions_only') return false;
    if (audience === 'leadership') return ['s-purpose', 's-summary', 's-next'].includes(s.id) || !s.confidential;
    return true;
  });

  const visibleActions = mom.actionItems.filter((a) => !store.momRemoved.includes(a.id));

  return (
    <Modal open onRequestClose={onClose} modalHeading="MOM · Project Phoenix" modalLabel="Minutes of meeting" passiveModal size="lg">
      <ContentSwitcher selectedIndex={AUDIENCES.findIndex((a) => a.id === audience)}
        onChange={({ index }) => store.setAudience(AUDIENCES[index ?? 0].id)} size="md">
        {AUDIENCES.map((a) => <Switch key={a.id} name={a.id} text={a.label} />)}
      </ContentSwitcher>

      {audience === 'external' && (
        store.externalRedacted ? (
          <InlineNotification kind="success" lowContrast hideCloseButton title="Client-safe version"
            subtitle="Budget, staffing, vendor-negotiation notes and the recording link are removed." />
        ) : (
          <ActionableNotification kind="warning" lowContrast hideCloseButton title="Client-safe version"
            subtitle="Confidential sections are present — remove them before this goes to vendors."
            actionButtonLabel="Remove confidential"
            onActionButtonClick={() => { store.redactExternal(); store.logAudit('Redacted external MOM', 'Removed budget, staffing, vendor notes, recording link'); notify('Confidential content removed from the client-safe version.'); }} />
        )
      )}

      <div className={styles.momMeta}>
        <Field k="Meeting" v={MEETING.title} />
        <Field k="Date" v={MEETING.date} />
        <Field k="Duration" v={`${MEETING.durationMins} min`} />
        <Field k="Platform" v={MEETING.platform} />
      </div>

      {sections.map((s) => {
        const redacted = s.confidential && (audience === 'external' || audience === 'actions_only') && store.externalRedacted;
        if (redacted) {
          return (
            <div key={s.id} className={styles.momSection}>
              <div className={styles.momSecHead}><h4>{s.title}</h4><Tag type="gray" size="sm">Removed for this audience</Tag></div>
            </div>
          );
        }
        const bodyText = store.momEdits[s.id] ?? s.body;
        return (
          <div key={s.id} className={styles.momSection}>
            <div className={styles.momSecHead}>
              <h4>{s.title}</h4>
              {s.confidential && <Tag type="red" size="sm"><Security size={12} /> Confidential</Tag>}
            </div>
            <p className={styles.body}>{bodyText}</p>
          </div>
        );
      })}

      <div className={styles.momSection}>
        <div className={styles.momSecHead}><h4>Decisions</h4></div>
        {decisions.map((d) => (
          <div key={d.id} className={styles.decisionRow}>
            <CheckmarkFilled className={styles.procIcOk} />
            <div>
              <div>{d.text}</div>
              {d.corrected && !store.launchCorrected && (
                <div className={styles.conflictNote}>
                  <span>⚠ {d.corrected}</span>
                  <Button size="sm" onClick={() => { store.correctLaunch(); store.logAudit('Corrected decision', 'Launch date confirmed 28 August'); notify('Confirmed — 28 August.'); }}>Confirm 28 Aug</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {audience !== 'leadership' && (
        <div className={styles.momSection}>
          <div className={styles.momSecHead}><h4>Action items</h4></div>
          <DataTable
            rows={visibleActions.map((a) => ({
              id: a.id, task: a.title, owner: a.owner, due: a.due,
              confidence: store.momConfirmed.includes(a.id) ? 'high' : a.confidence,
            }))}
            headers={[
              { key: 'task', header: 'Task' }, { key: 'owner', header: 'Owner' },
              { key: 'due', header: 'Due' }, { key: 'confidence', header: 'Confidence' },
            ]}
          >
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()} size="sm">
                  <TableHead>
                    <TableRow>
                      {headers.map((h) => {
                        const { key: _k, ...hp } = getHeaderProps({ header: h });
                        return <TableHeader key={h.key} {...hp}>{h.header}</TableHeader>;
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const { key: _r, ...rp } = getRowProps({ row });
                      const a = visibleActions.find((x) => x.id === row.id)!;
                      const confirmed = store.momConfirmed.includes(a.id);
                      return (
                        <TableRow key={row.id} {...rp}>
                          <TableCell>{a.title}{a.transcriptRef && <div className={styles.sub}>{a.transcriptRef}</div>}</TableCell>
                          <TableCell>{a.owner}</TableCell>
                          <TableCell>{a.due}</TableCell>
                          <TableCell>
                            <ConfTag level={confirmed ? 'high' : a.confidence} />
                            {a.confidence !== 'high' && !confirmed && (
                              <Button size="sm" kind="ghost" onClick={() => { store.confirmAction(a.id); notify('Confirmed.'); }}>Confirm</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
          {store.momRemoved.length > 0 && (
            <Button size="sm" kind="ghost" renderIcon={Undo} onClick={() => { store.restoreRemoved(); notify('Restored removed items.'); }}>Restore removed</Button>
          )}
        </div>
      )}

      <div className={styles.momSection}>
        <div className={styles.momSecHead}><h4>Open questions</h4></div>
        <UnorderedList>{mom.openQuestions.map((q) => <ListItem key={q.id}>{q.text}</ListItem>)}</UnorderedList>
      </div>

      <div className={styles.actionCol}>
        <Button kind="primary" onClick={() => go('plan')}>Continue to plan</Button>
      </div>
      <p className={styles.fineprint}>Recording excerpts and transcript references are simulated.</p>
    </Modal>
  );
}

// ============ PLAN + APPROVAL ============
export function PlanModal({ onClose, go, notify }: FlowProps) {
  const store = useAskStore();
  useEffect(() => { useAskStore.getState().transition('waiting_for_approval'); }, []);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const enabled = enabledSteps(store);
  const needApproval = enabled.filter((s) => s.approvalRequired);
  const approvedCount = needApproval.filter((s) => store.approvedStepIds.includes(s.id)).length;
  const allApproved = canExecute(store);
  const irreversible = enabled.filter((s) => s.reversible === 'irreversible' || s.reversible === 'not_reliably_reversible');
  const peopleNotified = enabled.reduce((n, s) => n + (s.id === 'st-internal' ? 6 : s.id === 'st-external' ? 2 : s.id === 'st-assign' ? 4 : 0), 0);

  return (
    <Modal open onRequestClose={onClose} modalHeading="Plan before action" modalLabel="Review & approve" passiveModal size="lg">
      <p className={styles.body}>Review, edit, enable/disable and approve. High-impact steps need explicit sign-off before anything runs.</p>

      <Section label="Assumptions Buddy is making">
        {store.assumptions.map((a) => (
          <div key={a.id} className={styles.assumptionRow}>
            <Information />
            <span className={styles.grow}>{a.text}</span>
            <Button size="sm" kind="ghost" onClick={() => { setEditing(a.id); setEditVal(a.text); }}>Edit</Button>
          </div>
        ))}
      </Section>

      {editing && (
        <div className={styles.editBox}>
          <TextInput id="edit-assumption" labelText="Edit assumption" value={editVal} onChange={(e) => setEditVal(e.target.value)} />
          <Button size="sm" onClick={() => { store.editAssumption(editing, editVal); setEditing(null); notify('Assumption updated.'); }}>Save</Button>
        </div>
      )}

      {store.plan.map((s, i) => (
        <div key={s.id} className={`${styles.planStep} ${s.enabled ? '' : styles.planStepOff}`}>
          <div className={styles.planStepTop}>
            <span className={styles.psNum}>{i + 1}</span>
            <div className={styles.grow}>
              <div className={styles.psTitle}>{s.title}</div>
              <div className={styles.psMeta}>
                <Tag type="cool-gray" size="sm">{s.application}</Tag>
                <RiskTag risk={s.risk} label={s.riskLabel} />
              </div>
            </div>
          </div>
          <div className={styles.toggleRow}>
            <Toggle id={`toggle-${s.id}`} size="sm" labelText="" labelA="Excluded" labelB="Included"
              aria-label={`Include ${s.title}`} toggled={s.enabled} onToggle={() => store.toggleStep(s.id)} />
          </div>
          {s.enabled && (
            <Accordion size="sm">
              <AccordionItem title="Details, side effects & reversibility">
                <p className={styles.body}>{s.description}</p>
                <div className={styles.psGrid}>
                  <Field k="Reversibility" v={s.reversibleLabel} />
                  <Field k="Permission" v={GRANTED.has(s.permission) ? `${s.permission} ✓` : `${s.permission} — not granted`} />
                  {s.dependencies.length > 0 && <Field k="Depends on" v={s.dependencies.join(', ')} />}
                  {s.sideEffects.length > 0 && <Field k="Side effects" v={s.sideEffects.join('; ')} />}
                </div>
              </AccordionItem>
            </Accordion>
          )}
          {s.enabled && s.approvalRequired && (
            <Checkbox id={`approve-${s.id}`} className={styles.approveBox}
              labelText={`I approve this ${s.risk === 'high' ? 'high-impact ' : ''}step (${s.riskLabel.toLowerCase()})`}
              checked={store.approvedStepIds.includes(s.id)}
              onChange={(_e, { checked }) => store.approveStep(s.id, checked)} />
          )}
        </div>
      ))}

      <Section label="Before you approve">
        <Field k="Actions" v={`${enabled.length} enabled`} />
        <Field k="External recipients" v={enabled.some((s) => s.id === 'st-external') ? '2' : '0'} />
        <Field k="Systems affected" v={[...new Set(enabled.map((s) => s.application))].join(', ')} />
        <Field k="People notified" v={String(peopleNotified)} />
        <Field k="Hard to reverse" v={irreversible.length ? irreversible.map((s) => s.title).join('; ') : 'None'} />
        <Field k="Outstanding uncertainties" v={store.momConfirmed.includes('a3') ? 'None' : '1 — accessibility checklist owner'} />
      </Section>

      <div className={styles.approvalBar}>
        <span className={styles.approvalInfo}>{enabled.length} steps · {approvedCount}/{needApproval.length} approved</span>
        <Button kind="ghost" onClick={() => { notify('Saved for later.'); onClose(); }}>Later</Button>
        <Button kind="primary" disabled={!allApproved}
          onClick={() => { store.logAudit('Approved plan', `${enabled.length} steps`); go('execution'); }}>
          {allApproved ? 'Approve & execute' : `Approve ${needApproval.length - approvedCount} more`}
        </Button>
      </div>
    </Modal>
  );
}

// ============ EXECUTION + RECOVERY ============
const STATUS_TAG: Record<string, { type: 'gray' | 'blue' | 'green' | 'red' | 'magenta'; label: string }> = {
  queued: { type: 'gray', label: 'Queued' },
  in_progress: { type: 'blue', label: 'Running' },
  completed: { type: 'green', label: 'Completed' },
  failed: { type: 'red', label: 'Needs attention' },
  partially_completed: { type: 'magenta', label: 'Partial' },
  cancelled: { type: 'gray', label: 'Cancelled' },
};
export function ExecutionModal({ onClose, go }: FlowProps) {
  const [tick, setTick] = useState(0); // forces re-read of store plan
  const idxRef = useRef(0);
  const finishedRef = useRef(false);
  const rerun = () => setTick((t) => t + 1);

  // Single sequential driver. Runs steps in order from idxRef; pauses (returns)
  // when a step fails, and is re-entered by resolvePriya after recovery. finish
  // is guarded so completion messages fire exactly once.
  const drive = async () => {
    const s = useAskStore.getState();
    const cur = enabledSteps(s);
    if (idxRef.current >= cur.length) { finish(); return; }
    const step = cur[idxRef.current];
    if (step.status === 'cancelled' || step.status === 'completed' || step.status === 'partially_completed') {
      idxRef.current++; return drive();
    }
    s.setStepStatus(step.id, 'in_progress'); rerun();
    const res = await runnerFor(step)(step);
    if (res.status === 'completed') {
      s.setStepStatus(step.id, 'completed', res.evidence); s.logAudit('Executed step', step.title);
      idxRef.current++; rerun();
      window.setTimeout(drive, 420);
    } else {
      s.setStepStatus(step.id, 'failed', undefined, res.error); s.logAudit('Step needs attention', res.error ?? step.title);
      rerun(); // pause here until resolvePriya re-enters drive()
    }
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const s = useAskStore.getState();
    const anyFail = enabledSteps(s).some((x) => x.status === 'failed');
    s.transition(anyFail ? 'partially_completed' : 'completed');
    s.setMonitoring(true);
    window.setTimeout(() => {
      s.pushMessage({ kind: 'completion' });
      window.setTimeout(() => { s.pushMessage({ kind: 'followup' }); s.transition('monitoring'); }, 900);
      go('completion');
    }, 500);
  };

  useEffect(() => {
    useAskStore.getState().transition('executing');
    const t = window.setTimeout(drive, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvePriya = (msg: string) => {
    const s = useAskStore.getState();
    s.resolvePriya(msg);
    s.logAudit('Resolved assignment failure', msg);
    const failStep = enabledSteps(s).find((x) => x.status === 'failed');
    if (failStep) {
      s.setStepStatus(failStep.id, 'partially_completed', {
        kind: 'jira', id: 'ASN-RES', label: '3 of 4 assigned · 1 resolved', actor: 'Antara', at: Date.now(), recipients: 3, detail: msg,
      });
    }
    idxRef.current++; // move past the resolved step
    rerun();
    window.setTimeout(drive, 300);
  };

  void tick;
  const current = enabledSteps(useAskStore.getState());

  return (
    <Modal open onRequestClose={onClose} modalHeading="Executing plan" modalLabel="Buddy is executing" passiveModal size="md">
      <p className={styles.body}>Running approved steps in order. Completed actions are kept even if a later step needs attention.</p>
      <div className={styles.execTimeline}>
        {current.map((s) => (
          <div key={s.id} className={styles.execNode}>
            <span className={styles.execRail} aria-hidden>
              {s.status === 'completed' ? <CheckmarkFilled className={styles.procIcOk} />
                : s.status === 'failed' ? <WarningAltFilled className={styles.icAmber} />
                : <span className={styles.execDot} />}
            </span>
            <div className={styles.grow}>
              <div className={styles.execTop}>
                <span className={styles.psTitle}>{s.title}</span>
                <Tag type={STATUS_TAG[s.status]?.type ?? 'gray'} size="sm">{STATUS_TAG[s.status]?.label ?? 'Queued'}</Tag>
              </div>
              {(s.status === 'completed' || s.status === 'partially_completed') && s.evidence && (
                <div className={styles.evidenceLine}><Information size={14} /> {s.evidence.label} <span className={styles.sub}>{s.evidence.id}</span></div>
              )}
              {s.status === 'failed' && (
                <div className={styles.failureCard}>
                  <div className={styles.failMsg}><WarningAltFilled className={styles.icAmber} /> {s.error ?? "Couldn't complete this step."}</div>
                  <div className={styles.sub}>3 of 4 tasks assigned. Created tasks are kept — only Priya&apos;s assignment failed.</div>
                  <div className={styles.chipRow}>
                    <Button size="sm" kind="ghost" onClick={() => resolvePriya('Access request sent to admin — Priya will be assigned once granted.')}>Invite Priya to project</Button>
                    <Button size="sm" kind="ghost" onClick={() => resolvePriya('Reassigned to Antara — Priya can take it over later.')}>Assign to Antara for now</Button>
                    <Button size="sm" kind="ghost" onClick={() => resolvePriya('Left unassigned with a note on the task.')}>Keep unassigned</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ============ COMPLETION ============
export function CompletionModal({ onClose, go }: FlowProps) {
  const store = useAskStore();
  const rows: [string, string, boolean][] = [
    ['Internal MOM sent', '6 recipients · MSG-1001', true],
    ['Client-safe MOM sent', '2 vendors · external', true],
    ['4 Jira tasks created', 'Sprint 24 · PHX-240–243', true],
    ['Task assignment', store.priyaResolution ? '3 assigned · 1 resolved' : '3 of 4 assigned', !!store.priyaResolution],
    ['Project timeline updated', 'Beta 26 → 28 Aug', true],
    ['Stakeholder review booked', '25 Jul · 6 attendees', true],
    ['Monitoring activated', 'Reminders + overdue escalation', true],
  ];
  return (
    <Modal open onRequestClose={onClose} modalHeading="Completion summary" modalLabel="Plan executed" passiveModal size="md">
      <div className={styles.compHero}>
        <CheckmarkFilled className={styles.procIcOk} size={24} />
        <div><div className={styles.psTitle}>Plan executed</div><div className={styles.sub}>8 recipients reached · 1 item you resolved</div></div>
      </div>
      {rows.map(([k, v, ok]) => (
        <div key={k} className={styles.compRow}>
          {ok ? <CheckmarkFilled className={styles.procIcOk} /> : <WarningAltFilled className={styles.icAmber} />}
          <div><div className={styles.psTitle}>{k}</div><div className={styles.sub}>{v}</div></div>
        </div>
      ))}
      {store.priyaResolution && (
        <InlineNotification kind="success" lowContrast hideCloseButton title="Resolved" subtitle={store.priyaResolution} />
      )}
      <div className={styles.actionCol}>
        <Button kind="primary" renderIcon={Send} onClick={() => go('workflow')}>Turn this into a reusable workflow</Button>
        <Button kind="tertiary" onClick={() => go('activity')}>View audit history</Button>
        <Button kind="ghost" onClick={() => go('monitoring')}>Set up follow-up monitoring</Button>
      </div>
    </Modal>
  );
}

// ============ MONITORING ============
export function MonitoringModal({ onClose, notify }: FlowProps) {
  const store = useAskStore();
  const [handled, setHandled] = useState(false);
  return (
    <Modal open onRequestClose={onClose} modalHeading="Follow-up monitoring" modalLabel="Standing rule" passiveModal size="sm">
      <InlineNotification kind="warning" lowContrast hideCloseButton title="Rahul's API readiness task"
        subtitle="Due tomorrow and still To Do. It blocks Ananya's integration work." />
      {handled ? (
        <InlineNotification kind="success" lowContrast hideCloseButton title="Handled"
          subtitle="Buddy sent Rahul a standard check-in and logged it. Evidence: MON-check-in." />
      ) : (
        <div className={styles.actionCol}>
          <Button kind="primary" onClick={() => { setHandled(true); store.logAudit('Monitoring action', 'Sent Rahul a standard check-in'); notify('Check-in sent to Rahul · evidence recorded.'); }}>Ask Rahul for an update</Button>
          <Button kind="ghost" onClick={() => { notify('Deadline extended by 2 days.'); store.logAudit('Monitoring action', 'Extended deadline'); }}>Extend deadline</Button>
          <Button kind="ghost" onClick={() => { notify('PM notified.'); store.logAudit('Monitoring action', 'Notified project manager'); }}>Notify project manager</Button>
          <Button kind="ghost" onClick={onClose}>Do nothing</Button>
        </div>
      )}
      <p className={styles.fineprint}>Authorised standing rule — Buddy can send a standard check-in and record evidence, but won&apos;t change deadlines or owners without you.</p>
    </Modal>
  );
}

// ============ WORKFLOW BUILDER ============
const AUTONOMY: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'ask_each_time', label: 'Ask each time' },
  { id: 'plan_then_act', label: 'Plan, then act on approval' },
  { id: 'auto_low_risk', label: 'Auto-run low-risk only' },
];
export function WorkflowModal({ onClose, notify }: FlowProps) {
  const store = useAskStore();
  const [autonomy, setAutonomy] = useState('plan_then_act');
  return (
    <Modal open onRequestClose={onClose} modalHeading="Save as workflow" modalLabel="Reusable automation" passiveModal size="md">
      <InlineNotification kind="info" lowContrast hideCloseButton title="Weekly Project Meeting Assistant"
        subtitle={`After a Project Phoenix meeting ends, Buddy will prepare the MOM, ask ${USER.name.split(' ')[0]} to approve external sharing, create confirmed Jira tasks and monitor deadlines.`} />
      <div className={styles.momMeta}>
        <Field k="Trigger" v="After a Project Phoenix meeting ends" />
        <Field k="Scope" v="Work → Project Phoenix" />
        <Field k="Connected apps" v="Teams, Outlook, Jira" />
        <Field k="Approval points" v="Ask before external sharing" />
        <Field k="Reminders" v="24h before each deadline" />
        <Field k="Data retention" v="30 days" />
      </div>
      <Section label="Autonomy level">
        <RadioButtonGroup name="autonomy" valueSelected={autonomy} onChange={(v) => setAutonomy(String(v))} orientation="vertical">
          {AUTONOMY.map((a) => <RadioButton key={a.id} id={`auton-${a.id}`} labelText={a.label} value={a.id} />)}
        </RadioButtonGroup>
      </Section>
      <div className={styles.actionCol}>
        <Button kind="primary" onClick={() => { store.saveWorkflow(); store.transition('workflow_saved'); store.logAudit('Activated workflow', 'Weekly Project Meeting Assistant'); notify('Workflow activated — it keeps your approval points.'); onClose(); }}>Activate workflow</Button>
        <Button kind="tertiary" onClick={() => notify('Test run — Buddy simulated the workflow end to end.')}>Test workflow</Button>
      </div>
      <p className={styles.fineprint}>Approval points are always kept — even &apos;auto-run&apos; never sends external email without you.</p>
    </Modal>
  );
}

// ============ ACTIVITY / AUDIT ============
export function ActivityModal({ onClose, notify }: FlowProps) {
  const store = useAskStore();
  return (
    <Modal open onRequestClose={onClose} modalHeading="Activity & audit" modalLabel="Trail" passiveModal size="md">
      <p className={styles.body}>Every meaningful action Buddy took, with who approved it and the scope.</p>
      {store.audit.length === 0 ? (
        <p className={styles.sub}>No activity yet — start the meeting assistant to see the trail.</p>
      ) : (
        <StructuredListWrapper aria-label="Audit trail" isCondensed>
          <StructuredListHead>
            <StructuredListRow head><StructuredListCell head>Action</StructuredListCell><StructuredListCell head>Detail</StructuredListCell></StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {store.audit.map((a) => (
              <StructuredListRow key={a.id}>
                <StructuredListCell><strong>{a.action}</strong></StructuredListCell>
                <StructuredListCell>{a.detail} · {a.actor} · {new Date(a.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}
      <div className={styles.actionCol}>
        <Button kind="danger--ghost" onClick={() => { store.reset(); notify('Ask Buddy demo reset.'); onClose(); }}>Reset Ask Buddy demo</Button>
      </div>
    </Modal>
  );
}

// ============ SCOPE + MODE PICKERS ============
const SCOPES: ReadonlyArray<[string, string]> = [
  ['Work → Project Phoenix', 'project'], ['Work (all)', 'work'], ['Today', 'today'],
  ['Personal', 'personal'], ['This conversation', 'conversation'],
];
export function ScopeModal({ onClose, notify }: FlowProps) {
  const store = useAskStore();
  return (
    <Modal open onRequestClose={onClose} modalHeading="Choose context scope" modalLabel="Active context" passiveModal size="sm">
      <p className={styles.body}>Buddy only uses the data in the scope you pick. Switching scope is always explicit.</p>
      <div className={styles.actionCol}>
        {SCOPES.map(([label, type]) => (
          <Button key={label} kind={store.context.scopeLabel === label ? 'tertiary' : 'ghost'}
            onClick={() => {
              const crossing = type === 'personal' && store.context.scopeType !== 'personal';
              store.setScope(label, type as never); store.logAudit('Changed scope', label);
              notify(crossing ? 'Switched to Personal — work data is now out of scope.' : `Scope: ${label}`); onClose();
            }}>{label}</Button>
        ))}
      </div>
      <p className={styles.fineprint}>Buddy never silently mixes Work and Personal contexts.</p>
    </Modal>
  );
}

const MODES: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: 'ask', label: 'Ask', hint: 'Answer only — no actions' },
  { id: 'prepare', label: 'Prepare', hint: "Draft a plan, don't run it" },
  { id: 'act', label: 'Act', hint: 'Run after your approval' },
  { id: 'monitor', label: 'Monitor', hint: 'Watch and follow up' },
];
export function ModeModal({ onClose, notify }: FlowProps) {
  const store = useAskStore();
  return (
    <Modal open onRequestClose={onClose} modalHeading="Agent mode" modalLabel="How Buddy acts" passiveModal size="sm">
      <div className={styles.actionCol}>
        {MODES.map((m) => (
          <button key={m.id} type="button" className={`${styles.modeRow} ${store.context.mode === m.id ? styles.modeActive : ''}`}
            onClick={() => { store.setMode(m.id as never); notify(`Mode: ${m.label}`); onClose(); }}>
            <span className={styles.psTitle}>{m.label}</span>
            <span className={styles.sub}>{m.hint}</span>
          </button>
        ))}
      </div>
      <p className={styles.fineprint}>Even in Act mode, external sends and high-impact changes still ask for approval.</p>
    </Modal>
  );
}

// ---- shared section wrapper ----
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  );
}
