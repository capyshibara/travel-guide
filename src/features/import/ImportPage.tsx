import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AssumptionCallout,
  Button,
  Card,
  DataWarningBanner,
  ErrorState,
  FileUploadZone,
  Icon,
  ImportProgressStepper,
  ProgressBar,
  SheetDetectionCard,
} from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { WorkbookReadError } from '../../import/issues';
import { actionableIssueCount, visibleIssues } from '../../domain/selectors';
import { formatBytes, pluralize } from '../../lib/format';

const STEPS = ['Reading file', 'Detecting sheets', 'Extracting data', 'Ready'] as const;

type Stage = 'idle' | 'working' | 'done' | 'failed';

interface Failure {
  title: string;
  hint: string;
}

/**
 * Upload and import.
 *
 * Parsing is synchronous and fast enough that the stepper is driven by real phase
 * transitions rather than a fake timer — the phases are just coarse.
 */
export function ImportPage() {
  const { result, overrides, setImportResult, storage } = useTripContext();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>(result ? 'done' : 'idle');
  const [step, setStep] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [sampleAvailable, setSampleAvailable] = useState(true);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const runImport = useCallback(
    async (file: File) => {
      setStage('working');
      setFailure(null);
      setStep(0);
      try {
        // Yield once so the stepper's first frame paints before the parse blocks.
        await new Promise((resolve) => setTimeout(resolve, 0));
        // The spreadsheet parser is ~450 kB and is only needed here, so it is fetched
        // on demand rather than shipped in the bundle every visitor downloads.
        const { importWorkbook } = await import('../../import/buildTrip');
        setStep(1);
        const imported = await importWorkbook(file);
        setStep(3);
        setImportResult(imported);
        setStage('done');
      } catch (error) {
        if (error instanceof WorkbookReadError) {
          setFailure({ title: error.message, hint: error.hint });
        } else {
          setFailure({
            title: "Wayfare couldn't read that workbook",
            hint: 'Something went wrong while reading the file. Try re-saving it as .xlsx and uploading again.',
          });
        }
        setStage('failed');
      }
    },
    [setImportResult],
  );

  const loadSample = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}sample-trip.xlsx`);
      if (!response.ok) throw new Error('missing');
      const blob = await response.blob();
      await runImport(new File([blob], 'sample-trip.xlsx', { type: blob.type }));
    } catch {
      // The sample is a static asset; if it is not deployed, stop offering it rather
      // than leaving a button that silently does nothing.
      setSampleAvailable(false);
    }
  }, [runImport]);

  useEffect(() => {
    if (stage === 'done') liveRef.current?.focus();
  }, [stage]);

  if (stage === 'working') {
    return (
      <div className={shell.stackLoose}>
        <h1 className={shell.pageTitle}>Reading your workbook…</h1>
        <ImportProgressStepper steps={STEPS} current={step} />
        <ProgressBar value={((step + 1) / STEPS.length) * 100} label="Import progress" />
      </div>
    );
  }

  if (stage === 'failed' && failure) {
    return (
      <ErrorState
        title={failure.title}
        description={failure.hint}
        onRetry={() => {
          setStage('idle');
          setFailure(null);
        }}
        retryLabel="Choose another file"
      />
    );
  }

  if (stage === 'done' && result) {
    const remaining = visibleIssues(result.issues, overrides);
    const needsAttention = actionableIssueCount(result.issues, overrides);
    const used = result.sheets.filter((sheet) => sheet.role !== 'unknown');

    return (
      <div className={shell.stackLoose}>
        <div>
          <p className={shell.eyebrow}>Import complete</p>
          <h1 className={shell.pageTitle} tabIndex={-1} ref={liveRef as never}>
            {pluralize(used.length, 'sheet')} read from {result.file.name}
          </h1>
          <p className={shell.muted}>
            {formatBytes(result.file.size)} · {pluralize(result.trip.days.length, 'day')} ·{' '}
            {pluralize(result.trip.days.reduce((sum, day) => sum + day.items.length, 0), 'activity', 'activities')} ·{' '}
            {pluralize(result.trip.bookings.length, 'booking')} · {pluralize(result.trip.sources.length, 'source')}
          </p>
        </div>

        {result.partial ? (
          <AssumptionCallout kind="recheck" label="Partial import">
            Some of the workbook could not be read. Everything Wayfare did understand is available — check Data issues
            for what is missing.
          </AssumptionCallout>
        ) : null}

        {needsAttention > 0 ? (
          <DataWarningBanner
            count={needsAttention}
            message={`${pluralize(needsAttention, 'thing')} ${needsAttention === 1 ? 'needs' : 'need'} a look — missing fields, unreadable values or broken links.`}
            onReview={() => navigate('/issues')}
          />
        ) : null}

        <section className={shell.stack}>
          <h2 className={shell.sectionTitle}>Detected sheets</h2>
          {result.sheets.map((sheet) => (
            <SheetDetectionCard
              key={sheet.name}
              name={sheet.name}
              role={sheet.role}
              confidence={sheet.confidence}
              rowCount={sheet.rowCount}
            />
          ))}
        </section>

        <div className={shell.stack}>
          <Button size="lg" fullWidth onClick={() => navigate('/')}>
            View trip
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setStage('idle')}>
            Import a different workbook
          </Button>
          {remaining.length > 0 ? (
            <Button variant="ghost" fullWidth onClick={() => navigate('/issues')}>
              Review {pluralize(remaining.length, 'data issue')}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={shell.stackLoose}>
      <div>
        <h1 className={shell.pageTitle}>Upload your trip workbook</h1>
        <p className={shell.muted}>
          Wayfare turns your planning spreadsheet into a day-by-day guide. Supports .xlsx and .xlsm, up to 20 MB.
        </p>
      </div>

      <FileUploadZone onFile={(file) => void runImport(file)} />

      {sampleAvailable ? (
        <Button variant="ghost" fullWidth onClick={() => void loadSample()}>
          Or try the sample workbook
        </Button>
      ) : null}

      <Card eyebrow="Your data stays here">
        <p className={shell.muted}>
          Your workbook is read entirely inside your browser. Nothing is uploaded, and no part of it is sent anywhere.
          {storage === 'unavailable'
            ? ' This browser will not let Wayfare save anything locally, so your trip will be lost when you close the tab.'
            : ' The trip Wayfare builds is saved on this device so you can come back to it, and you can delete it at any time from More.'}
        </p>
      </Card>

      <Card eyebrow="What Wayfare looks for">
        <ul className={shell.muted} style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
          <li>
            <b>Overview</b> — trip title, dates, travelers, exchange rates, budget totals
          </li>
          <li>
            <b>Itinerary</b> — one row per activity, with dates, times, places and costs
          </li>
          <li>
            <b>Booking options</b> — what to book, when, and for how much
          </li>
          <li>
            <b>Sources</b> — the facts and assumptions behind the plan
          </li>
        </ul>
        <p className={shell.muted} style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
          <Icon name="info" size="xs" />
          Sheet names and column headings do not have to match exactly — Wayfare recognizes common variations and tells
          you what it could not place.
        </p>
      </Card>
    </div>
  );
}
