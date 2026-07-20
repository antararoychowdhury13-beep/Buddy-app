import type { ReactNode } from 'react';
import { Tag } from '@carbon/react';
import type { ConfidenceLevel, RiskLevel } from '../../types/ask';

/** Confidence expressed as a Carbon Tag — label always states the level. */
const CONF_TAG: Record<ConfidenceLevel, { type: 'green' | 'blue' | 'red' | 'magenta'; label: string }> = {
  high: { type: 'green', label: 'High confidence' },
  review_suggested: { type: 'blue', label: 'Review suggested' },
  needs_confirmation: { type: 'magenta', label: 'Needs confirmation' },
  conflicting: { type: 'red', label: 'Conflicting' },
};

export function ConfTag({ level }: { level: ConfidenceLevel }) {
  const m = CONF_TAG[level];
  return (
    <Tag type={m.type} size="sm">
      {m.label}
    </Tag>
  );
}

const RISK_TAG: Record<RiskLevel, { type: 'gray' | 'blue' | 'magenta' | 'red' }> = {
  low: { type: 'gray' },
  medium: { type: 'blue' },
  high: { type: 'magenta' },
  critical: { type: 'red' },
};

export function RiskTag({ risk, label }: { risk: RiskLevel; label: string }) {
  return (
    <Tag type={RISK_TAG[risk].type} size="sm">
      {label}
    </Tag>
  );
}

/** Label + value pair used throughout the Ask flows. */
export function Field({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="ask-field">
      <span className="ask-field__k">{k}</span>
      <span className="ask-field__v">{v}</span>
    </div>
  );
}
