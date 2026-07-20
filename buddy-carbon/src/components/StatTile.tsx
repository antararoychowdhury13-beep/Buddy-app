import { Tile } from '@carbon/react';
import styles from './StatTile.module.scss';

interface StatTileProps {
  value: string;
  label: string;
  helperText?: string;
}

/** A compact metric tile built on Carbon Tile and type tokens. */
export function StatTile({ value, label, helperText }: StatTileProps) {
  return (
    <Tile className={styles.tile}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
      {helperText ? <p className={styles.helper}>{helperText}</p> : null}
    </Tile>
  );
}
