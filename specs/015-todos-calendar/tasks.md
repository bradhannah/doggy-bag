# Implementation Tasks: Todos & Calendar View

**Feature Branch**: `015-todos-calendar`  
**Created**: 2026-02-01  
**Plan**: [.opencode/plans/015-todos-calendar.md](../../.opencode/plans/015-todos-calendar.md)  
**Spec**: [spec.md](./spec.md)

## Task Overview

| Phase     | Priority | Tasks  | Est. Time   |
| --------- | -------- | ------ | ----------- |
| 1         | P1       | 6      | 3.75 hrs    |
| 2         | P1       | 3      | 1.5 hrs     |
| 3         | P1       | 3      | 2.75 hrs    |
| 4         | P1       | 4      | 2.6 hrs     |
| 5         | P2       | 2      | 1.25 hrs    |
| 6         | P2       | 2      | 1.5 hrs     |
| 7         | P2       | 7      | 4.25 hrs    |
| 8         | P2       | 1      | 0.3 hrs     |
| 9         | All      | 2      | 3 hrs       |
| **Total** |          | **30** | **~21 hrs** |

---

## Phase 1: Todo Backend Foundation (P1)

### Task 1.1: Define Todo Types

- [ ] **File**: `api/src/types/index.ts`
- [ ] Add `TodoStatus` type: `'pending' | 'completed'`
- [ ] Add `TodoRecurrence` type: `'none' | 'weekly' | 'bi_weekly' | 'monthly'`
- [ ] Add `Todo` interface with required `due_date`
- [ ] Add `TodoInstance` interface
- [ ] Export new types
- **Est**: 15 min

### Task 1.2: Create Todo Service

- [ ] **File**: `api/src/services/todos-service.ts`
- [ ] Create `TodosService` interface
- [ ] Implement `TodosServiceImpl` class
- [ ] Implement `getAll()` method
- [ ] Implement `getById(id)` method
- [ ] Implement `create(data)` method
- [ ] Implement `update(id, updates)` method
- [ ] Implement `delete(id)` method
- [ ] Implement `validate(data)` method
- [ ] Implement `complete(id)` method
- [ ] Implement `reopen(id)` method
- [ ] Storage path: `data/entities/todos.json`
- **Est**: 45 min

### Task 1.3: Create Todo Instance Service

- [ ] **File**: `api/src/services/todo-instances-service.ts`
- [ ] Create `TodoInstancesService` interface
- [ ] Implement `TodoInstancesServiceImpl` class
- [ ] Implement `generateInstancesForMonth(month)` method
- [ ] Implement `getForMonth(month)` method
- [ ] Implement `complete(instanceId)` method
- [ ] Implement `reopen(instanceId)` method
- [ ] Implement `createAdhoc(data)` method
- [ ] Storage: Add to `data/months/{YYYY-MM}.json` (MonthlyData)
- **Est**: 60 min

### Task 1.4: Create Todo API Handlers

- [ ] **File**: `api/src/routes/handlers/todos.handlers.ts`
- [ ] Create `createTodosHandlerGET()` - List all todos
- [ ] Create `createTodosHandlerPOST()` - Create todo
- [ ] Create `createTodosHandlerPUT()` - Update todo
- [ ] Create `createTodosHandlerDELETE()` - Delete todo
- [ ] Create `createTodosCompleteHandler()` - Complete todo
- [ ] Create `createTodosReopenHandler()` - Reopen todo
- [ ] **File**: `api/src/routes/handlers/todo-instances.handlers.ts`
- [ ] Create handlers for month-scoped todo instances
- **Est**: 60 min

### Task 1.5: Register Routes

- [ ] **File**: `api/src/routes/index.ts`
- [ ] Add `GET /api/todos` route
- [ ] Add `POST /api/todos` route
- [ ] Add `PUT /api/todos/:id` route
- [ ] Add `DELETE /api/todos/:id` route
- [ ] Add `POST /api/todos/:id/complete` route
- [ ] Add `POST /api/todos/:id/reopen` route
- [ ] Add `GET /api/months/:month/todos` route
- [ ] Add `POST /api/months/:month/todos` route
- [ ] Add `PUT /api/months/:month/todos/:id` route
- [ ] Add `DELETE /api/months/:month/todos/:id` route
- [ ] Add `POST /api/months/:month/todos/:id/complete` route
- [ ] Add `POST /api/months/:month/todos/:id/reopen` route
- **Est**: 15 min

### Task 1.6: Integrate with MonthlyData

- [ ] **File**: `api/src/types/index.ts`
- [ ] Add `todo_instances` field to `MonthlyData` interface
- [ ] **File**: `api/src/services/months-service.ts`
- [ ] Modify `generateMonthlyData()` to generate todo instances
- [ ] Call `todoInstancesService.generateInstancesForMonth()`
- **Est**: 30 min

---

## Phase 2: Todo Frontend Foundation (P1)

### Task 2.1: Create Todos Store

- [ ] **File**: `src/stores/todos.ts`
- [ ] Define `Todo` and `TodoData` types
- [ ] Create `TodosState` type
- [ ] Create internal writable store
- [ ] Create derived stores: `todos`, `todosLoading`, `todosError`
- [ ] Create derived stores: `activeTodos`, `completedTodos`, `pendingTodos`
- [ ] Implement `loadTodos()` action
- [ ] Implement `createTodo(data)` action
- [ ] Implement `updateTodo(id, updates)` action
- [ ] Implement `deleteTodo(id)` action
- [ ] Implement `completeTodo(id)` action
- [ ] Implement `reopenTodo(id)` action
- **Est**: 45 min

### Task 2.2: Create Todo Instances Store

- [ ] **File**: `src/stores/todo-instances.ts`
- [ ] Define `TodoInstance` type
- [ ] Create state and derived stores
- [ ] Create `pendingInstances` derived store (sorted by due date)
- [ ] Create `completedInstances` derived store
- [ ] Create `overdueInstances` derived store
- [ ] Implement `loadForMonth(month)` action
- [ ] Implement `completeInstance(id)` action
- [ ] Implement `reopenInstance(id)` action
- [ ] Implement `createAdhocInstance(data)` action
- **Est**: 30 min

### Task 2.3: Add Navigation Items

- [ ] **File**: `src/components/Navigation.svelte`
- [ ] Add "Todos" nav item after "Budget" with checklist icon
- [ ] Add `isTodosActive` reactive variable
- [ ] Add "Calendar" nav item after "Projections" with calendar icon
- [ ] Add `isCalendarActive` reactive variable
- **Est**: 20 min

---

## Phase 3: Todo Primary View (P1)

### Task 3.1: Create Todos Route

- [ ] **File**: `src/routes/todos/+page.svelte`
- [ ] Create page component
- [ ] Import and use `TodosView` component
- [ ] **File**: `src/components/Todos/TodosView.svelte`
- [ ] Add MonthPickerHeader for navigation
- [ ] Add "+ Add Todo" button
- [ ] Show PENDING section with pending todos
- [ ] Show COMPLETED section with completed todos
- [ ] Order by due date (earliest first)
- [ ] Load todo instances on mount
- **Est**: 90 min

### Task 3.2: Create TodoItem Component

- [ ] **File**: `src/components/Todos/TodoItem.svelte`
- [ ] Props: `todo`, `onComplete`, `onReopen`
- [ ] Checkbox on left (clickable)
- [ ] Title text
- [ ] Notes below title (muted/smaller, `var(--text-tertiary)`)
- [ ] Due date on right
- [ ] Completion date for completed items
- [ ] Grayed out styling for completed (`var(--text-tertiary)`)
- [ ] Red highlighting for overdue (`var(--error)`)
- **Est**: 45 min

### Task 3.3: Create QuickAddTodo Component

- [ ] **File**: `src/components/Todos/QuickAddTodo.svelte`
- [ ] Simple inline form
- [ ] Title input field
- [ ] Due date picker
- [ ] Quick submit (Enter or button)
- [ ] Opens full modal for more options
- **Est**: 30 min

---

## Phase 4: Todo Management (P1)

### Task 4.1: Add Todos Tab to Setup Page

- [ ] **File**: `src/components/Setup/SetupPage.svelte`
- [ ] Add `'todos'` to `TabId` type
- [ ] Add "Todos" tab to tab list
- [ ] Import `TodosList`, `TodoForm`, `TodoView` components
- [ ] Add state for `viewingTodo`, `editingTodo`
- [ ] Handle tab content rendering for todos
- **Est**: 20 min

### Task 4.2: Create TodosList Component

- [ ] **File**: `src/components/Setup/TodosList.svelte`
- [ ] Props: `onEdit`, `onView`, `onDelete`
- [ ] List all todo definitions
- [ ] Show recurrence type (One-time, Weekly, etc.)
- [ ] Show due date or pattern
- [ ] Edit button per row
- [ ] Delete button per row
- [ ] "+ Add" button in header
- **Est**: 45 min

### Task 4.3: Create TodoForm Component (Modal)

- [ ] **File**: `src/components/Setup/TodoForm.svelte`
- [ ] Use `Modal` component (not Drawer)
- [ ] Props: `editingTodo`, `onSave`, `onClose`
- [ ] Title field (required)
- [ ] Notes field (optional, textarea)
- [ ] Due Date field (required, date picker)
- [ ] Recurrence select (None, Weekly, Bi-weekly, Monthly)
- [ ] Start Date field (shown if recurrence != None)
- [ ] Day of Month field (shown if monthly)
- [ ] Validation before save
- [ ] Cancel and Save buttons
- **Est**: 60 min

### Task 4.4: Create TodoView Component (Modal)

- [ ] **File**: `src/components/Setup/TodoView.svelte`
- [ ] Use `Modal` component
- [ ] Props: `todo`, `onClose`, `onEdit`
- [ ] Display all todo details read-only
- [ ] Edit button to switch to form
- **Est**: 30 min

---

## Phase 5: Recurring Todos (P2)

### Task 5.1: Create Todo Occurrence Generator

- [ ] **File**: `api/src/utils/todo-occurrences.ts`
- [ ] Implement `generateTodoOccurrences(todo, month)` function
- [ ] Reuse patterns from `api/src/utils/occurrences.ts`
- [ ] Handle `weekly` recurrence
- [ ] Handle `bi_weekly` recurrence
- [ ] Handle `monthly` recurrence
- [ ] Return array of `TodoInstance` objects
- **Est**: 45 min

### Task 5.2: Integrate with Month Generation

- [ ] **File**: `api/src/services/months-service.ts`
- [ ] Import todo occurrence generator
- [ ] Call generator in `generateMonthlyData()` for each active recurring todo
- [ ] Merge generated instances with existing persisted instances
- [ ] Preserve completed status of existing instances
- **Est**: 30 min

---

## Phase 6: Calendar Backend (P2) ✅

### Task 6.1: Create Calendar Service

- [x] **File**: `api/src/services/calendar-service.ts`
- [x] Define `CalendarEvent` interface
- [x] Define `CalendarData` interface (CalendarResponse)
- [x] Create `CalendarService` interface
- [x] Implement `CalendarServiceImpl` class
- [x] Implement `getEventsForMonth(month)` method:
  - [x] Get bill occurrences from MonthlyData
  - [x] Get income occurrences from MonthlyData
  - [x] Get savings goal contributions (bills with `goal_id`)
  - [x] Get todo instances
  - [x] Map each to `CalendarEvent` with type field
  - [x] Return `CalendarResponse` with all events
- **Est**: 60 min

### Task 6.2: Create Calendar API Handler

- [x] **File**: `api/src/routes/handlers/calendar.handlers.ts`
- [x] Create `createCalendarHandlerGET()` function
- [x] Parse month from path parameter
- [x] Call `calendarService.getEventsForMonth(month)`
- [x] Return JSON response
- [x] **File**: `api/src/routes/index.ts`
- [x] Add `GET /api/calendar/:month` route
- **Est**: 30 min

---

## Phase 7: Calendar Frontend (P2) ✅

### Task 7.1: Create Calendar Store

- [x] **File**: `src/stores/calendar.ts`
- [x] Define `CalendarEvent` type
- [x] Create state: `{ events, loading, error }`
- [x] Create derived stores
- [x] Implement `loadCalendarMonth(month)` action
- **Est**: 30 min

### Task 7.2: Create Calendar Route

- [x] **File**: `src/routes/calendar/+page.svelte`
- [x] Create page component
- [x] Import `CalendarView` component
- [x] Pass current month
- **Est**: 20 min

### Task 7.3: Add Calendar Navigation Item

- Combined with Task 2.3
- **Est**: 0 min (included above)

### Task 7.4: Create CalendarView Component

- [x] **File**: `src/components/Calendar/CalendarView.svelte`
- [x] Wrapper with padding (`var(--section-gap)`)
- [x] MonthPickerHeader at top
- [x] CalendarGrid component
- [x] CalendarLegend at bottom
- [x] Load calendar data on mount and month change
- **Est**: 45 min

### Task 7.5: Create CalendarGrid Component

- [x] **File**: `src/components/Calendar/CalendarGrid.svelte`
- [x] Props: `events`, `month`
- [x] 7-column grid layout (Mon-Sun)
- [x] Day header row
- [x] Calculate weeks in month
- [x] Render CalendarDay for each day
- [x] Pass filtered events to each day
- **Est**: 60 min

### Task 7.6: Create CalendarDay Component

- [x] **File**: `src/components/Calendar/CalendarDay.svelte`
- [x] Props: `date`, `events`, `isCurrentMonth`
- [x] Day number display
- [x] List CalendarEventItem for each event
- [x] Max 3 visible items
- [x] "+N more" overflow indicator
- [x] Dim days outside current month
- [x] Highlight today
- [x] Red highlight for overdue items
- **Est**: 45 min

### Task 7.7: Create CalendarLegend Component

- [x] **File**: `src/components/Calendar/CalendarLegend.svelte`
- [x] Color indicators with labels:
  - [x] Bills: `var(--error)` (red)
  - [x] Income: `var(--success)` (green)
  - [x] Goals: `var(--accent)` (cyan)
  - [x] Todos: `var(--purple)` (purple)
- [x] Horizontal layout
- **Est**: 20 min

### Task 7.8: Create CalendarEventItem Component

- [x] **File**: `src/components/Calendar/CalendarEventItem.svelte`
- [x] Props: `event`, `onClick`
- [x] Color indicator based on type
- [x] Truncated title text
- [x] Clickable (button or link)
- [x] Red override for overdue
- **Est**: 30 min

---

## Phase 8: Calendar Navigation (P2) ✅

### Task 8.1: Implement Navigation Logic

- [x] **File**: `src/components/Calendar/CalendarEventItem.svelte`
- [x] Import `goto` from `$app/navigation`
- [x] onClick handler based on event type:
  - [x] `bill` or `income`: Navigate to `/month/{month}`
  - [x] `goal`: Navigate to `/savings`
  - [x] `todo`: Navigate to `/todos`
- [x] Added keyboard support (Enter/Space)
- [x] Added focus-visible styling for accessibility
- [x] Changed from `<div>` to `<button>` for proper semantics
- **Est**: 20 min

---

## Phase 9: Testing (All Phases) - CALENDAR TESTS COMPLETE ✅

### Task 9.1: Backend Tests

- [ ] **File**: `api/src/services/todos-service.test.ts`
  - [ ] Test CRUD operations
  - [ ] Test validation
  - [ ] Test complete/reopen
- [ ] **File**: `api/src/services/todo-instances-service.test.ts`
  - [ ] Test instance generation
  - [ ] Test complete/reopen instance
  - [ ] Test adhoc creation
- [x] **File**: `api/src/services/calendar-service.test.ts` (19 tests)
  - [x] Test event aggregation
  - [x] Test all event types included
  - [x] Test overdue detection
  - [x] Test event IDs and source IDs
- [ ] **File**: `api/src/utils/todo-occurrences.test.ts`
  - [ ] Test weekly generation
  - [ ] Test bi-weekly generation
  - [ ] Test monthly generation
- [ ] **File**: `api/src/routes/handlers/todos.handlers.test.ts`
  - [ ] Test all endpoints
- [x] **File**: `api/src/routes/handlers/calendar.handlers.test.ts` (13 tests)
  - [x] Test GET /api/calendar/:month
  - [x] Test GET /api/calendar/:month/:date
  - [x] Test error handling
- **Est**: 120 min

### Task 9.2: Frontend Tests

- [ ] **File**: `src/stores/todos.test.ts`
  - [ ] Test CRUD actions
  - [ ] Test derived stores
- [ ] **File**: `src/stores/todo-instances.test.ts`
  - [ ] Test load and actions
  - [ ] Test derived stores (overdue, etc.)
- [x] **File**: `src/stores/calendar.test.ts` (30 tests)
  - [x] Test loadCalendarMonth action
  - [x] Test derived stores (billEvents, incomeEvents, etc.)
  - [x] Test utility functions
  - [x] Test resetCalendarStore
- **Est**: 60 min

---

## File Creation Summary

### Backend - New Files (13)

- [ ] `api/src/services/todos-service.ts`
- [ ] `api/src/services/todos-service.test.ts`
- [ ] `api/src/services/todo-instances-service.ts`
- [ ] `api/src/services/todo-instances-service.test.ts`
- [ ] `api/src/services/calendar-service.ts`
- [ ] `api/src/services/calendar-service.test.ts`
- [ ] `api/src/routes/handlers/todos.handlers.ts`
- [ ] `api/src/routes/handlers/todos.handlers.test.ts`
- [ ] `api/src/routes/handlers/todo-instances.handlers.ts`
- [ ] `api/src/routes/handlers/calendar.handlers.ts`
- [ ] `api/src/routes/handlers/calendar.handlers.test.ts`
- [ ] `api/src/utils/todo-occurrences.ts`
- [ ] `api/src/utils/todo-occurrences.test.ts`

### Backend - Modified Files (3)

- [ ] `api/src/types/index.ts`
- [ ] `api/src/routes/index.ts`
- [ ] `api/src/services/months-service.ts`

### Frontend - New Files (16)

- [ ] `src/stores/todos.ts`
- [ ] `src/stores/todos.test.ts`
- [ ] `src/stores/todo-instances.ts`
- [ ] `src/stores/todo-instances.test.ts`
- [ ] `src/stores/calendar.ts`
- [ ] `src/stores/calendar.test.ts`
- [ ] `src/routes/todos/+page.svelte`
- [ ] `src/routes/calendar/+page.svelte`
- [ ] `src/components/Todos/TodosView.svelte`
- [ ] `src/components/Todos/TodoItem.svelte`
- [ ] `src/components/Todos/QuickAddTodo.svelte`
- [ ] `src/components/Setup/TodosList.svelte`
- [ ] `src/components/Setup/TodoForm.svelte`
- [ ] `src/components/Setup/TodoView.svelte`
- [ ] `src/components/Calendar/CalendarView.svelte`
- [ ] `src/components/Calendar/CalendarGrid.svelte`
- [ ] `src/components/Calendar/CalendarDay.svelte`
- [ ] `src/components/Calendar/CalendarLegend.svelte`
- [ ] `src/components/Calendar/CalendarEventItem.svelte`

### Frontend - Modified Files (2)

- [ ] `src/components/Navigation.svelte`
- [ ] `src/components/Setup/SetupPage.svelte`

---

## Implementation Order

**Recommended order for development:**

1. **Phase 1** (Backend) - Foundation must be in place first
2. **Phase 2** (Frontend stores) - Needed before UI
3. **Phase 3** (Todo view) - Core user-facing feature
4. **Phase 4** (Manage tab) - Complete CRUD UI
5. **Phase 5** (Recurring) - Enhanced functionality
6. **Phase 6** (Calendar backend) - Foundation for calendar
7. **Phase 7** (Calendar frontend) - Calendar UI
8. **Phase 8** (Navigation) - Polish
9. **Phase 9** (Testing) - Throughout, but final validation

**Milestones:**

- After Phase 4: Todo MVP complete, can be demoed
- After Phase 7: Full feature complete
- After Phase 9: Production ready
