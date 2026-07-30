import {
  AssumptionCallout,
  BudgetSummaryCard,
  Button,
  Card,
  CategoryBreakdown,
  EmptyState,
  ScenarioToggle,
  TravelerAvatar,
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { buildBudgetView } from '../../domain/selectors';
import { travelerName } from '../../import/travelers';
import { currentLocale, formatDelta, formatMoney } from '../../lib/format';
import { useT } from '../../i18n/useT';

export function BudgetPage() {
  const { result, preferences, setPreferences } = useTripContext();
  const navigate = useNavigate();
  const t = useT();
  const trip = result?.trip;

  if (!trip) return null;

  const scenario = preferences.scenario;
  const view = buildBudgetView(trip, scenario);
  const currency = view.currency;

  if (trip.budget.length === 0 && trip.totals.stated.length === 0) {
    return (
      <EmptyState
        icon="wallet"
        title={t.budget.emptyTitle}
        description={t.budget.emptyBody}
        action={<Button onClick={() => navigate('/issues')}>{t.budget.seeWhatMissed}</Button>}
      />
    );
  }

  const groupTotal = scenario === 'base' ? trip.totals.group.base : trip.totals.group.fallback;
  const scenarioWord = scenario === 'base' ? t.scenario.baseLower : t.scenario.fallbackLower;

  return (
    <div className={shell.stackLoose}>
      <div className={shell.rowBetween}>
        <h1 className={shell.pageTitle}>{t.budget.title}</h1>
        <ScenarioToggle value={scenario} onChange={(value) => setPreferences({ scenario: value })} />
      </div>

      <div className={shell.grid2}>
        <BudgetSummaryCard
          label={t.budget.groupTotal}
          amount={formatMoney(groupTotal)}
          sub={t.budget.groupSub(trip.travelers.length, scenarioWord)}
          tone={scenario === 'fallback' ? 'warning' : 'default'}
        />
        <BudgetSummaryCard
          label={t.budget.baseVsFallback}
          amount={formatDelta(trip.totals.group.base, trip.totals.group.fallback, t.budget.noDifference)}
          sub={t.budget.differenceAcrossTrip}
        />
      </div>

      {trip.travelers.length > 0 ? (
        <Card eyebrow={t.budget.perTraveler}>
          {trip.travelers.map((traveler) => {
            const totals = trip.totals.perTraveler[traveler.id];
            const amount = scenario === 'base' ? totals?.base : totals?.fallback;
            return (
              <div key={traveler.id} className={shell.definitionRow}>
                <p className={shell.definitionLabel} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <TravelerAvatar
                    slot={traveler.slot}
                    initials={traveler.initials}
                    label={travelerName(traveler, t.traveler)}
                    size={24}
                    decorative
                  />
                  {travelerName(traveler, t.traveler)}
                  {traveler.departureCity ? ` · ${t.traveler.from(traveler.departureCity)}` : ''}
                </p>
                <p className={shell.definitionValue}>{formatMoney(amount)}</p>
              </div>
            );
          })}
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            {t.budget.perTravelerNote}
          </p>
        </Card>
      ) : null}

      <Card eyebrow={t.budget.flightsVsShared}>
        <div className={shell.definitionRow}>
          <p className={shell.definitionLabel}>{t.budget.flights}</p>
          <p className={shell.definitionValue}>{formatMoney(view.flights)}</p>
        </div>
        <div className={shell.definitionRow}>
          <p className={shell.definitionLabel}>{t.budget.sharedCosts}</p>
          <p className={shell.definitionValue}>{formatMoney(view.shared)}</p>
        </div>
      </Card>

      {view.categories.length > 0 ? (
        <Card eyebrow={t.budget.byCategory}>
          <CategoryBreakdown
            label={t.budget.byCategoryLabel(scenarioWord)}
            categories={view.categories.map((category) => ({
              // The workbook's own category wording wins; only our inferred buckets translate.
              label: category.label ?? t.category[category.categoryKey ?? 'other'],
              value: category.value,
              display: formatMoney({ amount: category.value, currency }),
            }))}
          />
        </Card>
      ) : null}

      {view.individual.some((entry) => entry.entries.length > 0) ? (
        <Card eyebrow={t.budget.travelerSpecific}>
          {view.individual.map((entry) =>
            entry.entries.map((budgetEntry) => {
              const amount = scenario === 'base' ? budgetEntry.base : (budgetEntry.fallback ?? budgetEntry.base);
              return (
                <div key={budgetEntry.id} className={shell.definitionRow}>
                  <p className={shell.definitionLabel} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <TravelerAvatar
                      slot={entry.traveler.slot}
                      initials={entry.traveler.initials}
                      label={travelerName(entry.traveler, t.traveler)}
                      size={22}
                      decorative
                    />
                    {budgetEntry.itineraryItemId ? (
                      <button
                        type="button"
                        className={shell.inlineLink}
                        onClick={() => navigate(`/activity/${encodeURIComponent(budgetEntry.itineraryItemId!)}`)}
                      >
                        {budgetEntry.label}
                      </button>
                    ) : (
                      budgetEntry.label
                    )}
                  </p>
                  <p className={shell.definitionValue}>{formatMoney(amount)}</p>
                </div>
              );
            }),
          )}
        </Card>
      ) : null}

      {trip.totals.stated.length > 0 ? (
        <Card eyebrow={t.budget.statedTitle}>
          {trip.totals.stated.map((stated) => (
            <div key={stated.label} className={shell.definitionRow}>
              <p className={shell.definitionLabel}>{stated.label}</p>
              <p className={shell.definitionValue}>
                {formatMoney(scenario === 'fallback' && stated.fallback ? stated.fallback : stated.base)}
              </p>
            </div>
          ))}
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            {t.budget.statedNote}
          </p>
        </Card>
      ) : null}

      {trip.exchangeRates.length > 0 ? (
        <AssumptionCallout kind="assumption" label={t.budget.exchangeRateLabel}>
          {trip.exchangeRates
            .map((rate) => `1 ${rate.from} = ${rate.rate.toLocaleString(currentLocale())} ${rate.to}`)
            .join(' · ')}
          . {t.budget.exchangeRateNote}
        </AssumptionCallout>
      ) : (
        <AssumptionCallout kind="recheck" label={t.budget.noExchangeRateLabel}>
          {t.budget.noExchangeRateNote}
        </AssumptionCallout>
      )}
    </div>
  );
}
