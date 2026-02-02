# Feature Specification: Todos & Calendar View

**Feature Branch**: `015-todos-calendar`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: User description: "Introduce a Todo system with scheduling, optional notes, due dates, completion tracking, and optional recurring patterns. Add a Calendar view in classical Monday-Sunday format displaying all bills, incomes, savings goals, and todos with color-coded items and navigation to their source."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Complete a Todo (Priority: P1)

As a user, I want to create a todo item with a title, optional notes, and due date so that I can track manual tasks like paying a bill or transferring money.

**Why this priority**: Core functionality - without the ability to create and complete todos, no other todo features work. This is the foundation of the Todo system.

**Independent Test**: Can be fully tested by creating a todo, viewing it in the list, checking it off, and verifying it moves to the bottom grayed out. Delivers immediate value for task tracking.

**Acceptance Scenarios**:

1. **Given** I am on the Todos view, **When** I click "Add Todo" and enter a title, notes, and due date and save, **Then** the todo appears in the list ordered by due date
2. **Given** I have an uncompleted todo in my list, **When** I click the checkbox next to it, **Then** the todo is marked complete, grays out, and moves to the bottom of the list
3. **Given** I have a completed todo, **When** I view the Todos list, **Then** I see the completion date instead of the due date

---

### User Story 2 - View Todos List (Priority: P1)

As a user, I want to see all my todos in a list format, ordered by due date, with completed items visually distinguished and moved to the bottom.

**Why this priority**: Essential companion to Story 1 - the list view is where users interact with todos daily.

**Independent Test**: Can be tested by navigating to Todos view and verifying the list displays with proper ordering and visual styling.

**Acceptance Scenarios**:

1. **Given** I have multiple todos with different due dates, **When** I view the Todos list, **Then** todos are ordered by due date (earliest first), with completed items at the bottom
2. **Given** a todo has optional notes, **When** I view the todo in the list, **Then** the notes appear below the title in a smaller, muted style
3. **Given** I navigate to the Todos view, **When** the page loads, **Then** I see a month picker allowing me to filter todos by month

---

### User Story 3 - Manage Todos (Add/Edit/Delete) (Priority: P1)

As a user, I want to manage my todos through the Manage section so I can add new todos, edit existing ones, and delete completed or obsolete todos.

**Why this priority**: Critical for the complete CRUD lifecycle of todos.

**Independent Test**: Can be tested by navigating to Manage > Todos, adding a todo, editing it, and deleting it.

**Acceptance Scenarios**:

1. **Given** I am in Manage > Todos, **When** I click "Add Todo", **Then** a modal opens with fields for title, notes, due date, and recurrence options
2. **Given** I have an existing todo, **When** I click edit, **Then** a modal opens pre-filled with the todo's current values
3. **Given** I have a todo, **When** I click delete and confirm, **Then** the todo is removed from the system

---

### User Story 4 - Create Recurring Todos (Priority: P2)

As a user, I want to create recurring todos (weekly, monthly) so that routine tasks like "weekly budget review" automatically generate instances.

**Why this priority**: Enhances productivity but not essential for MVP. Users can manage with one-time todos initially.

**Independent Test**: Can be tested by creating a recurring weekly todo and verifying instances appear in subsequent weeks.

**Acceptance Scenarios**:

1. **Given** I am adding a new todo, **When** I select a recurrence pattern (weekly, bi-weekly, monthly), **Then** the system generates todo instances for each occurrence
2. **Given** I have a recurring todo, **When** I complete one instance, **Then** only that instance is marked complete; future instances remain pending
3. **Given** I have a recurring todo, **When** I edit the recurring definition, **Then** future instances reflect the changes

---

### User Story 5 - View Calendar (Priority: P2)

As a user, I want to see a monthly calendar showing all my bills, incomes, savings goals, and todos so I can visualize my financial schedule at a glance.

**Why this priority**: High value for visibility but independent of the Todo system. Provides a unified view of all financial events.

**Independent Test**: Can be tested by navigating to Calendar view with existing bills/incomes and verifying they appear on correct dates.

**Acceptance Scenarios**:

1. **Given** I have bills, incomes, and todos with due dates, **When** I view the Calendar, **Then** each item appears on its respective date with a color-coded indicator
2. **Given** I am viewing the Calendar, **When** I use the month picker, **Then** the calendar updates to show items for the selected month
3. **Given** the calendar is displayed, **When** I look at the bottom of the view, **Then** I see a legend explaining the color codes

---

### User Story 6 - Navigate from Calendar to Source (Priority: P2)

As a user, I want to click on calendar items to navigate to their source (Budget, Savings, or Todos view) so I can quickly access details.

**Why this priority**: Enhances usability of the Calendar feature.

**Independent Test**: Can be tested by clicking a bill on the calendar and verifying navigation to Budget view.

**Acceptance Scenarios**:

1. **Given** I see a bill on the calendar, **When** I click it, **Then** I am navigated to the Budget view for that month
2. **Given** I see a savings goal contribution on the calendar, **When** I click it, **Then** I am navigated to the Savings view
3. **Given** I see a todo on the calendar, **When** I click it, **Then** I am navigated to the Todos view for that month

---

### Edge Cases

- What happens when a recurring todo is deleted? All future instances should be removed; past completed instances remain in history.
- What happens when a day has many items? The calendar cell should show the first 2-3 items with a "+N more" indicator.
- How does the calendar handle items spanning multiple days? Each item appears only on its due/expected date.
- What happens when a todo is completed then unchecked? It moves back to the active section, sorted by due date.
- What happens when a todo is overdue? It should be highlighted in red in both the Todos list and Calendar view.

## Requirements _(mandatory)_

### Functional Requirements - Todo System

- **FR-001**: System MUST provide a "Todos" navigation item in the sidebar, positioned after "Budget"
- **FR-002**: System MUST display todos in a list format with checkbox, title, optional notes, and due date
- **FR-003**: Users MUST be able to create a todo with title (required), notes (optional), and due date (required)
- **FR-004**: Users MUST be able to mark a todo as complete by clicking its checkbox
- **FR-005**: System MUST move completed todos to the bottom of the list with grayed-out styling
- **FR-006**: System MUST show completion date for completed todos instead of due date
- **FR-007**: System MUST persist todos across sessions
- **FR-008**: Users MUST be able to edit and delete todos via the Manage > Todos section
- **FR-009**: System MUST use modals (not drawers) for add/edit todo forms in Manage section
- **FR-010**: Users MUST be able to optionally set recurrence (weekly, bi-weekly, monthly) on todos
- **FR-011**: System MUST auto-generate instances for recurring todos similar to bills
- **FR-012**: System MUST allow filtering todos by month using month picker
- **FR-013**: System MUST highlight overdue todos in red (using error color variable)

### Functional Requirements - Calendar View

- **FR-014**: System MUST provide a "Calendar" navigation item in the sidebar, positioned after "Projections"
- **FR-015**: System MUST display a calendar widget that occupies most of the view with padding around edges
- **FR-016**: Calendar MUST use classical Monday-Sunday layout
- **FR-017**: Calendar MUST display bills, incomes, savings goal contributions, and todos on their respective dates
- **FR-018**: Calendar MUST use semantic colors: Bills (red/error), Incomes (green/success), Goals (cyan/accent), Todos (purple)
- **FR-019**: Calendar MUST include a legend at the bottom explaining color codes
- **FR-020**: Calendar items MUST be clickable and navigate to their respective source view
- **FR-021**: Calendar MUST use the existing month picker pattern for navigation
- **FR-022**: Calendar MUST show overdue items highlighted in red

### Key Entities

- **Todo**: A manually-created task with title, optional notes, due date (required), status (pending/completed), completion date, and optional recurrence pattern. Does not link to bills or other entities.
- **TodoInstance**: For recurring todos, each generated occurrence with its own due date and completion status.
- **CalendarEvent**: A derived/virtual entity combining bills, incomes, savings goals, and todos for display on the calendar. Not persisted separately.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a todo in under 30 seconds
- **SC-002**: Users can mark a todo complete with a single click
- **SC-003**: The Calendar view loads and displays all items for a month within 2 seconds
- **SC-004**: Users can navigate from any calendar item to its source in under 2 seconds
- **SC-005**: 100% of existing bills, incomes, and savings goal contributions appear correctly on their due dates in the calendar
- **SC-006**: Completed todos remain visible but visually distinguished, reducing user confusion about task status
- **SC-007**: Overdue todos are immediately identifiable through red highlighting

## Assumptions

- Todos require a due date (not optional) to simplify month filtering
- The calendar displays items based on their due/expected dates only (no date range spanning)
- Recurring todos follow the same billing period patterns as bills (weekly, bi-weekly, monthly)
- The Todo view uses the same month navigation pattern as the Budget view
- Overdue todos are highlighted in red (error color) in both the Todos list and Calendar
