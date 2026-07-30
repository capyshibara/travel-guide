import type { ReactNode } from 'react';
import styles from './travel.module.css';
import { ExternalLinkButton } from './ExternalLinkButton';
import { displayHost } from '../../lib/url';
import { useT } from '../../i18n/useT';

export interface SourceCardProps {
  topic: string;
  fact: string;
  url?: string;
  notes?: string;
  /** Badge showing what this source informs, and a kind tag. */
  tags?: ReactNode;
}

export function SourceCard({ topic, fact, url, notes, tags }: SourceCardProps) {
  const t = useT();
  return (
    <article className={styles.sourceCard}>
      <h3 className={styles.sourceTopic}>{topic}</h3>
      <p className={styles.sourceFact}>{fact}</p>
      {notes ? <p className={styles.sourceNotes}>{notes}</p> : null}
      <div className={styles.sourceFooter}>
        {url ? <ExternalLinkButton href={url} label={displayHost(url)} /> : <span className={styles.sourceNotes}>{t.common.noLinkGiven}</span>}
        {tags}
      </div>
    </article>
  );
}
