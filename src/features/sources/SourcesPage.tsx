import { useMemo, useState } from 'react';
import {
  AssumptionCallout,
  Badge,
  Button,
  Card,
  EmptyState,
  SearchFilterSort,
  SourceCard,
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { findItem } from '../../domain/selectors';
import { formatDayLabel } from '../../lib/format';
import { useT } from '../../i18n/useT';
import type { Messages } from '../../i18n/en';
import type { Source } from '../../domain/types';

const KIND_TONE: Record<Source['kind'], 'success' | 'info' | 'warning'> = {
  verified: 'success',
  assumption: 'info',
  recheck: 'warning',
};

export function SourcesPage() {
  const { result } = useTripContext();
  const navigate = useNavigate();
  const t = useT();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');

  const trip = result?.trip;

  const counts = useMemo(() => {
    const tally = { verified: 0, assumption: 0, recheck: 0 };
    for (const source of trip?.sources ?? []) tally[source.kind] += 1;
    return tally;
  }, [trip]);

  if (!trip) return null;

  const needle = query.trim().toLowerCase();
  const visible = trip.sources.filter((source) => {
    if (kind !== 'all' && source.kind !== kind) return false;
    if (!needle) return true;
    return [source.topic, source.fact, source.notes]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLowerCase().includes(needle));
  });

  const hasSources = trip.sources.length > 0;

  return (
    <div className={shell.stackLoose}>
      <div>
        <h1 className={shell.pageTitle}>{t.sources.title}</h1>
        <p className={shell.muted}>{t.sources.intro}</p>
      </div>

      {trip.assumptions.length > 0 ? (
        <section className={shell.stack}>
          <h2 className={shell.sectionTitle}>{t.sources.fromOverview}</h2>
          {trip.assumptions.map((assumption) => (
            <AssumptionCallout key={assumption.id} kind={assumption.kind} label={t.assumption[assumption.labelKey]}>
              {assumption.detail}
            </AssumptionCallout>
          ))}
        </section>
      ) : null}

      {!hasSources ? (
        <EmptyState
          icon="book-open"
          title={t.sources.emptyTitle}
          description={t.sources.emptyBody}
          action={<Button onClick={() => navigate('/import')}>{t.sources.seeDetectedSheets}</Button>}
        />
      ) : (
        <>
          <SearchFilterSort
            query={query}
            onQuery={setQuery}
            label={t.sources.searchLabel}
            placeholder={t.sources.searchPlaceholder}
            activeFilter={kind}
            onFilter={setKind}
            filterLabel={t.sources.filterByConfidence}
            filters={[
              { value: 'all', label: t.sources.filterAll, suffix: String(trip.sources.length) },
              { value: 'verified', label: t.sources.kindVerified, suffix: String(counts.verified) },
              { value: 'assumption', label: t.sources.kindAssumption, suffix: String(counts.assumption) },
              { value: 'recheck', label: t.sources.filterRecheck, suffix: String(counts.recheck) },
            ]}
          />

          {visible.length === 0 ? (
            <EmptyState
              title={t.sources.noneMatch}
              description={t.sources.noneMatchBody}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setKind('all');
                  }}
                >
                  {t.common.clearFilters}
                </Button>
              }
            />
          ) : (
            <section className={shell.stack}>
              {visible.map((source) => (
                <SourceCard
                  key={source.id}
                  topic={source.topic || t.sources.untitledTopic}
                  fact={source.fact}
                  {...(source.url ? { url: source.url } : {})}
                  {...(sourceNotes(source, t.sources.linkAsWritten) ? { notes: sourceNotes(source, t.sources.linkAsWritten)! } : {})}
                  tags={
                    <span style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <Badge tone={KIND_TONE[source.kind]}>{kindLabel(t, source.kind)}</Badge>
                      {source.relatedItemIds.slice(0, 2).map((itemId) => {
                        const related = findItem(trip, itemId);
                        if (!related) return null;
                        return (
                          <button
                            key={itemId}
                            type="button"
                            className={shell.badgeButton}
                            onClick={() => navigate(`/activity/${encodeURIComponent(itemId)}`)}
                          >
                            <Badge tone="primary">
                              {related.day.date ? `${formatDayLabel(related.day.date)} · ` : ''}
                              {related.item.activity}
                            </Badge>
                          </button>
                        );
                      })}
                    </span>
                  }
                />
              ))}
            </section>
          )}

          <Card eyebrow={t.sources.howClassifiedTitle}>
            <ul className={shell.muted} style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
              <li>
                <b>{t.sources.kindVerified}</b> — {t.sources.howVerified}
              </li>
              <li>
                <b>{t.sources.kindAssumption}</b> — {t.sources.howAssumption}
              </li>
              <li>
                <b>{t.sources.kindRecheck}</b> — {t.sources.howRecheck}
              </li>
            </ul>
            <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
              {t.sources.recheckCount(counts.recheck)}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function kindLabel(t: Messages, kind: Source['kind']): string {
  if (kind === 'verified') return t.sources.kindVerified;
  if (kind === 'assumption') return t.sources.kindAssumption;
  return t.sources.kindRecheck;
}

/** The row's own notes, plus the link text when the URL turned out not to work. */
function sourceNotes(source: Source, linkAsWritten: (value: string) => string): string | null {
  const parts = [source.notes, source.brokenUrlText ? linkAsWritten(source.brokenUrlText) : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
