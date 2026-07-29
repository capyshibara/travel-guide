import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Icon, useToast } from '../../design-system';
import type { IconName } from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { pluralize } from '../../lib/format';
import type { ImportIssue, ImportIssueKind, IssueSeverity } from '../../domain/types';

const ISSUE_ICON: Record<ImportIssueKind, IconName> = {
  'missing-field': 'circle-help',
  'unrecognized-column': 'columns-3',
  'invalid-date': 'clock',
  'invalid-currency': 'wallet',
  'invalid-number': 'wallet',
  'time-conflict': 'clock',
  duplicate: 'copy',
  'missing-traveler': 'circle-help',
  'broken-url': 'link-2-off',
  'unmapped-sheet': 'file-spreadsheet',
  'empty-sheet': 'file-spreadsheet',
};

const SEVERITY_TONE: Record<IssueSeverity, 'danger' | 'warning' | 'neutral'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'neutral',
};

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  critical: 'Blocking',
  warning: 'Worth checking',
  info: 'For information',
};

/**
 * Import issues, in a form the traveler can act on.
 *
 * Dismissing is a local note that an issue has been looked at. It never edits the
 * workbook, which is stated on the page so nobody expects it to.
 */
export function DataIssuesPage() {
  const { result, overrides, dismissIssue, restoreIssue } = useTripContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [showDismissed, setShowDismissed] = useState(false);

  if (!result) return null;

  const dismissed = result.issues.filter((issue) => overrides.dismissedIssues.includes(issue.id));
  const open = result.issues.filter((issue) => !overrides.dismissedIssues.includes(issue.id));
  const shown = showDismissed ? dismissed : open;

  return (
    <div className={shell.stackLoose}>
      <div>
        <h1 className={shell.pageTitle}>Data issues</h1>
        <p className={shell.muted}>
          What Wayfare could not read cleanly from <b>{result.file.name}</b>. Your original file is never changed —
          dismissing an issue just marks it as reviewed on this device.
        </p>
      </div>

      {open.length > 0 || dismissed.length > 0 ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant={showDismissed ? 'secondary' : 'primary'} size="sm" onClick={() => setShowDismissed(false)}>
            Open ({open.length})
          </Button>
          <Button variant={showDismissed ? 'primary' : 'secondary'} size="sm" onClick={() => setShowDismissed(true)}>
            Reviewed ({dismissed.length})
          </Button>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon={showDismissed ? 'inbox' : 'check-circle-2'}
          title={showDismissed ? 'Nothing reviewed yet' : 'Nothing to fix'}
          description={
            showDismissed
              ? 'Issues you dismiss will be listed here.'
              : 'Wayfare read every sheet in your workbook without trouble.'
          }
          {...(showDismissed ? {} : { action: <Button onClick={() => navigate('/')}>Back to trip</Button> })}
        />
      ) : (
        <section className={shell.stack}>
          {shown.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              dismissed={showDismissed}
              onOpenItem={
                issue.relatedItemId
                  ? () => navigate(`/activity/${encodeURIComponent(issue.relatedItemId!)}`)
                  : undefined
              }
              onDismiss={() => {
                dismissIssue(issue.id);
                toast('Marked as reviewed');
              }}
              onRestore={() => {
                restoreIssue(issue.id);
                toast('Moved back to open');
              }}
            />
          ))}
        </section>
      )}

      {open.length > 0 && !showDismissed ? (
        <Card eyebrow="What to do about these">
          <p className={shell.muted}>
            Fix anything that matters in your spreadsheet and import it again — {pluralize(open.length, 'issue')}{' '}
            {open.length === 1 ? 'is' : 'are'} listed with the sheet and row number so you can find{' '}
            {open.length === 1 ? 'it' : 'them'}. Your booking statuses and completed activities carry over.
          </p>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => navigate('/import')}>
              Re-import workbook
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function IssueCard({
  issue,
  dismissed,
  onDismiss,
  onRestore,
  onOpenItem,
}: {
  issue: ImportIssue;
  dismissed: boolean;
  onDismiss: () => void;
  onRestore: () => void;
  onOpenItem?: (() => void) | undefined;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--status-warning)', marginTop: 2 }}>
          <Icon name={ISSUE_ICON[issue.kind]} size="md" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--fs-body-md)', margin: 0 }}>{issue.title}</h2>
            <Badge tone={SEVERITY_TONE[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Badge>
          </div>
          <p className={shell.muted} style={{ marginTop: 'var(--space-2)' }}>
            {issue.detail}
          </p>
          {issue.origin ? (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-micro)',
                color: 'var(--text-tertiary)',
                marginTop: 'var(--space-2)',
              }}
            >
              {issue.origin.sheet} · row {issue.origin.row}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            {onOpenItem ? (
              <Button variant="secondary" size="sm" onClick={onOpenItem}>
                Open activity
              </Button>
            ) : null}
            {dismissed ? (
              <Button variant="secondary" size="sm" onClick={onRestore}>
                Move back to open
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDismiss}
                disabled={issue.severity === 'critical'}
                title={issue.severity === 'critical' ? 'Blocking issues cannot be dismissed' : undefined}
              >
                Mark as reviewed
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
