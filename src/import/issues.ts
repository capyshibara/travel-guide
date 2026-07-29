/**
 * Collecting import issues.
 *
 * Ids are derived from the issue's content rather than a counter, so dismissing an
 * issue and re-importing the same workbook does not resurrect it.
 */
import type { ImportIssue, ImportIssueKind, IssueSeverity, RowOrigin } from '../domain/types';
import { stableId } from '../lib/id';

const SEVERITY: Record<ImportIssueKind, IssueSeverity> = {
  'missing-field': 'warning',
  'unrecognized-column': 'info',
  'invalid-date': 'warning',
  'invalid-currency': 'warning',
  'invalid-number': 'warning',
  'time-conflict': 'warning',
  duplicate: 'info',
  'missing-traveler': 'warning',
  'broken-url': 'info',
  'unmapped-sheet': 'info',
  'empty-sheet': 'info',
};

export class IssueCollector {
  private readonly issues: ImportIssue[] = [];
  private readonly seen = new Set<string>();

  add(input: {
    kind: ImportIssueKind;
    title: string;
    detail: string;
    origin?: RowOrigin;
    relatedItemId?: string;
    severity?: IssueSeverity;
  }): void {
    const origin = input.origin;
    const id = stableId('issue', [
      input.kind,
      input.title,
      origin ? `${origin.sheet}:${origin.row}` : '',
      input.relatedItemId ?? '',
    ]);
    if (this.seen.has(id)) return;
    this.seen.add(id);

    const issue: ImportIssue = {
      id,
      kind: input.kind,
      severity: input.severity ?? SEVERITY[input.kind],
      title: input.title,
      detail: input.detail,
    };
    if (origin) issue.origin = origin;
    if (input.relatedItemId) issue.relatedItemId = input.relatedItemId;
    this.issues.push(issue);
  }

  list(): ImportIssue[] {
    const rank: Record<IssueSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return [...this.issues].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }

  count(): number {
    return this.issues.length;
  }
}

/** Thrown when the file cannot be read at all — surfaced as a friendly error state. */
export class WorkbookReadError extends Error {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
    this.name = 'WorkbookReadError';
  }
}
