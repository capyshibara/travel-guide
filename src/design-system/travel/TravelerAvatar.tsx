import styles from './travel.module.css';
import { cx } from '../../lib/cx';

export type TravelerSlot = 'a' | 'b' | 'c' | 'd' | 'shared' | 'none';

const SLOT_CLASS: Record<TravelerSlot, string | undefined> = {
  a: styles.avatarA,
  b: styles.avatarB,
  c: styles.avatarC,
  d: styles.avatarD,
  shared: styles.avatarShared,
  none: styles.avatarNone,
};

export interface TravelerAvatarProps {
  slot: TravelerSlot;
  initials: string;
  /** Accessible name, e.g. "Traveler A" or "Both travelers". */
  label: string;
  size?: number;
  /**
   * Hide from assistive technology. Use wherever the same name is already in adjacent
   * text — a filter chip reading "Traveler B Traveler B" helps nobody.
   */
  decorative?: boolean;
}

export function TravelerAvatar({ slot, initials, label, size = 32, decorative }: TravelerAvatarProps) {
  return (
    <span
      className={cx(styles.avatar, SLOT_CLASS[slot])}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      title={label}
    >
      {initials}
    </span>
  );
}

/** Overlapping avatars for a shared item. Announced once, as a group. */
export function TravelerAvatarStack({
  people,
  size = 24,
  label,
}: {
  people: readonly { slot: TravelerSlot; initials: string; label: string }[];
  size?: number;
  label: string;
}) {
  if (people.length === 0) return null;
  if (people.length === 1) {
    const person = people[0]!;
    return <TravelerAvatar slot={person.slot} initials={person.initials} label={person.label} size={size} />;
  }
  return (
    <span className={styles.avatarStack} role="img" aria-label={label} title={label}>
      {people.map((person, index) => (
        <span
          key={`${person.slot}-${person.initials}-${index}`}
          className={cx(styles.avatar, SLOT_CLASS[person.slot])}
          style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
          aria-hidden="true"
        >
          {person.initials}
        </span>
      ))}
    </span>
  );
}
