import type { IconName } from '../Icon';
import type { Messages } from '../../i18n/en';

export interface NavItem {
  key: string;
  /** Resolved against the active catalogue at render time, not baked in here. */
  labelKey: keyof Messages['nav'];
  icon: IconName;
  to: string;
}

/** The five-item mobile bottom navigation from the design system. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { key: 'home', labelKey: 'home', icon: 'home', to: '/' },
  { key: 'itinerary', labelKey: 'itinerary', icon: 'map', to: '/itinerary' },
  { key: 'budget', labelKey: 'budget', icon: 'wallet', to: '/budget' },
  { key: 'bookings', labelKey: 'bookings', icon: 'clipboard-check', to: '/bookings' },
  { key: 'more', labelKey: 'more', icon: 'menu', to: '/more' },
];

/** Everything that lives under "More" on mobile, and inline in the sidebar. */
export const SECONDARY_NAV: readonly NavItem[] = [
  { key: 'sources', labelKey: 'sources', icon: 'book-open', to: '/sources' },
  { key: 'issues', labelKey: 'issues', icon: 'alert-triangle', to: '/issues' },
  { key: 'import', labelKey: 'importDetails', icon: 'file-spreadsheet', to: '/import' },
];

/** Which nav item a given route highlights. */
export function activeNavKey(path: string): string {
  if (path === '/') return 'home';
  const [, first = ''] = path.split('/');
  switch (first) {
    case 'itinerary':
    case 'activity':
      return 'itinerary';
    case 'budget':
      return 'budget';
    case 'bookings':
      return 'bookings';
    case 'sources':
    case 'issues':
    case 'import':
    case 'more':
      return 'more';
    default:
      return 'home';
  }
}
