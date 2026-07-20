import { useMemo, useState } from 'react';
import { buildSuggestions, buildTimeline, fmtDur } from '../constants/todayMock';
import { energyRecommendations, estimateCompletion, simulateDay, type Scenario, type SimInput } from '../services/today/engines';
import type { EnergyState } from '../types/today';

/**
 * Read model for the Today page. Applied optimisations, energy and health
 * consent are local state; the deterministic engines recompute from them.
 */
export function useTodayModel() {
  const suggestions = useMemo(() => buildSuggestions(), []);
  const timeline = useMemo(() => buildTimeline(), []);

  const [applied, setApplied] = useState<ReadonlySet<string>>(new Set());
  const [energy, setEnergy] = useState<EnergyState>('unspecified');
  const [healthConsent, setHealthConsent] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('current');

  const simInput: SimInput = useMemo(
    () => ({ timeline, appliedSuggestions: new Set(applied), overrunActive: false, calendarStale: false }),
    [timeline, applied],
  );

  const metrics = useMemo(() => simulateDay(simInput), [simInput]);
  const current = useMemo(() => estimateCompletion('current', simInput, healthConsent, energy), [simInput, healthConsent, energy]);
  const optimised = useMemo(() => estimateCompletion('optimised', simInput, healthConsent, energy), [simInput, healthConsent, energy]);
  const activeEstimate = useMemo(
    () => estimateCompletion(scenario, simInput, healthConsent, energy),
    [scenario, simInput, healthConsent, energy],
  );

  const openSuggestions = useMemo(() => suggestions.filter((s) => !applied.has(s.id)), [suggestions, applied]);
  const recoverableMins = openSuggestions.reduce((total, s) => total + s.minutesRecovered, 0);
  const energyTips = useMemo(() => energyRecommendations(energy), [energy]);

  const applySuggestion = (id: string) => setApplied((prev) => new Set(prev).add(id));

  return {
    suggestions,
    openSuggestions,
    recoverableMins,
    timeline,
    metrics,
    current,
    optimised,
    activeEstimate,
    scenario,
    setScenario,
    energy,
    setEnergy,
    energyTips,
    healthConsent,
    setHealthConsent,
    applySuggestion,
    applied,
    fmtDur,
  };
}
