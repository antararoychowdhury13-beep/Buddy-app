/** Suggested prompts and recent searches for the global AI search. */

export interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly source: string;
  readonly scope: 'Work' | 'Personal';
}

export const SUGGESTED_PROMPTS: readonly string[] = [
  'What needs my approval today?',
  'Summarise my last Project Phoenix meeting',
  'When should I leave for pickup?',
  'Show overdue tasks and who they block',
  'How is my safe-to-spend this month?',
];

export const RECENT_SEARCHES: readonly string[] = [
  'Sprint 24 status',
  'Accessibility checklist owner',
  "Aarav's parent–teacher meeting",
];

/** Deterministic mock retrieval across work and personal content. */
export function searchContent(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all: SearchResult[] = [
    { id: 'r1', title: 'Project Phoenix — Weekly Review MOM', detail: '4 decisions · 5 action items · beta moved to 28 Aug', source: 'Ask Buddy', scope: 'Work' },
    { id: 'r2', title: 'API readiness (Rahul Mehta)', detail: 'Due 28 Jul · To Do · blocks integration work', source: 'Jira', scope: 'Work' },
    { id: 'r3', title: 'Accessibility checklist owner', detail: 'Needs confirmation — flagged in the MOM', source: 'Jira', scope: 'Work' },
    { id: 'r4', title: "Aarav's parent–teacher meeting", detail: '5:45 PM · 30-min drive · protected', source: 'Calendar', scope: 'Personal' },
    { id: 'r5', title: 'Safe-to-spend this month', detail: 'On track — reviewed against upcoming bills', source: 'Life', scope: 'Personal' },
    { id: 'r6', title: 'Stakeholder review', detail: '25 Jul · 6 attendees · no conflicts', source: 'Outlook', scope: 'Work' },
  ];
  return all.filter((r) => `${r.title} ${r.detail} ${r.source}`.toLowerCase().includes(q));
}

export interface AiAnswer {
  readonly summary: string;
  readonly sources: readonly string[];
}

/** A short AI-style synthesized answer shown above raw results. */
export function aiAnswerFor(query: string, count: number): AiAnswer | null {
  if (!query.trim()) return null;
  if (count === 0) {
    return { summary: `I couldn't find anything for "${query.trim()}" in your work or personal content yet.`, sources: [] };
  }
  return {
    summary: `Found ${count} item${count > 1 ? 's' : ''} across your work and personal content. The most pressing is an approval that's overdue and blocking a teammate.`,
    sources: ['Jira', 'Calendar', 'Ask Buddy'],
  };
}
