import { useMemo, useState } from 'react';
import { MOCK_CONTEXT, fmtMins } from '../constants/homeMock';
import { buildRecommendations, buildSummary, CATEGORY_LABELS } from '../services/home/planner';
import { detectConflicts } from '../services/home/conflicts';
import { rankPriorities, TIER_META } from '../services/home/ranking';
import { ALL_MODES, MODE_CONFIG, currentContext, selectMode } from '../services/home/modes';
import type { HomeMode, PlanCategory } from '../types/home';

/**
 * Assembles the read model for the Home page from the (framework-agnostic)
 * planning engines. Recomputes only when the active mode changes.
 */
export function useHomeModel() {
  const ctx = MOCK_CONTEXT;
  const auto = useMemo(() => selectMode(currentContext(ctx.signals)), [ctx]);
  const [mode, setMode] = useState<HomeMode>(auto.mode);

  const recommendations = useMemo(() => buildRecommendations(ctx), [ctx]);
  const conflicts = useMemo(() => detectConflicts(ctx), [ctx]);
  const openConflicts = useMemo(() => conflicts.filter((c) => c.status === 'open'), [conflicts]);

  const summary = useMemo(
    () => buildSummary(ctx, recommendations, openConflicts.length, { edits: {}, statuses: {}, choice: 'recommended' }),
    [ctx, recommendations, openConflicts.length],
  );

  const priorities = useMemo(
    () => rankPriorities({ recommendations, conflicts, prefs: { domainBias: {}, quietMode: false, neverMoveMeetingTypes: [], alwaysAskFirst: false }, manualOrder: {} }),
    [recommendations, conflicts],
  );

  const groups = useMemo(() => {
    const cfg = MODE_CONFIG[mode];
    const visible = recommendations.filter(
      (r) => (r.status === 'suggested' || r.status === 'accepted') && !cfg.hidden.includes(r.category),
    );
    const ordered = cfg.order
      .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: visible.filter((r) => r.category === cat) }))
      .filter((g) => g.items.length > 0);
    return cfg.maxCards ? capForStress(ordered, cfg.maxCards) : ordered;
  }, [recommendations, mode]);

  return {
    mode,
    setMode,
    auto,
    modes: ALL_MODES,
    modeConfig: MODE_CONFIG,
    summary,
    groups,
    priorities,
    conflicts: openConflicts,
    tierMeta: TIER_META,
    fmtMins,
  };
}

function capForStress<T extends { items: unknown[] }>(groups: T[], max: number): T[] {
  const out: T[] = [];
  let count = 0;
  for (const g of groups) {
    if (count >= max) break;
    const items = g.items.slice(0, max - count);
    out.push({ ...g, items });
    count += items.length;
  }
  return out;
}

export type { PlanCategory };
