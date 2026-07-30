import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Icon, useToast } from '../../design-system';
import type { IconName } from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { useT } from '../../i18n/useT';
import { renderIssue } from '../../i18n/renderIssue';
import type { Messages } from '../../i18n/en';
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
  const t = useT();
  const [showDismissed, setShowDismissed] = useState(false);

  if (!result) return null;

  const dismissed = result.issues.filter((issue) => overrides.dismissedIssues.includes(issue.id));
  const open = result.issues.filter((issue) => !overrides.dismissedIssues.includes(issue.id));
  const shown = showDismissed ? dismissed : open;

  return (
    <div className={shell.stackLoose}>
      <div>
        <h1 className={shell.pageTitle}>{t.issues.title}</h1>
        <p className={shell.muted}>{t.issues.intro(result.file.name)}</p>
      </div>

      {open.length > 0 || dismissed.length > 0 ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant={showDismissed ? 'secondary' : 'primary'} size="sm" onClick={() => setShowDismissed(false)}>
            {t.issues.openTab(open.length)}
          </Button>
          <Button variant={showDismissed ? 'primary' : 'secondary'} size="sm" onClick={() => setShowDismissed(true)}>
            {t.issues.reviewedTab(dismissed.length)}
          </Button>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon={showDismissed ? 'inbox' : 'check-circle-2'}
          title={showDismissed ? t.issues.nothingReviewed : t.issues.nothingToFix}
          description={showDismissed ? t.issues.nothingReviewedBody : t.issues.nothingToFixBody}
          {...(showDismissed ? {} : { action: <Button onClick={() => navigate('/')}>{t.issues.backToTrip}</Button> })}
        />
      ) : (
        <section className={shell.stack}>
          {shown.map((issue) => (
            <IssueCard
              key={issue.id}
              t={t}
              issue={issue}
              dismissed={showDismissed}
              onOpenItem={
                issue.relatedItemId
                  ? () => navigate(`/activity/${encodeURIComponent(issue.relatedItemId!)}`)
                  : undefined
              }
              onDismiss={() => {
                dismissIssue(issue.id);
                toast(t.issues.markedReviewed);
              }}
              onRestore={() => {
                restoreIssue(issue.id);
                toast(t.issues.movedBackToOpen);
              }}
            />
          ))}
        </section>
      )}

      {open.length > 0 && !showDismissed ? (
        <Card eyebrow={t.issues.whatToDoTitle}>
          <p className={shell.muted}>{t.issues.whatToDoBody(open.length)}</p>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => navigate('/import')}>
              {t.issues.reimport}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function IssueCard({
  t,
  issue,
  dismissed,
  onDismiss,
  onRestore,
  onOpenItem,
}: {
  t: Messages;
  issue: ImportIssue;
  dismissed: boolean;
  onDismiss: () => void;
  onRestore: () => void;
  onOpenItem?: (() => void) | undefined;
}) {
  const { title, detail } = renderIssue(t, issue.message);
  return (
    <Card>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--status-warning)', marginTop: 2 }}>
          <Icon name={ISSUE_ICON[issue.kind]} size="md" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--fs-body-md)', margin: 0 }}>{title}</h2>
            <Badge tone={SEVERITY_TONE[issue.severity]}>{t.severity[issue.severity]}</Badge>
          </div>
          <p className={shell.muted} style={{ marginTop: 'var(--space-2)' }}>
            {detail}
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
              {t.issues.sheetRow(issue.origin.sheet, issue.origin.row)}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            {onOpenItem ? (
              <Button variant="secondary" size="sm" onClick={onOpenItem}>
                {t.issues.openActivity}
              </Button>
            ) : null}
            {dismissed ? (
              <Button variant="secondary" size="sm" onClick={onRestore}>
                {t.issues.moveBackToOpen}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDismiss}
                disabled={issue.severity === 'critical'}
                title={issue.severity === 'critical' ? t.issues.cannotDismissCritical : undefined}
              >
                {t.issues.markReviewed}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
