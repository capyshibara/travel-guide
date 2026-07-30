import styles from './navigation.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { Link } from '../../app/router';
import { PRIMARY_NAV } from './navItems';
import { useT } from '../../i18n/useT';

export interface BottomNavProps {
  activeKey: string;
  /** Draws an attention dot on "More" when there are unresolved data issues. */
  moreBadge?: boolean;
}

export function BottomNav({ activeKey, moreBadge }: BottomNavProps) {
  const t = useT();
  return (
    <nav className={styles.bottomNav} aria-label={t.nav.primary}>
      {PRIMARY_NAV.map((item) => {
        const active = item.key === activeKey;
        return (
          <span className={styles.bottomNavItemWrap} key={item.key}>
            <Link
              to={item.to}
              className={cx(styles.bottomNavItem, active && styles.bottomNavItemActive)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size="md" />
              {t.nav[item.labelKey]}
            </Link>
            {item.key === 'more' && moreBadge ? (
              <span className={styles.bottomNavDot}>
                <span className="visually-hidden">{t.nav.unresolvedIssues}</span>
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
