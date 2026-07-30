/** Wayfare design system — the full component surface, in one import. */

export { Icon, type IconName, type IconSize } from './Icon';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './core/Button';
export { IconButton, type IconButtonProps } from './core/IconButton';
export { Badge, type BadgeProps, type BadgeTone } from './core/Badge';
export { Card, CardButton, type CardProps } from './core/Card';

export { Input } from './forms/Input';
export { Select, type SelectOption } from './forms/Select';
export { Checkbox } from './forms/Checkbox';
export { Switch } from './forms/Switch';

export { Modal } from './feedback/Modal';
export { BottomSheet } from './feedback/BottomSheet';
export { EmptyState, ErrorState, SkeletonLoader } from './feedback/States';
export {
  DataWarningBanner,
  AssumptionCallout,
  OfflineIndicator,
  type AssumptionKind,
} from './feedback/Banners';
export { ToastProvider, useToast, type ToastTone } from './feedback/toast';

export { AppHeader } from './navigation/AppHeader';
export { BottomNav } from './navigation/BottomNav';
export { Sidebar } from './navigation/Sidebar';
export { DateTab } from './navigation/DateTab';
export { SearchFilterSort, type FilterOption } from './navigation/SearchFilterSort';
export { PRIMARY_NAV, SECONDARY_NAV, activeNavKey, type NavItem } from './navigation/navItems';

export { TravelerAvatar, TravelerAvatarStack, type TravelerSlot } from './travel/TravelerAvatar';
export { Segmented, ScenarioToggle, type SegmentedOption } from './travel/Segmented';
export { ActivityTypeBadge, ACTIVITY_ICON } from './travel/ActivityTypeBadge';
export { TimeDurationBlock } from './travel/TimeDurationBlock';
export { RouteDisplay } from './travel/RouteDisplay';
export { CostDisplay } from './travel/CostDisplay';
export { BookingStatusChip } from './travel/BookingStatusChip';
export { ExternalLinkButton } from './travel/ExternalLinkButton';
export { ActivityCard, TimelineRail } from './travel/ActivityCard';
export { DaySummary } from './travel/DaySummary';
export { TripSummaryCard, type TripSummaryStat } from './travel/TripSummaryCard';
export { BookingChecklistRow } from './travel/BookingChecklistRow';
export { BudgetSummaryCard, CategoryBreakdown, type BreakdownCategory } from './travel/BudgetPieces';
export { SourceCard } from './travel/SourceCard';

export { FileUploadZone } from './import/FileUploadZone';
export { ImportProgressStepper, ProgressBar } from './import/ImportProgressStepper';
export { SheetDetectionCard } from './import/SheetDetectionCard';
