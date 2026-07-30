import { useState } from 'react';
import { Badge, Button, Card, CardButton, Icon, Modal, Select, useToast } from '../../design-system';
import shell from '../../app/AppShell.module.css';
import { useNavigate } from '../../app/router';
import { useTripContext } from '../../state/TripContext';
import { SECONDARY_NAV } from '../../design-system';
import { actionableIssueCount } from '../../domain/selectors';
import { currentLocale, formatBytes } from '../../lib/format';
import { useT } from '../../i18n/useT';
import { CATALOGUES, LANGUAGES, isLanguage } from '../../i18n/locale';

export function MorePage() {
  const { result, overrides, preferences, setPreferences, clearAll, storage } = useTripContext();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const [confirmClear, setConfirmClear] = useState(false);

  const issueCount = result ? actionableIssueCount(result.issues, overrides) : 0;

  return (
    <div className={shell.stackLoose}>
      <h1 className={shell.pageTitle}>{t.more.title}</h1>

      <section className={shell.stack}>
        {SECONDARY_NAV.map((item) => (
          <CardButton key={item.key} onClick={() => navigate(item.to)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Icon name={item.icon} size="sm" />
              <span style={{ flex: 1, fontWeight: 'var(--fw-semibold)' }}>{t.nav[item.labelKey]}</span>
              {item.key === 'issues' && issueCount > 0 ? <Badge tone="warning">{issueCount}</Badge> : null}
              <Icon name="chevron-right" size="sm" />
            </span>
          </CardButton>
        ))}
      </section>

      <Card eyebrow={t.more.appearance}>
        <Select
          label={t.more.theme}
          value={preferences.theme}
          onChange={(value) => setPreferences({ theme: value === 'dark' || value === 'light' ? value : 'system' })}
          options={[
            { value: 'system', label: t.more.themeSystem },
            { value: 'light', label: t.more.themeLight },
            { value: 'dark', label: t.more.themeDark },
          ]}
        />
        <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
          {t.more.themeNote}
        </p>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <Select
            label={t.more.language}
            value={preferences.language}
            onChange={(value) => {
              if (isLanguage(value)) setPreferences({ language: value });
            }}
            // Each language is named in itself, so it is findable by someone who cannot
            // read the language the app is currently in.
            options={LANGUAGES.map((language) => ({ value: language, label: CATALOGUES[language].meta.name }))}
          />
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            {t.more.languageNote}
          </p>
        </div>
      </Card>

      {result ? (
        <Card eyebrow={t.more.importedWorkbook}>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>{t.more.file}</p>
            <p className={shell.definitionValue} style={{ fontFamily: 'var(--font-body)' }}>
              {result.file.name}
            </p>
          </div>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>{t.more.size}</p>
            <p className={shell.definitionValue}>{formatBytes(result.file.size)}</p>
          </div>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>{t.more.imported}</p>
            <p className={shell.definitionValue} style={{ fontFamily: 'var(--font-body)' }}>
              {new Date(result.importedAt).toLocaleString(currentLocale())}
            </p>
          </div>
          <div className={shell.definitionRow}>
            <p className={shell.definitionLabel}>{t.more.sheetsRead}</p>
            <p className={shell.definitionValue}>
              {t.more.sheetsReadValue(result.sheets.filter((sheet) => sheet.role !== 'unknown').length, result.sheets.length)}
            </p>
          </div>
        </Card>
      ) : null}

      <Card eyebrow={t.more.yourData}>
        <p className={shell.muted}>{t.more.dataBody}</p>
        <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
          {storage === 'unavailable' ? t.more.dataUnavailable : t.more.dataStored}
        </p>
        {result ? (
          <p className={shell.muted} style={{ marginTop: 'var(--space-3)' }}>
            {t.more.currentlyStored(
              t.common.days(result.trip.days.length),
              t.common.bookings(result.trip.bookings.length),
              t.more.statusChanges(Object.keys(overrides.bookingStatus).length),
            )}
          </p>
        ) : null}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button
            variant="danger"
            icon={<Icon name="trash-2" size="sm" />}
            onClick={() => setConfirmClear(true)}
            disabled={!result}
          >
            {t.more.clearData}
          </Button>
        </div>
      </Card>

      <Card eyebrow={t.more.about}>
        <p className={shell.muted}>{t.more.aboutBody}</p>
      </Card>

      <Modal
        open={confirmClear}
        title={t.more.clearConfirmTitle}
        onClose={() => setConfirmClear(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void clearAll().then(() => {
                  setConfirmClear(false);
                  toast(t.more.cleared, 'success');
                  navigate('/import');
                });
              }}
            >
              {t.more.clearEverything}
            </Button>
          </>
        }
      >
        {t.more.clearConfirmBody}
      </Modal>
    </div>
  );
}
