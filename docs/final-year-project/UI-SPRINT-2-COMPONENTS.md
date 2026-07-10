# Sprint 2 Component Library Documentation (Phase 18)

Date: 2026-07-11
Scope: Phase 18 Tasks 446-470
Status: Sprint 2 Complete - 25 components implemented

---

## Layout Components

### FilterPanel (`FilterPanel.tsx`)
Collapsible filter panel for search and filter operations.

**Props:**
- `title?: string` - Panel header title (default: "Filters")
- `children: ReactNode` - Filter controls content
- `isCollapsible?: boolean` - Enable collapse toggle (default: true)
- `defaultCollapsed?: boolean` - Initial collapsed state

**Usage:**
```tsx
<FilterPanel title="Search Filters">
  <Select label="Status" options={statusOptions} />
  <DatePicker label="From Date" />
</FilterPanel>
```

### Sidebar (`Sidebar.tsx`, `SidebarItem.tsx`)
Enterprise sidebar navigation with collapse behavior.

**Sidebar Props:**
- `children: ReactNode` - Navigation items
- `isCollapsible?: boolean` - Enable collapse (default: true)
- `defaultCollapsed?: boolean` - Initial state
- `header?: ReactNode` - Top content (logo, branding)
- `footer?: ReactNode` - Bottom content (user menu)

**SidebarItem Props:**
- `icon?: ReactNode` - Leading icon
- `label: string` - Item label
- `href?: string` - Link destination (creates <a>)
- `onClick?: () => void` - Click handler (creates <button>)
- `isActive?: boolean` - Active state styling
- `badge?: string | number` - Notification badge

**Usage:**
```tsx
<Sidebar header={<Logo />} footer={<UserMenu />}>
  <SidebarItem icon={<HomeIcon />} label="Dashboard" href="/dashboard" isActive />
  <SidebarItem icon={<CameraIcon />} label="Cameras" href="/cameras" badge={3} />
</Sidebar>
```

### Header (`Header.tsx`)
Application header with title, logo, and action areas.

**Props:**
- `title?: string` - Page title
- `logo?: ReactNode` - Logo/branding
- `actions?: ReactNode` - Right-side actions (notifications, profile)

**Usage:**
```tsx
<Header 
  logo={<Logo />}
  title="CamTraffic Admin"
  actions={<>
    <NotificationBell notifications={[]} />
    <Avatar src={user.avatar} />
  </>}
/>
```

### Footer (`Footer.tsx`)
Application footer with metadata and links.

**Props:**
- `copyright?: string` - Copyright text
- `version?: string` - Version number
- `links?: Array<{label, href}>` - Footer links
- `children?: ReactNode` - Custom content

**Usage:**
```tsx
<Footer 
  copyright="© 2026 CamTraffic"
  version="1.0.0"
  links={[
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' }
  ]}
/>
```

### Breadcrumb (`Breadcrumb.tsx`)
Location context and navigation breadcrumbs.

**Props:**
- `items: BreadcrumbItem[]` - Breadcrumb path
- `separator?: ReactNode` - Custom separator (default: chevron)

**BreadcrumbItem:**
- `label: string` - Item text
- `href?: string` - Link destination
- `icon?: ReactNode` - Leading icon

**Usage:**
```tsx
<Breadcrumb items={[
  { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
  { label: 'Cameras', href: '/cameras' },
  { label: 'CAM-001' }
]} />
```

---

## Card Components

### StatCard (`StatCard.tsx`)
KPI and metric display cards with trend indicators.

**Props:**
- `label: string` - Metric label
- `value: string | number` - Primary value
- `icon?: ReactNode` - Leading icon
- `trend?: { value: number, label?: string }` - Trend percentage
- `variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'`

**Usage:**
```tsx
<StatCard 
  label="Total Violations"
  value="1,234"
  icon={<AlertIcon />}
  trend={{ value: 12.5, label: 'vs last week' }}
  variant="danger"
/>
```

### ChartCard (`ChartCard.tsx`)
Chart wrapper with header and actions.

**Props:**
- `title: string` - Chart title
- `subtitle?: string` - Description
- `children: ReactNode` - Chart content
- `actions?: ReactNode` - Header actions

**Usage:**
```tsx
<ChartCard 
  title="Violations by Day"
  subtitle="Last 7 days"
  actions={<Select options={periods} />}
>
  <LineChart data={chartData} />
</ChartCard>
```

---

## Data Components

### DataTable (`DataTable.tsx`)
Enterprise data table with sorting, filtering, and pagination support.

**Props:**
- `columns: DataTableColumn<T>[]` - Column definitions
- `data: T[]` - Table data
- `keyExtractor: (item: T) => string` - Unique key function
- `onRowClick?: (item: T) => void` - Row click handler
- `isLoading?: boolean` - Loading state
- `emptyMessage?: string` - Empty state text

**DataTableColumn:**
- `key: string` - Data key
- `header: string` - Column header
- `render?: (item: T) => ReactNode` - Custom cell render
- `sortable?: boolean` - Enable sorting
- `width?: string` - Column width

**Usage:**
```tsx
<DataTable
  columns={[
    { key: 'id', header: 'ID', sortable: true, width: '100px' },
    { key: 'location', header: 'Location', sortable: true },
    { key: 'status', header: 'Status', render: (cam) => <StatusBadge status={cam.status} /> }
  ]}
  data={cameras}
  keyExtractor={(cam) => cam.id}
  onRowClick={(cam) => navigate(`/cameras/${cam.id}`)}
/>
```

### Modal (`Modal.tsx`)
Dialog overlay with backdrop and keyboard controls.

**Props:**
- `isOpen: boolean` - Visibility state
- `onClose: () => void` - Close handler
- `title?: string` - Modal title
- `children: ReactNode` - Modal content
- `footer?: ReactNode` - Footer actions
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal width
- `closeOnOverlayClick?: boolean` - Click outside to close (default: true)
- `closeOnEscape?: boolean` - ESC key to close (default: true)

**Usage:**
```tsx
<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={<>
    <Button onClick={onConfirm}>Confirm</Button>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
  </>}
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

### Drawer (`Drawer.tsx`)
Side panel for contextual workflows.

**Props:**
- `isOpen: boolean` - Visibility state
- `onClose: () => void` - Close handler
- `title?: string` - Drawer title
- `children: ReactNode` - Drawer content
- `footer?: ReactNode` - Footer actions
- `position?: 'left' | 'right'` - Drawer position (default: 'right')

**Usage:**
```tsx
<Drawer 
  isOpen={showDetails}
  onClose={() => setShowDetails(false)}
  title="Camera Details"
  position="right"
>
  <CameraViewer camera={selectedCamera} />
</Drawer>
```

### Timeline (`Timeline.tsx`)
Event stream and audit trail component.

**Props:**
- `items: TimelineItem[]` - Timeline events

**TimelineItem:**
- `id: string` - Unique ID
- `timestamp: string` - Event time
- `title: string` - Event title
- `description?: string` - Event details
- `icon?: ReactNode` - Custom icon
- `variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'`

**Usage:**
```tsx
<Timeline items={[
  { id: '1', timestamp: '2 hours ago', title: 'Violation detected', variant: 'danger' },
  { id: '2', timestamp: '4 hours ago', title: 'Camera online', variant: 'success' }
]} />
```

---

## Utility Components

### StatusBadge (`StatusBadge.tsx`)
Status indicator badges.

**Props:**
- `status: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'danger' | 'info'`
- `label?: string` - Custom label (default: status value)
- `dot?: boolean` - Show status dot (default: false)

**Usage:**
```tsx
<StatusBadge status="active" dot />
<StatusBadge status="danger" label="Offline" />
```

### Avatar (`Avatar.tsx`)
User avatar with status indicator.

**Props:**
- `src?: string` - Image URL
- `alt?: string` - Alt text
- `fallback?: string` - Fallback text for initials
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`
- `status?: 'online' | 'offline' | 'away' | 'busy'`

**Usage:**
```tsx
<Avatar src={user.avatar} fallback={user.name} size="md" status="online" />
```

### NotificationBell (`NotificationBell.tsx`)
Notification center with dropdown panel.

**Props:**
- `notifications: Notification[]` - Notification list
- `onNotificationClick?: (n: Notification) => void` - Click handler
- `onMarkAllRead?: () => void` - Mark all read handler

**Notification:**
- `id: string`
- `title: string`
- `message?: string`
- `timestamp: string`
- `isRead?: boolean`
- `variant?: 'info' | 'success' | 'warning' | 'danger'`

**Usage:**
```tsx
<NotificationBell 
  notifications={notifications}
  onNotificationClick={(n) => navigate(`/notification/${n.id}`)}
  onMarkAllRead={markAllAsRead}
/>
```

### LanguageSwitcher (`LanguageSwitcher.tsx`)
Locale selection dropdown.

**Props:**
- `currentLanguage: string` - Active locale code
- `languages: Language[]` - Available languages
- `onChange: (code: string) => void` - Change handler

**Language:**
- `code: string` - Locale code (e.g., 'en', 'km')
- `label: string` - English label
- `nativeLabel?: string` - Native label (preferred for display)

**Usage:**
```tsx
<LanguageSwitcher 
  currentLanguage="en"
  languages={[
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'km', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ' }
  ]}
  onChange={setLocale}
/>
```

### CommandPalette (`CommandPalette.tsx`)
Quick action command palette with keyboard navigation.

**Props:**
- `commands: CommandItem[]` - Available commands
- `isOpen: boolean` - Visibility state
- `onClose: () => void` - Close handler
- `placeholder?: string` - Search placeholder

**CommandItem:**
- `id: string`
- `label: string` - Command label
- `icon?: ReactNode` - Command icon
- `shortcut?: string` - Keyboard shortcut display
- `onSelect: () => void` - Execute handler
- `category?: string` - Group category

**Keyboard:**
- **Escape** - Close palette
- **Arrow Up/Down** - Navigate
- **Enter** - Execute selected

**Usage:**
```tsx
<CommandPalette 
  isOpen={showPalette}
  onClose={() => setShowPalette(false)}
  commands={[
    { id: '1', label: 'Create Camera', icon: <PlusIcon />, shortcut: 'Ctrl+K', onSelect: createCamera },
    { id: '2', label: 'Search Violations', icon: <SearchIcon />, onSelect: searchViolations }
  ]}
/>
```

---

## State Components

### Skeleton (`Skeleton.tsx`, `SkeletonGroup.tsx`)
Loading state placeholders.

**Skeleton Props:**
- `width?: string | number`
- `height?: string | number`
- `variant?: 'text' | 'circular' | 'rectangular'`

**SkeletonGroup Props:**
- `count?: number` - Number of skeletons (default: 3)
- `spacing?: string | number` - Gap between items
- `children?: ReactNode` - Custom skeleton layout

**Usage:**
```tsx
<Skeleton variant="rectangular" width="100%" height="200px" />
<SkeletonGroup count={5} spacing="1rem" />
```

### EmptyState (`EmptyState.tsx`)
Empty state templates with call-to-action.

**Props:**
- `icon?: ReactNode` - Custom icon
- `title: string` - Empty state title
- `description?: string` - Explanation text
- `action?: ReactNode` - CTA button

**Usage:**
```tsx
<EmptyState 
  title="No cameras found"
  description="Add your first camera to start monitoring"
  action={<Button onClick={addCamera}>Add Camera</Button>}
/>
```

### ErrorState (`ErrorState.tsx`)
Error state templates with retry actions.

**Props:**
- `icon?: ReactNode` - Custom icon
- `title: string` - Error title
- `message?: string` - User-friendly message
- `error?: Error | string` - Technical error details
- `action?: ReactNode` - Retry button
- `showDetails?: boolean` - Show technical details (default: false)

**Usage:**
```tsx
<ErrorState 
  title="Failed to load cameras"
  message="Unable to connect to the server. Please try again."
  error={error}
  action={<Button onClick={retry}>Retry</Button>}
  showDetails={isDev}
/>
```

---

## Domain Components

### FileUpload (`FileUpload.tsx`)
Drag-and-drop file upload component.

**Props:**
- `label?: string` - Upload area label
- `accept?: string` - File type filter
- `multiple?: boolean` - Allow multiple files
- `maxSize?: number` - Max file size in bytes
- `onFileSelect: (files: File[]) => void` - File handler
- `error?: string` - Validation error
- `hint?: string` - Helper text

**Usage:**
```tsx
<FileUpload 
  label="Upload evidence images"
  accept="image/*"
  multiple
  maxSize={5 * 1024 * 1024}
  onFileSelect={handleFiles}
  hint="PNG, JPG up to 5MB"
/>
```

### EvidenceViewer (`EvidenceViewer.tsx`)
Image gallery viewer for violation evidence.

**Props:**
- `evidence: Evidence[]` - Evidence images

**Evidence:**
- `id: string`
- `imageUrl: string` - Full-size image
- `thumbnailUrl?: string` - Thumbnail
- `timestamp: string` - Capture time
- `location?: string` - Capture location
- `description?: string` - Evidence notes

**Features:**
- Image navigation (prev/next)
- Thumbnail strip
- Metadata display (time, location)
- Keyboard navigation

**Usage:**
```tsx
<EvidenceViewer evidence={[
  { id: '1', imageUrl: '/img/ev1.jpg', timestamp: '2026-07-11 10:30', location: 'St. 271' },
  { id: '2', imageUrl: '/img/ev2.jpg', timestamp: '2026-07-11 10:31', location: 'St. 271' }
]} />
```

### CameraViewer (`CameraViewer.tsx`)
Live camera feed viewer with controls.

**Props:**
- `camera: Camera` - Camera data
- `showControls?: boolean` - Show play/pause controls (default: true)

**Camera:**
- `id: string`
- `name: string` - Camera name
- `streamUrl: string` - Video stream URL
- `thumbnailUrl?: string` - Fallback snapshot
- `location: string` - Camera location
- `status: 'online' | 'offline' | 'maintenance'`

**Features:**
- Live stream display
- Status indicator
- Play/pause controls
- Snapshot capture
- Offline fallback display

**Usage:**
```tsx
<CameraViewer 
  camera={{
    id: 'CAM-001',
    name: 'Street 271 North',
    streamUrl: '/stream/cam001',
    location: 'Phnom Penh',
    status: 'online'
  }}
/>
```

### Map (`Map.tsx`)
Map component wrapper (React Leaflet integration placeholder).

**Props:**
- `center: { lat: number, lng: number }` - Map center
- `zoom?: number` - Initial zoom level (default: 13)
- `markers?: MapMarker[]` - Map markers
- `height?: string` - Map height (default: '400px')
- `onMarkerClick?: (marker: MapMarker) => void` - Marker handler

**MapMarker:**
- `id: string`
- `lat: number`
- `lng: number`
- `label?: string`
- `icon?: string`

**Current Status:**
Placeholder implementation - displays map metadata and marker count. React Leaflet integration pending.

**Usage:**
```tsx
<Map 
  center={{ lat: 11.5564, lng: 104.9282 }}
  zoom={13}
  markers={cameraLocations}
  onMarkerClick={(m) => selectCamera(m.id)}
/>
```

---

## Implementation Files

All components are exported from:
- `packages/ui/src/components/index.ts`
- `packages/ui/src/index.ts`

CSS styling via `packages/ui/src/styles/base.css` (styles to be implemented in subsequent tasks).

---

## Next Steps (Sprint 3)

Tasks 471-480: Login and Authentication UX redesign
- Premium admin login experience
- Split-screen user login
- Accessibility enhancements
- Mobile-first responsive design
- Bilingual copy quality
