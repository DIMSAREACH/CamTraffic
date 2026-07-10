export { Button, Input, Card, Spinner } from './components';
export type { ButtonProps, InputProps, CardProps, SpinnerProps } from './components';
export { Select, Textarea, Badge, Alert } from './components';
export type { SelectProps, SelectOption, TextareaProps, BadgeProps, AlertProps } from './components';
export { Checkbox, RadioGroup, DatePicker, SearchBar } from './components';
export type { CheckboxProps, RadioGroupProps, RadioOption, DatePickerProps, SearchBarProps } from './components';

// Layout components
export { FilterPanel, Sidebar, SidebarItem, Header, Footer, Breadcrumb } from './components';
export type { FilterPanelProps, SidebarProps, SidebarItemProps, HeaderProps, FooterProps, BreadcrumbProps, BreadcrumbItem } from './components';

// Card variants
export { StatCard, ChartCard } from './components';
export type { StatCardProps, ChartCardProps } from './components';

// Data components
export { DataTable, Modal, Drawer, Timeline } from './components';
export type { DataTableProps, DataTableColumn, ModalProps, DrawerProps, TimelineProps, TimelineItem } from './components';

// Utility components
export { StatusBadge, Avatar, NotificationBell, LanguageSwitcher, CommandPalette } from './components';
export type { StatusBadgeProps, AvatarProps, NotificationBellProps, Notification, LanguageSwitcherProps, Language, CommandPaletteProps, CommandItem } from './components';

// State components
export { Skeleton, SkeletonGroup, EmptyState, ErrorState } from './components';
export type { SkeletonProps, SkeletonGroupProps, EmptyStateProps, ErrorStateProps } from './components';

// Domain components
export { FileUpload, EvidenceViewer, CameraViewer, Map } from './components';
export type { FileUploadProps, EvidenceViewerProps, Evidence, CameraViewerProps, Camera, MapProps, MapMarker } from './components';

export {
  ThemeProvider,
  ThemeToggle,
  useTheme,
  lightTheme,
  darkTheme,
  applyTheme,
  resolveThemeMode,
  bootstrapTheme,
  createThemeBootstrapScript,
} from './theme';
export type {
  ThemePreference,
  ResolvedThemeMode,
  ThemeMode,
  ThemeTokens,
  ThemeOverrides,
  ThemeProviderProps,
  ThemeToggleProps,
} from './theme';

export {
  I18nProvider,
  LocaleToggle,
  useI18n,
  useTranslation,
  en,
  km,
  mergeDictionary,
  detectBrowserLocale,
  bootstrapLocale,
  createLocaleBootstrapScript,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from './locales';
export type {
  Locale,
  Dictionary,
  DeepPartial,
  EnDictionary,
  I18nProviderProps,
  LocaleToggleProps,
} from './locales';
