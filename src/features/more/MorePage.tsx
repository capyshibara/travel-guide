import { useState } from 'react';
import { Badge, Button, Card, CardButton, Icon, Modal, Select, useToast } from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { SECONDARY_NAV } from '../../design-system';
import { actionableIssueCount } from '../../domain/selectors';
import { formatBytes, pluralize } from '../../lib/format';

export function MorePage() {
  const { result, overrides, preferences, setPreferences, clearAll, storage } = useTripContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const issueCount = result ? actionableIssueCount(result.issues, overrides) : 0;

  return (
    <div className={shell.stackLoose}>
      <h1 className={shell.pageTitle}>More</h1>

      <section className={shell.stack}>
        {SECONDARY_NAV.map((item) => (
          <CardButton key={item.key} onClick={() => navigate(item.to)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Icon name={item.icon} size="sm" />
              <span style={{ flex: 1, fontWeight: 'var(--fw-semibold)' }}>{item.label}</span>
              {item.key === 'issues' && issueCount > 0 ? <Badge tone="warning">{issueCount}</Badge> : null}
              <Icon name="chevron-right" size="sm" />
            </span>
          </CardButton>
        ))}
      </section>

      <Card eyebrow="Appearance">
        <Select
          label="Theme"
          value={preferences.theme}
          onChange={(value) => setPreferences({ theme: value === 'dark' || value === 'light' ? value : 'system' })}
          options={[
            { value: 'system', label: 'Match my device' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
          Light is the default. Dark is easier on the eyes when you are checking tomorrow's plan at night.
        </p>
      </Card>

      {result ? (
        <Card eyebrow="Imported workbook">
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>File</p>
            <p className={shell.definitionValue} style={{ fontFamily: 'var(--font-body)' }}>
              {result.file.name}
            </p>
          </div>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>Size</p>
            <p className={shell.definitionValue}>{formatBytes(result.file.size)}</p>
          </div>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>Imported</p>
            <p className={shell.definitionValue} style={{ fontFamily: 'var(--font-body)' }}>
              {new Date(result.importedAt).toLocaleString()}
            </p>
          </div>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>Sheets read</p>
            <p className={shell.definitionValue}>
              {result.sheets.filter((sheet) => sheet.role !== 'unknown').length} of {result.sheets.length}
            </p>
          </div>
        </Card>
      ) : null}

      <Card eyebrow="Your data">
        <p className={shell.muted}>
          Your workbook is read entirely in this browser. Nothing is uploaded and nothing is sent anywhere.
        </p>
        <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
          {storage === 'unavailable'
            ? 'This browser will not let Wayfare store data locally, so your trip is only held in memory and will be lost when you close the tab.'
            : 'The trip Wayfare built, plus your booking statuses and completed activities, are saved on this device. The original file itself is not kept.'}
        </p>
        {result ? (
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            Currently stored: {pluralize(result.trip.days.length, 'day')},{' '}
            {pluralize(result.trip.bookings.length, 'booking')},{' '}
            {pluralize(Object.keys(overrides.bookingStatus).length, 'status change')}.
          </p>
        ) : null}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button
            variant="danger"
            icon={<Icon name="trash-2" size="sm" />}
            onClick={() => setConfirmClear(true)}
            disabled={!result}
          >
            Clear trip data
          </Button>
        </div>
      </Card>

      <Card eyebrow="About">
        <p className={shell.muted}>
          Wayfare turns a trip-planning spreadsheet into a day-by-day guide you can follow on your phone. It never
          changes your workbook and works without a connection once loaded.
        </p>
      </Card>

      <Modal
        open={confirmClear}
        title="Clear trip data?"
        onClose={() => setConfirmClear(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void clearAll().then(() => {
                  setConfirmClear(false);
                  toast('Trip data cleared', 'success');
                  navigate('/import');
                });
              }}
            >
              Clear everything
            </Button>
          </>
        }
      >
        This removes the imported trip, your booking statuses and your completed activities from this device. Your
        original spreadsheet file is not affected — you can import it again at any time.
      </Modal>
    </div>
  );
}
