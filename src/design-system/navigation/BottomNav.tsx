import styles from './navigation.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { Link } from '../../app/router';
import { PRIMARY_NAV } from './navItems';

export interface BottomNavProps {
  activeKey: string;
  /** Draws an attention dot on "More" when there are unresolved data issues. */
  moreBadge?: boolean;
}

export function BottomNav({ activeKey, moreBadge }: BottomNavProps) {
  return (
    <nav className={styles.bottomNav} aria-label="Primary">
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
              {item.label}
            </Link>
            {item.key === 'more' && moreBadge ? (
              <span className={styles.bottomNavDot}>
                <span className="visually-hidden">Unresolved data issues</span>
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
