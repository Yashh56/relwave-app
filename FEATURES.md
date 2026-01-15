# Frontend Features - DB Studio (Database Visualizer)

This document outlines all the frontend features and capabilities of DB Studio - a modern, minimalistic database management application built with Tauri, React, and TypeScript.

**Tech Stack:** Tauri + React 18 + TypeScript + Tailwind CSS + shadcn/ui + React Query + ReactFlow + Recharts + CodeMirror

---

## 🎯 Core Pages & Navigation

### 1. Dashboard (Index Page)
The main landing page for managing database connections. Features a clean, VS Code-inspired design.

**Features:**
- **Database Connection Management**
  - Add new database connections with detailed configuration (name, type, host, port, user, password, SSL options)
  - **Connect via URL (NEW)** - Paste connection URLs like `postgres://user:pass@host:port/db`
  - Auto-parse URLs to populate form fields
  - Delete existing database connections
  - Test database connections with real-time feedback
  - View connection status indicators for all databases
  
- **Database Statistics Overview**
  - Total connected databases count
  - Aggregate table count across all databases
  - Total row count across all databases
  - Total database size (displayed in MB)
  - Real-time stats loading indicators

- **Search & Filter**
  - Search databases by name with instant filtering
  - Empty state messaging when no databases are found

- **Prefetching & Performance**
  - Hover-based prefetching for faster navigation
  - Cached queries using React Query
  - Optimistic UI updates for better responsiveness

- **Refresh Functionality**
  - Manual refresh button to update all database stats
  - Automatic cache invalidation and refetching

---

### 2. Database Details Page
Detailed view for individual database operations with a split-panel layout.

**Layout:**
- **Left Panel:** Tables Explorer with collapsible table list
- **Right Panel:** Content Viewer with data table, pagination, and actions
- **Slide-out Panels:** Chart visualization and migrations

**Features:**
- **Tables Explorer Panel**
  - Collapsible table list with search
  - Click to select and load table data
  - Visual indicators for selected table
  - Table count display

- **Content Viewer Panel**
  - Table name and row count header
  - Quick action buttons (Insert, Chart, Export, Refresh)
  - Search bar for filtering table data
  - **DataTable Component** with:
    - Row numbers column
    - Enhanced data type formatting:
      - Booleans as colored pills (green/red)
      - Numbers in indigo color
      - Dates in violet color  
      - JSON/objects in amber color
      - NULL values as muted badges
    - Edit/Delete row actions on hover
    - Empty state with helpful messaging

- **Pagination Controls**
  - Compact button-based pagination
  - Page size selector (10, 25, 50, 100, 250 rows)
  - "Showing X to Y of Z rows" indicator
  - First/Previous/Next/Last navigation

- **Search Functionality**
  - Search across all table columns
  - Case-insensitive search (ILIKE for PostgreSQL, LIKE for MySQL)
  - Paginated search results
  - Real-time result count display
  - Clear search to return to normal view

- **Row Operations**
  - **Insert Data Dialog** - Add new rows with FK dropdown support
  - **Edit Row Dialog** - Modify existing row data with form fields
  - **Delete Confirmation** - Styled shadcn AlertDialog with row preview

- **Chart Visualization** (Slide-out Panel)
  - Bar, Line, Pie, and Scatter chart types
  - Icon-based chart type selector
  - X/Y axis column selection
  - Chart title customization
  - Export as PNG or SVG (dropdown menu)
  - Uses shadcn ChartContainer and ChartTooltip
  - Single theme-based color (`var(--primary)`)

- **Migrations Panel** (Slide-out Panel)
  - View local migrations (not yet applied)
  - View applied migrations with timestamps
  - Rollback functionality for applied migrations
  - Baseline support for migration management

- **Header Actions**
  - SQL Workspace quick access button
  - Migrations panel toggle
  - Export All dropdown (CSV/JSON)
  - Refresh button

---

### 3. SQL Workspace (NEW)
A full VS Code-style SQL editor page for writing and executing queries.

**Layout:**
- **Top Bar:** Database breadcrumb, execution status, Run/Stop buttons
- **Left Sidebar:** Collapsible with Tables and History sections
- **Main Area:** Split between editor (top) and results (bottom)
- **Status Bar:** Connection info, row count, execution time

**Features:**
- **Multi-Tab Query Support**
  - Create multiple query tabs
  - Tab status indicators (idle/running/success/error)
  - Close tabs with unsaved warning
  - Rename tabs by double-clicking

- **Collapsible Sidebar**
  - **Tables Section:**
    - List all database tables
    - Click to insert `SELECT * FROM table` query
    - Table count badge
  - **History Section:**
    - Recent query history
    - Click to load previous query
    - Timestamp display
    - Clear history option

- **SQL Editor**
  - CodeMirror-based editor with SQL syntax highlighting
  - Auto-resize based on content
  - Keyboard shortcuts (Ctrl+Enter to execute)

- **Query Execution**
  - Real-time progress indicator (rows fetched, elapsed time)
  - Cancel running queries
  - Streaming results display
  - Error handling with detailed messages

- **Results Panel**
  - DataTable with row numbers and type formatting
  - Row count and execution time display
  - Empty state when no results

---

### 4. Query Builder (Redesigned)
Visual SQL query builder with VS Code-style interface and drag-and-drop canvas.

**Layout:**
- **Top Bar:** Database breadcrumb, Generate and Execute buttons, progress indicator
- **Left Sidebar:** Collapsible Explorer with Tables, Configuration, and History
- **Main Canvas:** ReactFlow diagram for visual table relationships
- **Bottom Panel:** SQL preview (1/3) + Results table (2/3)
- **Status Bar:** Table count, join count, filter count, limit

**Features:**
- **Tables Section**
  - Click to add table to canvas
  - Click again to remove (toggle behavior)
  - Checkmark indicator for added tables
  - Table count badge

- **Configuration Section**
  - **Columns:** Add/remove columns to SELECT (shows column name only, not table.column)
  - **Filters:** Add WHERE clause conditions with column/operator/value
  - **Sort By:** ORDER BY with ASC/DESC toggle
  - **Group By:** GROUP BY column selection
  - **Limit:** Quick select buttons (10, 50, 100, 500)

- **Visual Canvas**
  - Drag-and-drop table nodes
  - Connect tables to create JOINs
  - Click edge to change join type (INNER/LEFT/RIGHT/FULL)
  - Color-coded join types
  - Zoom and pan controls
  - Added tables shown as removable pills

- **SQL Generation**
  - Real-time SQL preview
  - Auto-save to query history
  - Execute generated query
  - Streaming results with progress

- **History Section**
  - Load previous queries
  - Clear history option

---

### 5. Schema Explorer
Comprehensive database schema visualization and management.

**Features:**
- **Tree View Panel**
  - Hierarchical display: Database → Schema → Tables → Columns
  - Expandable/collapsible schema and table nodes
  - Visual indicators for:
    - Primary keys (key icon)
    - Foreign keys (link icon)
    - Column types and constraints
  - Right-click context menu for actions

- **Metadata Panel**
  - Detailed information for selected database/schema/table
  - Column details:
    - Name
    - Data type
    - Nullable status
    - Primary key indicator
    - Foreign key references
    - Default values
    - Auto-increment status
  - Index information
  - Foreign key relationships

- **Table Operations**
  - **Create Table Dialog**
    - Add multiple columns with properties
    - Set data types
    - Configure NOT NULL constraints
    - Set primary keys
    - Add default values
    - Auto-generate and apply migrations
  
  - **Alter Table Dialog**
    - Add new columns
    - Drop existing columns
    - Rename columns
    - Change column types
    - Modify constraints (NOT NULL, PRIMARY KEY)
    - Set/drop default values
    - Auto-generate and apply migrations
  
  - **Drop Table Dialog**
    - Safe table deletion with confirmation
    - Cascade/restrict options
    - Auto-generate and apply migrations

- **Index Management**
  - Create indexes with multiple columns
  - Specify index type (B-tree, Hash, etc.)
  - Set unique constraints
  - View existing indexes

- **Foreign Key Management**
  - Create foreign key relationships
  - Reference columns across tables
  - Set cascade rules (CASCADE, SET NULL, RESTRICT)
  - Visual foreign key indicators

- **Auto-Migration**
  - Automatically generate migrations for all schema changes
  - Immediate migration application
  - Integration with migrations panel

---

### 6. ER Diagram
Entity-Relationship diagram visualization.

**Features:**
- **Visual Database Schema**
  - Interactive canvas with ReactFlow
  - Automatic table node generation
  - Column listing with type information
  - Primary key highlighting
  - Foreign key relationship visualization

- **Layout & Navigation**
  - Pan and zoom controls
  - Auto-layout algorithms
  - Minimap for large diagrams
  - Fit-to-screen view

- **Interactive Elements**
  - Click to select tables
  - Drag to reposition tables
  - Relationship lines between tables
  - Hover tooltips for details

---

### 7. Settings Page
Customize application appearance and preferences.

**Features:**
- **Theme Mode Selection**
  - Light mode
  - Dark mode
  - System preference (auto)
  - Real-time theme switching

- **Accent Color Themes**
  - Multiple color variants:
    - Blue (default)
    - Purple
    - Green
    - Pink
    - Orange
    - And more variants
  - Visual color preview
  - Persistent theme preferences
  - Real-time color updates

- **Preview Section**
  - Live preview of UI elements with selected theme
  - Button variants preview
  - Text and border color preview

---

## 🎨 UI/UX Features

### Design System
- **Minimalistic VS Code-Style Interface**
  - Clean, professional appearance
  - Consistent spacing and typography
  - Subtle borders (`border-border/40`)
  - Muted backgrounds (`bg-muted/20`)
  - Theme-aware color system using CSS variables

### Layout Components
- **Custom Title Bar (Tauri)**
  - 32px fixed height
  - Draggable area for window movement
  - Minimize, maximize, close buttons
  - z-index layering for proper stacking

- **Vertical Icon Bar**
  - Fixed left sidebar (60px width)
  - Navigation icons: Home, Settings, SQL Workspace, Query Builder, Schema Explorer, ER Diagram
  - Active state indicators
  - Tooltip labels on hover

- **Slide-Out Panels**
  - Right-side panels for Chart and Migrations
  - Backdrop overlay with click-to-close
  - Smooth slide animation
  - Proper height calculation (`calc(100vh-32px)`)

- **Collapsible Sidebars**
  - Toggle button to collapse/expand
  - Smooth width transition
  - Persistent state

### Theming System
- **Dark/Light Mode Support**
  - Seamless switching between modes
  - CSS variable-based theming
  - Persistent preferences in localStorage

- **Theme Variants**
  - Multiple accent color options
  - Consistent color palette across app
  - Professional color schemes

### Loading States
- **Bridge Loader**
  - Displayed while connecting to Tauri backend
  - Loading spinner with animation
  - Error state for failed connections

- **Component-Level Loading**
  - Skeleton loaders for data tables
  - Spinner components for async operations
  - Progress indicators for long-running queries

### Notifications & Feedback
- **Toast Notifications**
  - Success messages (green)
  - Error messages (red)
  - Warning messages (yellow)
  - Info messages (blue)
  - Rich descriptions for context
  - Auto-dismiss with configurable duration

### Responsive Design
- **Mobile-Friendly Layout**
  - Responsive grid systems
  - Adaptive sidebar panels
  - Touch-friendly controls
  - Breakpoint-based layouts

### Data Display
- **DataTable Component (Enhanced)**
  - Row numbers column (muted, small font)
  - Responsive table layout with horizontal scroll
  - **Type-Aware Cell Formatting:**
    - Booleans: Colored pills (green for true, red for false)
    - Numbers: Indigo-colored text
    - Dates: Violet-colored text
    - JSON/Objects: Amber-colored with `{ }` indicator
    - NULL values: Muted "NULL" badge
    - Long text: Truncated with ellipsis
  - Edit/Delete action buttons on row hover
  - Empty state with icon and message
  - Sortable columns
  - Paginated results

---

## 🔌 Integration Features

### React Query Integration
- **Intelligent Caching**
  - Automatic query caching with stale-time
  - Background refetching
  - Cache invalidation strategies
  - Optimistic updates

- **Query States**
  - Loading states
  - Error states
  - Success states
  - Refetching indicators

### Tauri Bridge API
- **Backend Communication**
  - Type-safe API calls
  - Session management for queries
  - Real-time event listeners for query progress
  - Connection testing
  - Schema introspection

### Event-Driven Architecture
- **Custom Events**
  - `bridge:query.result` - Streaming query results
  - `bridge:query.progress` - Real-time progress updates
  - `bridge:query.done` - Query completion
  - `bridge:query.error` - Error handling
  - Session-based event filtering

---

## 🚀 Performance Features

### Optimization Techniques
- **Prefetching**
  - Hover-based data prefetching
  - Predictive loading for better UX
  - Background data fetching

- **Lazy Loading**
  - Component-level code splitting
  - On-demand resource loading
  - Progressive data loading

- **Memoization**
  - React.memo for expensive components
  - useCallback for function references
  - useMemo for computed values

### Caching Strategy
- **Multi-Level Caching**
  - React Query cache for API calls
  - localStorage for user preferences
  - Session storage for temporary data
  - Query history persistence

---

## 🎯 User Experience Features

### Navigation
- **React Router Integration**
  - Client-side routing
  - Back/forward navigation
  - Deep linking support
  - Breadcrumb navigation

### Keyboard Shortcuts
- **Accessibility**
  - Tab navigation
  - Enter to submit forms
  - Escape to close dialogs
  - Keyboard-friendly controls

### Form Handling
- **Validation**
  - Required field validation
  - Custom validation rules
  - Real-time error feedback
  - Form state management

### Dialogs & Modals
- **Interactive Dialogs**
  - Create table dialog
  - Alter table dialog
  - Drop table dialog
  - Add database dialog
  - Add indexes dialog
  - **Insert Data dialog (NEW)** - Add new rows with FK dropdown support
  - **Edit Row dialog (NEW)** - Modify existing row data
  - **Delete Confirmation dialog (NEW)** - Styled shadcn AlertDialog

---

## 📊 Data Visualization

### Chart Visualization (Enhanced)
- **Chart Types:**
  - Bar Chart (vertical bars)
  - Line Chart (with dots)
  - Pie Chart (with labels)
  - Scatter Chart (data points)

- **Chart Configuration:**
  - Icon-based chart type selector (toggle buttons)
  - X-axis column dropdown
  - Y-axis column dropdown
  - Chart title input
  - Compact 3-column layout

- **Styling:**
  - Single theme-based color (`var(--primary)`)
  - shadcn ChartContainer integration
  - ChartTooltip with ChartTooltipContent
  - Responsive sizing
  - Clean, minimalistic appearance

- **Export Options:**
  - Dropdown menu with PNG and SVG options
  - High-quality image export
  - Proper chart dimensions

### Table Visualization
- **Advanced DataTable**
  - Column sorting
  - Pagination controls
  - Row highlighting
  - Responsive columns
  - Empty states

---

## 🔧 Developer Features

### Type Safety
- **TypeScript Integration**
  - Full type coverage
  - Interface definitions
  - Type inference
  - Compile-time checking

### Component Architecture
- **Modular Design**
  - Reusable UI components
  - Shadcn/UI component library
  - Consistent design system
  - Composable components

- **Key Components:**
  - `TitleBar` - Custom Tauri window title bar
  - `VerticalIconBar` - Left navigation sidebar
  - `SlideOutPanel` - Right slide-out panels
  - `DataTable` - Enhanced data display table
  - `SqlEditor` - CodeMirror SQL editor
  - `BridgeLoader` - Loading state for Tauri bridge
  - `ChartVisualization` - Chart display with config
  - `ChartRenderer` - Recharts-based chart rendering
  - `TableNode` - ReactFlow table node for diagrams

- **Page Components:**
  - `Index` - Dashboard with database cards
  - `DatabaseDetails` - Split-panel database view
  - `SQLWorkspace` - VS Code-style SQL editor
  - `QueryBuilder` - Visual query builder
  - `SchemaExplorer` - Schema tree view
  - `ERDiagram` - Entity relationship diagram
  - `Settings` - Theme and preferences

### Code Organization
- **Feature-Based Structure**
  - Organized by feature/page
  - Shared components library
  - Custom hooks
  - Service layer abstraction

---

## 🎨 Styling & Design

### Design System
- **Consistent UI**
  - Standardized spacing
  - Consistent typography
  - Color palette system
  - Component variants

### Animation & Transitions
- **Smooth Interactions**
  - Fade transitions
  - Slide animations
  - Loading spinners
  - Skeleton screens
  - Hover effects

### Icons
- **Lucide React Icons**
  - Comprehensive icon set
  - Consistent styling
  - Accessible icons
  - Semantic usage

---

## 🔐 State Management

### Local State
- **React Hooks**
  - useState for component state
  - useEffect for side effects
  - Custom hooks for reusability

### Server State
- **React Query**
  - Automatic caching
  - Background updates
  - Optimistic updates
  - Error retry logic

### Persistent State
- **LocalStorage**
  - User preferences
  - Theme settings
  - Query history
  - Session data

---

## 📱 Cross-Platform Support

### Tauri Desktop App
- **Native Integration**
  - **Custom Title Bar** - Minimalist draggable title bar with window controls (32px height)
  - Desktop window controls (minimize, maximize, close)
  - File system access
  - Native notifications
  - System tray support

- **Layout Considerations**
  - All pages use `h-[calc(100vh-32px)]` to account for title bar
  - Fixed elements positioned with `top-8` (32px offset)
  - Proper z-index layering (title bar: z-[100], panels: z-50, sidebar: z-40)

### Web Technologies
- **Modern Web Stack**
  - React 18
  - Vite for bundling
  - TypeScript
  - CSS variables for theming

---

## 🌟 Advanced Features

### Query Builder Innovations
- **Visual Query Design**
  - Drag-and-drop interface
  - Real-time SQL preview
  - Multi-table joins
  - Query history tracking

### Migration Management
- **Schema Versioning**
  - Local migration storage
  - Applied migration tracking
  - Rollback capabilities
  - Baseline support
  - Auto-apply on creation

### Real-Time Updates
- **Live Data**
  - Streaming query results
  - Progress tracking
  - Cancellable operations
  - Event-driven updates

---

## 🎁 Additional Capabilities

### Export Features
- **Multiple Formats**
  - CSV export
  - JSON export
  - Bulk table export
  - Single table export

### Connection Management
- **Database Support**
  - PostgreSQL
  - MySQL
  - SQLite
  - And potentially others
- **SSL/TLS Support**
  - Secure connections
  - SSL mode configuration
  - Certificate handling
  - **Cloud Database Support (NEW)** - Self-signed certificate handling for Supabase, Railway, Neon, etc.

### Error Handling
- **Graceful Degradation**
  - User-friendly error messages
  - Retry mechanisms
  - Error boundaries
  - Fallback UI states

---

**Total Frontend Features:** 200+

**Last Updated:** January 2026

This document is a living reference and will be updated as new features are added to the application.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── chart/
│   │   ├── ChartConfigPanel.tsx    # Chart configuration UI
│   │   ├── ChartRenderer.tsx       # Recharts rendering component
│   │   └── ChartVisualization.tsx  # Main chart container
│   ├── common/
│   │   ├── DataTable.tsx           # Enhanced data table
│   │   ├── Header.tsx              # Page headers
│   │   ├── ModeToggle.tsx          # Theme toggle
│   │   ├── SlideOutPanel.tsx       # Right slide-out panels
│   │   ├── ThemeProvider.tsx       # Theme context
│   │   ├── TitleBar.tsx            # Tauri title bar
│   │   └── VerticalIconBar.tsx     # Left navigation
│   ├── dashboard/                   # Dashboard components
│   ├── database/
│   │   ├── ContentViewerPanel.tsx  # Data display panel
│   │   ├── DataTab.tsx             # Data browsing tab
│   │   ├── SqlEditor.tsx           # CodeMirror editor
│   │   ├── TablesExplorerPanel.tsx # Table list panel
│   │   └── ...
│   ├── er-diagram/                  # ER diagram components
│   ├── feedback/
│   │   └── BridgeLoader.tsx        # Loading states
│   ├── query-builder/              # Query builder components (legacy)
│   ├── schema-explorer/            # Schema explorer components
│   └── ui/                         # shadcn/ui components
├── hooks/
│   ├── useBridgeInit.ts            # Tauri bridge initialization
│   ├── useBridgeQuery.ts           # Bridge query hook
│   ├── useDatabaseDetails.ts       # Database details logic
│   ├── useDbQueries.ts             # React Query hooks
│   ├── useExport.ts                # Export functionality
│   └── useQueryHistory.ts          # Query history management
├── pages/
│   ├── DatabaseDetails.tsx         # Database detail page
│   ├── ERDiagram.tsx               # ER diagram page
│   ├── Index.tsx                   # Dashboard page
│   ├── QueryBuilder.tsx            # Visual query builder
│   ├── SchemaExplorer.tsx          # Schema explorer page
│   ├── Settings.tsx                # Settings page
│   └── SQLWorkspace.tsx            # SQL workspace page
├── services/
│   ├── bridgeApi.ts                # Tauri API wrapper
│   └── bridgeClient.ts             # Bridge client
├── types/
│   ├── database.ts                 # Database types
│   └── schema.ts                   # Schema types
└── lib/
    ├── utils.ts                    # Utility functions
    └── dataExport.ts               # Export utilities

bridge/                             # Node.js backend (database connectors)
src-tauri/                          # Tauri Rust backend
```

---

## 🎯 Design Principles

1. **Minimalistic UI** - Clean, uncluttered interfaces with subtle borders and muted colors
2. **VS Code Inspiration** - Familiar IDE-like layout with sidebars, panels, and status bars
3. **Theme Consistency** - Single primary color throughout, using CSS variables
4. **Responsive Layout** - Proper height calculations to fit content without scrollbars
5. **Progressive Disclosure** - Collapsible sections to reduce cognitive load
6. **Immediate Feedback** - Loading states, progress indicators, and toast notifications
7. **Keyboard Friendly** - Shortcuts for common actions (Ctrl+Enter to execute)
8. **Error Resilience** - Graceful error handling with retry options
