/**
 * Icon wrapper.
 *
 * The design system specifies Lucide line icons at five fixed sizes. It loads them
 * from a CDN via `<i data-lucide>`; we use the `lucide-react` package instead so the
 * icons are bundled (no third-party request, works offline) and tree-shaken.
 *
 * Icons in this system always accompany a text label, so they are `aria-hidden` by
 * default. Pass `title` only for the rare standalone case.
 */
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle, ArrowRight, Backpack, BedDouble, BookOpen, Bus, CalendarClock, Check,
  CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Coffee, Compass, Copy,
  CircleHelp, Columns3, Download, ExternalLink, FileSpreadsheet, Home, Inbox, Info, Link2Off,
  Map, MapPin, Menu, Moon, Mountain, Plane, Search, Share2, Ticket, Trash2, TriangleAlert,
  UploadCloud, Utensils, Wallet, X, Circle,
} from 'lucide-react';

export const ICONS = {
  'alert-triangle': AlertTriangle,
  'arrow-right': ArrowRight,
  backpack: Backpack,
  'bed-double': BedDouble,
  'book-open': BookOpen,
  bus: Bus,
  'calendar-clock': CalendarClock,
  check: Check,
  'check-circle-2': CheckCircle2,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  circle: Circle,
  'circle-help': CircleHelp,
  'clipboard-check': ClipboardCheck,
  clock: Clock,
  coffee: Coffee,
  'columns-3': Columns3,
  compass: Compass,
  copy: Copy,
  download: Download,
  'external-link': ExternalLink,
  'file-spreadsheet': FileSpreadsheet,
  home: Home,
  inbox: Inbox,
  info: Info,
  'link-2-off': Link2Off,
  map: Map,
  'map-pin': MapPin,
  menu: Menu,
  moon: Moon,
  mountain: Mountain,
  plane: Plane,
  search: Search,
  'share-2': Share2,
  ticket: Ticket,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  'upload-cloud': UploadCloud,
  utensils: Utensils,
  wallet: Wallet,
  x: X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_VAR: Record<IconSize, string> = {
  xs: 'var(--icon-xs)',
  sm: 'var(--icon-sm)',
  md: 'var(--icon-md)',
  lg: 'var(--icon-lg)',
  xl: 'var(--icon-xl)',
};

export interface IconProps {
  name: IconName;
  size?: IconSize;
  /** Visible label for the rare icon that stands alone. */
  title?: string;
  className?: string;
}

export function Icon({ name, size = 'sm', title, className }: IconProps) {
  const Glyph = ICONS[name];
  const dimension = SIZE_VAR[size];
  return (
    <Glyph
      className={className}
      // Sized through CSS, not the SVG width/height presentation attributes: those
      // take a plain length and reject `var()`, so the token would be ignored.
      style={{ width: dimension, height: dimension, flexShrink: 0 }}
      strokeWidth={1.75}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    />
  );
}
