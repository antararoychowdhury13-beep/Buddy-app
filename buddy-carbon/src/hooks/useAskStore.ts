import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AskContext, Assumption, AuditEvent, ExecutionStatus, JourneyState, MeetingState,
  Message, MomAudience, PlanStep, AgentMode, ContextScopeType, Evidence,
} from '../types/ask';
import { ASSUMPTIONS, buildPlan } from '../constants/askMock';

/**
 * Ask Buddy state machine + persistence, ported from the prototype's AskStore.
 * The journey is modelled as explicit states so impossible states can't happen
 * (no execution before approval, no recording without a consent path).
 */
export interface AskState {
  journey: JourneyState;
  meeting: MeetingState;
  messages: Message[];
  context: AskContext;
  plan: PlanStep[];
  assumptions: Assumption[];
  approvedStepIds: string[];
  consentPath: 'record' | 'notes_only' | 'declined' | null;
  momEdits: Record<string, string>;
  momConfirmed: string[];
  momRemoved: string[];
  launchCorrected: boolean;
  externalRedacted: boolean;
  activeAudience: MomAudience;
  priyaResolution: string | null;
  monitoringOn: boolean;
  workflowSaved: boolean;
  audit: AuditEvent[];

  // actions
  pushMessage: (m: Omit<Message, 'id' | 'at'>) => void;
  transition: (to: JourneyState) => void;
  meetingTo: (to: MeetingState) => void;
  logAudit: (action: string, detail: string) => void;
  setScope: (label: string, type: ContextScopeType) => void;
  setMode: (mode: AgentMode) => void;
  setConsentPath: (path: 'record' | 'notes_only' | 'declined') => void;
  toggleStep: (id: string) => void;
  approveStep: (id: string, approved: boolean) => void;
  editAssumption: (id: string, text: string) => void;
  editMomSection: (id: string, body: string) => void;
  confirmAction: (id: string) => void;
  removeAction: (id: string) => void;
  restoreRemoved: () => void;
  correctLaunch: () => void;
  redactExternal: () => void;
  setAudience: (a: MomAudience) => void;
  setStepStatus: (id: string, status: ExecutionStatus, evidence?: Evidence, error?: string) => void;
  resolvePriya: (msg: string) => void;
  setMonitoring: (on: boolean) => void;
  saveWorkflow: () => void;
  reset: () => void;
}

function freshContext(): AskContext {
  return {
    scopeType: 'project', scopeLabel: 'Work → Project Phoenix',
    apps: ['Teams', 'Outlook', 'Jira'], mode: 'prepare', privacy: 'Private to Antara',
  };
}

const initial = () => ({
  journey: 'idle' as JourneyState,
  meeting: 'upcoming' as MeetingState,
  messages: [] as Message[],
  context: freshContext(),
  plan: buildPlan(),
  assumptions: ASSUMPTIONS.map((a) => ({ ...a })),
  approvedStepIds: [] as string[],
  consentPath: null,
  momEdits: {} as Record<string, string>,
  momConfirmed: [] as string[],
  momRemoved: [] as string[],
  launchCorrected: false,
  externalRedacted: false,
  activeAudience: 'internal' as MomAudience,
  priyaResolution: null,
  monitoringOn: false,
  workflowSaved: false,
  audit: [] as AuditEvent[],
});

const rid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const useAskStore = create<AskState>()(
  persist(
    (set) => ({
      ...initial(),

      pushMessage: (m) =>
        set((s) => ({ messages: [...s.messages, { id: rid('msg'), at: Date.now(), ...m }] })),

      transition: (to) => set({ journey: to }),
      meetingTo: (to) => set({ meeting: to }),

      logAudit: (action, detail) =>
        set((s) => ({
          audit: [
            { id: rid('au'), at: Date.now(), actor: 'Antara', action, detail, scope: s.context.scopeLabel },
            ...s.audit,
          ].slice(0, 80),
        })),

      setScope: (label, type) =>
        set((s) => ({
          context: {
            ...s.context, scopeLabel: label, scopeType: type,
            privacy: type === 'personal' ? 'Private to Antara · personal' : 'Private to Antara',
          },
        })),

      setMode: (mode) => set((s) => ({ context: { ...s.context, mode } })),
      setConsentPath: (path) => set({ consentPath: path }),

      toggleStep: (id) =>
        set((s) => {
          const plan = s.plan.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p));
          const stillEnabled = plan.find((p) => p.id === id)?.enabled;
          return {
            plan,
            approvedStepIds: stillEnabled ? s.approvedStepIds : s.approvedStepIds.filter((x) => x !== id),
          };
        }),

      approveStep: (id, approved) =>
        set((s) => ({
          approvedStepIds: approved
            ? Array.from(new Set([...s.approvedStepIds, id]))
            : s.approvedStepIds.filter((x) => x !== id),
        })),

      editAssumption: (id, text) =>
        set((s) => ({ assumptions: s.assumptions.map((a) => (a.id === id ? { ...a, text } : a)) })),

      editMomSection: (id, body) => set((s) => ({ momEdits: { ...s.momEdits, [id]: body } })),
      confirmAction: (id) => set((s) => ({ momConfirmed: Array.from(new Set([...s.momConfirmed, id])) })),
      removeAction: (id) => set((s) => ({ momRemoved: Array.from(new Set([...s.momRemoved, id])) })),
      restoreRemoved: () => set({ momRemoved: [] }),
      correctLaunch: () => set({ launchCorrected: true }),
      redactExternal: () => set({ externalRedacted: true }),
      setAudience: (a) => set({ activeAudience: a }),

      setStepStatus: (id, status, evidence, error) =>
        set((s) => ({
          plan: s.plan.map((p) => (p.id === id ? { ...p, status, evidence: evidence ?? p.evidence, error } : p)),
        })),

      resolvePriya: (msg) => set({ priyaResolution: msg }),
      setMonitoring: (on) => set({ monitoringOn: on }),
      saveWorkflow: () => set({ workflowSaved: true }),

      reset: () => set({ ...initial() }),
    }),
    { name: 'buddy.ask.carbon.v1' },
  ),
);

/** Guard: every enabled approval-required step must be approved. */
export function canExecute(s: Pick<AskState, 'plan' | 'approvedStepIds'>): boolean {
  return s.plan.filter((p) => p.enabled && p.approvalRequired).every((p) => s.approvedStepIds.includes(p.id));
}

export function enabledSteps(s: Pick<AskState, 'plan'>): PlanStep[] {
  return s.plan.filter((p) => p.enabled);
}
