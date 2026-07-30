/**
 * Collecting import issues.
 *
 * Issues carry a message *code* plus its data, never prose — see `IssueMessage`.
 * Ids are derived from that content rather than a counter, so dismissing an issue and
 * re-importing the same workbook does not resurrect it.
 */
import type { ImportIssue, ImportIssueKind, IssueMessage, IssueSeverity, RowOrigin } from '../domain/types';
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
    message: IssueMessage;
    origin?: RowOrigin;
    relatedItemId?: string;
    severity?: IssueSeverity;
  }): void {
    const origin = input.origin;
    // The id covers every field of the message, so two issues that differ only in a
    // quoted value stay distinct.
    const id = stableId('issue', [
      input.kind,
      JSON.stringify(input.message),
      origin ? `${origin.sheet}:${origin.row}` : '',
      input.relatedItemId ?? '',
    ]);
    if (this.seen.has(id)) return;
    this.seen.add(id);

    const issue: ImportIssue = {
      id,
      kind: input.kind,
      severity: input.severity ?? SEVERITY[input.kind],
      message: input.message,
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

/**
 * Thrown when the file cannot be read at all.
 *
 * Carries a code rather than prose so the error state can be shown in the reader's
 * language; `fileName` is the only variable part.
 */
export type WorkbookErrorCode = 'tooLarge' | 'empty' | 'wrongFormat' | 'unreadable' | 'noSheets';

export class WorkbookReadError extends Error {
  constructor(
    readonly code: WorkbookErrorCode,
    readonly fileName?: string,
  ) {
    super(code);
    this.name = 'WorkbookReadError';
  }
}
