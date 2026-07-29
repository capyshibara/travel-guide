import type { IconName } from '../Icon';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  to: string;
}

/** The five-item mobile bottom navigation from the design system. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { key: 'home', label: 'Home', icon: 'home', to: '/' },
  { key: 'itinerary', label: 'Itinerary', icon: 'map', to: '/itinerary' },
  { key: 'budget', label: 'Budget', icon: 'wallet', to: '/budget' },
  { key: 'bookings', label: 'Bookings', icon: 'clipboard-check', to: '/bookings' },
  { key: 'more', label: 'More', icon: 'menu', to: '/more' },
];

/** Everything that lives under "More" on mobile, and inline in the sidebar. */
export const SECONDARY_NAV: readonly NavItem[] = [
  { key: 'sources', label: 'Sources & assumptions', icon: 'book-open', to: '/sources' },
  { key: 'issues', label: 'Data issues', icon: 'alert-triangle', to: '/issues' },
  { key: 'import', label: 'Import details', icon: 'file-spreadsheet', to: '/import' },
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
