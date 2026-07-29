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
import { formatDayLabel, pluralize } from '../../lib/format';
import type { Source } from '../../domain/types';

const KIND_LABEL: Record<Source['kind'], string> = {
  verified: 'Verified',
  assumption: 'Assumption',
  recheck: 'Needs recheck',
};

const KIND_TONE: Record<Source['kind'], 'success' | 'info' | 'warning'> = {
  verified: 'success',
  assumption: 'info',
  recheck: 'warning',
};

export function SourcesPage() {
  const { result } = useTripContext();
  const navigate = useNavigate();
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
        <h1 className={shell.pageTitle}>Sources &amp; assumptions</h1>
        <p className={shell.muted}>
          What the plan is based on, and how sure each part is. Anything without a working link is treated as an
          assumption, never as fact.
        </p>
      </div>

      {trip.assumptions.length > 0 ? (
        <section className={shell.stack}>
          <h2 className={shell.sectionTitle}>From your Overview sheet</h2>
          {trip.assumptions.map((assumption) => (
            <AssumptionCallout key={assumption.id} kind={assumption.kind} label={assumption.label}>
              {assumption.detail}
            </AssumptionCallout>
          ))}
        </section>
      ) : null}

      {!hasSources ? (
        <EmptyState
          icon="book-open"
          title="No sources found"
          description="Your workbook did not have a sources sheet Wayfare could read, so there is nothing to check the plan against."
          action={<Button onClick={() => navigate('/import')}>See detected sheets</Button>}
        />
      ) : (
        <>
          <SearchFilterSort
            query={query}
            onQuery={setQuery}
            label="Search sources"
            placeholder="Search topics and facts"
            activeFilter={kind}
            onFilter={setKind}
            filterLabel="Filter by confidence"
            filters={[
              { value: 'all', label: 'All', suffix: String(trip.sources.length) },
              { value: 'verified', label: 'Verified', suffix: String(counts.verified) },
              { value: 'assumption', label: 'Assumption', suffix: String(counts.assumption) },
              { value: 'recheck', label: 'Recheck', suffix: String(counts.recheck) },
            ]}
          />

          {visible.length === 0 ? (
            <EmptyState
              title="No sources match"
              description="Try a different search term or filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setKind('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <section className={shell.stack}>
              {visible.map((source) => (
                <SourceCard
                  key={source.id}
                  topic={source.topic}
                  fact={source.fact}
                  {...(source.url ? { url: source.url } : {})}
                  {...(source.notes ? { notes: source.notes } : {})}
                  tags={
                    <span style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <Badge tone={KIND_TONE[source.kind]}>{KIND_LABEL[source.kind]}</Badge>
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

          <Card eyebrow="How these are classified">
            <ul className={shell.muted} style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
              <li>
                <b>Verified</b> — the row has a working link to check the fact against.
              </li>
              <li>
                <b>Assumption</b> — no link, or wording like “assumed” or “around”.
              </li>
              <li>
                <b>Needs recheck</b> — the link does not work, or the row itself flags the fact as unconfirmed.
              </li>
            </ul>
            <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
              {pluralize(counts.recheck, 'source')} still need{counts.recheck === 1 ? 's' : ''} a recheck before you
              rely on {counts.recheck === 1 ? 'it' : 'them'}.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
