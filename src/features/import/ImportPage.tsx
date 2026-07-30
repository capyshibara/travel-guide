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
import { formatBytes } from '../../lib/format';
import { useT } from '../../i18n/useT';
import type { Messages } from '../../i18n/en';

type Stage = 'idle' | 'working' | 'done' | 'failed';

/** A read failure carries only a code; the wording is chosen here, in the active language. */
interface Failure {
  title: string;
  hint: string;
}

function describeFailure(t: Messages, error: unknown): Failure {
  if (!(error instanceof WorkbookReadError)) {
    return { title: t.errors.unexpected.title, hint: t.errors.unexpected.detail };
  }
  switch (error.code) {
    case 'tooLarge':
      return { title: t.errors.tooLarge.title, hint: t.errors.tooLarge.detail };
    case 'empty':
      return { title: t.errors.empty.title, hint: t.errors.empty.detail };
    case 'wrongFormat':
      return { title: t.errors.wrongFormat.title, hint: t.errors.wrongFormat.detail(error.fileName ?? '') };
    case 'noSheets':
      return { title: t.errors.noSheets.title, hint: t.errors.noSheets.detail };
    case 'unreadable':
      return { title: t.errors.unreadable.title, hint: t.errors.unreadable.detail };
  }
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
  const t = useT();

  const [stage, setStage] = useState<Stage>(result ? 'done' : 'idle');
  const [step, setStep] = useState(0);
  // Stored as a code so the message re-renders in the right language if it changes.
  const [failure, setFailure] = useState<unknown>(null);
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
        setFailure(error);
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
        <h1 className={shell.pageTitle}>{t.import.reading}</h1>
        <ImportProgressStepper steps={t.import.steps} current={step} />
        <ProgressBar value={((step + 1) / t.import.steps.length) * 100} label={t.import.progress} />
      </div>
    );
  }

  if (stage === 'failed') {
    const described = describeFailure(t, failure);
    return (
      <ErrorState
        title={described.title}
        description={described.hint}
        onRetry={() => {
          setStage('idle');
          setFailure(null);
        }}
        retryLabel={t.import.chooseAnotherFile}
      />
    );
  }

  if (stage === 'done' && result) {
    const remaining = visibleIssues(result.issues, overrides);
    const needsAttention = actionableIssueCount(result.issues, overrides);
    const used = result.sheets.filter((sheet) => sheet.role !== 'unknown');
    const activityCount = result.trip.days.reduce((sum, day) => sum + day.items.length, 0);

    return (
      <div className={shell.stackLoose}>
        <div>
          <p className={shell.eyebrow}>{t.import.complete}</p>
          <h1 className={shell.pageTitle} tabIndex={-1} ref={liveRef as never}>
            {t.import.readFrom(used.length, result.file.name)}
          </h1>
          <p className={shell.muted}>
            {formatBytes(result.file.size)} · {t.common.days(result.trip.days.length)} ·{' '}
            {t.common.activities(activityCount)} · {t.common.bookings(result.trip.bookings.length)} ·{' '}
            {t.common.sources(result.trip.sources.length)}
          </p>
        </div>

        {result.partial ? (
          <AssumptionCallout kind="recheck" label={t.import.partialTitle}>
            {t.import.partialBody}
          </AssumptionCallout>
        ) : null}

        {needsAttention > 0 ? (
          <DataWarningBanner
            count={needsAttention}
            message={t.import.needsLook(needsAttention)}
            onReview={() => navigate('/issues')}
          />
        ) : null}

        <section className={shell.stack}>
          <h2 className={shell.sectionTitle}>{t.import.detectedSheets}</h2>
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
            {t.import.viewTrip}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setStage('idle')}>
            {t.import.importAnother}
          </Button>
          {remaining.length > 0 ? (
            <Button variant="ghost" fullWidth onClick={() => navigate('/issues')}>
              {t.import.reviewIssues(remaining.length)}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={shell.stackLoose}>
      <div>
        <h1 className={shell.pageTitle}>{t.import.title}</h1>
        <p className={shell.muted}>{t.import.intro}</p>
      </div>

      <FileUploadZone onFile={(file) => void runImport(file)} />

      {sampleAvailable ? (
        <Button variant="ghost" fullWidth onClick={() => void loadSample()}>
          {t.import.trySample}
        </Button>
      ) : null}

      <Card eyebrow={t.import.privacyTitle}>
        <p className={shell.muted}>
          {t.import.privacyBody}
          {storage === 'unavailable' ? t.import.privacyUnavailable : t.import.privacyStored}
        </p>
      </Card>

      <Card eyebrow={t.import.looksForTitle}>
        <ul className={shell.muted} style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
          <li>
            <b>{t.sheetRole.overview}</b> — {t.import.looksForOverview}
          </li>
          <li>
            <b>{t.sheetRole.itinerary}</b> — {t.import.looksForItinerary}
          </li>
          <li>
            <b>{t.sheetRole.bookings}</b> — {t.import.looksForBookings}
          </li>
          <li>
            <b>{t.sheetRole.sources}</b> — {t.import.looksForSources}
          </li>
        </ul>
        <p className={shell.muted} style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
          <Icon name="info" size="xs" />
          {t.import.aliasesNote}
        </p>
      </Card>
    </div>
  );
}
