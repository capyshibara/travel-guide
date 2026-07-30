import type { ReactNode } from 'react';
import styles from './navigation.module.css';
import { IconButton } from '../core/IconButton';
import { Icon } from '../Icon';
import { useT } from '../../i18n/useT';


export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}

export function AppHeader({ title, subtitle, onBack, backLabel, right }: AppHeaderProps) {
  const t = useT();
  return (
    <header className={styles.header}>
      {onBack ? (
        <IconButton icon={<Icon name="chevron-left" size="md" />} label={backLabel ?? t.common.back} onClick={onBack} />
      ) : null}
      {/*
        Deliberately not a heading. This bar is persistent chrome that labels where you
        are, like a browser tab; the page below owns the document's single `h1`. Making
        both headings would give every screen two competing `h1`s.
      */}
      <div className={styles.headerTitles}>
        <div className={styles.headerTitle}>{title}</div>
        {subtitle ? <div className={styles.headerSubtitle}>{subtitle}</div> : null}
      </div>
      {right ? <div className={styles.headerRight}>{right}</div> : null}
    </header>
  );
}
