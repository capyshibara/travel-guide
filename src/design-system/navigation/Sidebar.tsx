import type { ReactNode } from 'react';
import styles from './navigation.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { Link } from '../../app/router';
import { PRIMARY_NAV, SECONDARY_NAV } from './navItems';
import { useT } from '../../i18n/useT';

export interface SidebarProps {
  activeKey: string;
  tripTitle?: string;
  /** Count shown against "Data issues". */
  issueCount?: number;
  footer?: ReactNode;
}

/**
 * Tablet/desktop replacement for BottomNav. Same hierarchy, but "More" is expanded
 * inline because there is room for it at this width.
 */
export function Sidebar({ activeKey, tripTitle, issueCount, footer }: SidebarProps) {
  const t = useT();
  const items = [...PRIMARY_NAV.filter((item) => item.key !== 'more'), ...SECONDARY_NAV];

  return (
    <nav className={styles.sidebar} aria-label={t.nav.primary}>
      <div className={styles.sidebarBrand}>{t.app.name}</div>
      {tripTitle ? <div className={styles.sidebarTrip}>{tripTitle}</div> : null}
      {items.map((item) => {
        const active = item.key === activeKey || (activeKey === 'more' && item.key === 'sources');
        return (
          <Link
            key={item.key}
            to={item.to}
            className={cx(styles.sidebarItem, active && styles.sidebarItemActive)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={item.icon} size="sm" />
            {t.nav[item.labelKey]}
            {item.key === 'issues' && issueCount ? (
              <span className={styles.sidebarCount}>
                {issueCount}
                <span className="visually-hidden"> {t.nav.unresolvedIssues}</span>
              </span>
            ) : null}
          </Link>
        );
      })}
      {footer ? <div className={styles.sidebarFooter}>{footer}</div> : null}
    </nav>
  );
}
