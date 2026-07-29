import type { ReactNode } from 'react';
import styles from './travel.module.css';

export interface BookingChecklistRowProps {
  item: string;
  meta?: string;
  plan?: string;
  targetPrice?: string;
  fallbackPrice?: string;
  status: ReactNode;
  traveler?: ReactNode;
  actions?: ReactNode;
}

/** One row of the booking checklist, grouped under an urgency heading by the page. */
export function BookingChecklistRow({
  item,
  meta,
  plan,
  targetPrice,
  fallbackPrice,
  status,
  traveler,
  actions,
}: BookingChecklistRowProps) {
  return (
    <article className={styles.bookingRow}>
      <div className={styles.bookingTop}>
        <div>
          <h3 className={styles.bookingTitle}>{item}</h3>
          {meta ? <div className={styles.bookingMeta}>{meta}</div> : null}
          {plan ? <div className={styles.bookingMeta}>{plan}</div> : null}
        </div>
        {status}
      </div>

      {targetPrice || fallbackPrice ? (
        <div className={styles.bookingPrices}>
          <span>
            {targetPrice ? (
              <>
                Target <b className={styles.bookingPriceStrong}>{targetPrice}</b>
              </>
            ) : (
              'No target price'
            )}
            {fallbackPrice ? ` · Fallback ${fallbackPrice}` : ''}
          </span>
          {traveler}
        </div>
      ) : null}

      {actions ? <div className={styles.bookingActions}>{actions}</div> : null}
    </article>
  );
}
