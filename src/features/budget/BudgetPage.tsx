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
import { formatDelta, formatMoney, pluralize } from '../../lib/format';

export function BudgetPage() {
  const { result, preferences, setPreferences } = useTripContext();
  const navigate = useNavigate();
  const trip = result?.trip;

  if (!trip) return null;

  const scenario = preferences.scenario;
  const view = buildBudgetView(trip, scenario);
  const currency = view.currency;

  if (trip.budget.length === 0 && trip.totals.stated.length === 0) {
    return (
      <EmptyState
        icon="wallet"
        title="No costs found"
        description="Your workbook did not have any amounts Wayfare could read, so there is nothing to total up."
        action={<Button onClick={() => navigate('/issues')}>See what was missed</Button>}
      />
    );
  }

  const groupTotal = scenario === 'base' ? trip.totals.group.base : trip.totals.group.fallback;

  return (
    <div className={shell.stackLoose}>
      <div className={shell.rowBetween}>
        <h1 className={shell.pageTitle}>Budget</h1>
        <ScenarioToggle value={scenario} onChange={(value) => setPreferences({ scenario: value })} />
      </div>

      <div className={shell.grid2}>
        <BudgetSummaryCard
          label="Group total"
          amount={formatMoney(groupTotal)}
          sub={`${pluralize(trip.travelers.length, 'traveler')} · ${scenario} scenario`}
          tone={scenario === 'fallback' ? 'warning' : 'default'}
        />
        <BudgetSummaryCard
          label="Base vs. fallback"
          amount={formatDelta(trip.totals.group.base, trip.totals.group.fallback)}
          sub="Difference across the whole trip"
        />
      </div>

      {trip.travelers.length > 0 ? (
        <Card eyebrow="Per traveler">
          {trip.travelers.map((traveler) => {
            const totals = trip.totals.perTraveler[traveler.id];
            const amount = scenario === 'base' ? totals?.base : totals?.fallback;
            return (
              <div key={traveler.id} className={shell.definitionRow}>
                <p className={shell.definitionLabel} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <TravelerAvatar slot={traveler.slot} initials={traveler.initials} label={traveler.name} size={24} decorative />
                  {traveler.name}
                  {traveler.departureCity ? ` · from ${traveler.departureCity}` : ''}
                </p>
                <p className={shell.definitionValue}>{formatMoney(amount)}</p>
              </div>
            );
          })}
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            Each traveler's own costs in full, plus an equal share of anything marked shared. Activities with no traveler
            assigned are excluded.
          </p>
        </Card>
      ) : null}

      <Card eyebrow="Flights vs. shared trip costs">
        <div className={shell.definitionRow}>
          <p className={shell.definitionLabel}>Flights</p>
          <p className={shell.definitionValue}>{formatMoney(view.flights)}</p>
        </div>
        <div className={shell.definitionRow}>
          <p className={shell.definitionLabel}>Shared trip costs</p>
          <p className={shell.definitionValue}>{formatMoney(view.shared)}</p>
        </div>
      </Card>

      {view.categories.length > 0 ? (
        <Card eyebrow="By category">
          <CategoryBreakdown
            label={`Spending by category, ${scenario} scenario`}
            categories={view.categories.map((category) => ({
              ...category,
              display: formatMoney({ amount: category.value, currency }),
            }))}
          />
        </Card>
      ) : null}

      {view.individual.some((entry) => entry.entries.length > 0) ? (
        <Card eyebrow="Traveler-specific expenses">
          {view.individual.map((entry) =>
            entry.entries.map((budgetEntry) => {
              const amount = scenario === 'base' ? budgetEntry.base : (budgetEntry.fallback ?? budgetEntry.base);
              return (
                <div key={budgetEntry.id} className={shell.definitionRow}>
                  <p className={shell.definitionLabel} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <TravelerAvatar
                      slot={entry.traveler.slot}
                      initials={entry.traveler.initials}
                      label={entry.traveler.name}
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
        <Card eyebrow="Stated in your workbook">
          {trip.totals.stated.map((stated) => (
            <div key={stated.label} className={shell.definitionRow}>
              <p className={shell.definitionLabel}>{stated.label}</p>
              <p className={shell.definitionValue}>
                {formatMoney(scenario === 'fallback' && stated.fallback ? stated.fallback : stated.base)}
              </p>
            </div>
          ))}
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            These are the figures written in your Overview sheet, shown exactly as given. Wayfare's own totals above are
            summed from the itinerary and will differ if the workbook's figures include anything not itemised.
          </p>
        </Card>
      ) : null}

      {trip.exchangeRates.length > 0 ? (
        <AssumptionCallout kind="assumption" label="Exchange rate">
          {trip.exchangeRates
            .map((rate) => `1 ${rate.from} = ${rate.rate.toLocaleString()} ${rate.to}`)
            .join(' · ')}
          . Taken from your workbook and applied to every converted amount. Actual rates will differ.
        </AssumptionCallout>
      ) : (
        <AssumptionCallout kind="recheck" label="No exchange rate">
          Your workbook did not give an exchange rate, so amounts in other currencies are shown as written and are not
          added into the totals.
        </AssumptionCallout>
      )}
    </div>
  );
}
