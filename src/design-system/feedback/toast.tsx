import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import styles from './feedback.module.css';
import { Icon } from '../Icon';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

interface ToastRecord {
  id: number;
  message: string;
  tone: ToastTone;
}

const TONE_COLOR: Record<ToastTone, string> = {
  neutral: 'var(--stone-400)',
  success: 'var(--green-500)',
  warning: 'var(--amber-500)',
  danger: 'var(--red-500)',
};

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const push = useCallback((message: string, tone: ToastTone = 'neutral') => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), message, tone }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {/* A single live region: announcements arrive in order without stacking regions. */}
      <div className={styles.toastRegion} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={styles.toast}>
      <span className={styles.toastDot} style={{ background: TONE_COLOR[toast.tone] }} aria-hidden="true" />
      <span className={styles.toastText}>{toast.message}</span>
      <button type="button" className={styles.toastClose} onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        <Icon name="x" size="xs" />
      </button>
    </div>
  );
}

/** Show a transient message. No-ops outside a ToastProvider rather than throwing. */
export function useToast(): (message: string, tone?: ToastTone) => void {
  const push = useContext(ToastContext);
  const noop = useMemo(() => () => undefined, []);
  return push ?? noop;
}
