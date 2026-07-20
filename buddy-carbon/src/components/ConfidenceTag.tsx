import { Tag } from '@carbon/react';
import type { ConfidenceLevel } from '../types/home';

const CONFIDENCE_META: Record<ConfidenceLevel, { type: 'green' | 'blue' | 'red' | 'gray'; label: string }> = {
  high: { type: 'green', label: 'High confidence' },
  medium: { type: 'blue', label: 'Medium confidence' },
  low: { type: 'red', label: 'Low confidence' },
  missing_info: { type: 'gray', label: 'Missing information' },
};

/** Confidence expressed as a Carbon Tag. The label always states the level, so
 * meaning is never carried by colour alone. */
export function ConfidenceTag({ level }: { level: ConfidenceLevel }) {
  const meta = CONFIDENCE_META[level];
  return (
    <Tag type={meta.type} size="sm">
      {meta.label}
    </Tag>
  );
}
