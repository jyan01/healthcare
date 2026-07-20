import type { BadgeLevel } from '../../shared';
import styles from './StatusBadge.module.css';

const LEVEL_CLASS: Record<BadgeLevel, string> = {
  good: styles.good,
  warning: styles.warning,
  critical: styles.critical,
};

export function StatusBadge({ level, text }: { level: BadgeLevel; text: string }) {
  return (
    <span className={`${styles.badge} ${LEVEL_CLASS[level]}`}>
      <span className={styles.dot} />
      {text}
    </span>
  );
}
