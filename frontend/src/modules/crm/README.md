# CRM Module

The CRM module is the internal DPM workspace for managing travel requests and operational workflows.

## Responsibility

- Separate leisure, luxury, and corporate request processing.
- Manage briefing, qualification, trip design, quote linkage, proposal, booking, payment, reminders, and travel pack delivery.
- Give managers command-center visibility into status, ownership, bottlenecks, and workflow progress.
- Keep Django as the source of truth for CRM data.

## Current Implementation

CRM UI currently lives mainly in `frontend/src/pages/CrmPage.tsx`, with data/API helpers under `frontend/src/data/`.

The briefing gate has been extracted to `frontend/src/modules/crm/briefing/`.

The Tasks, Calendar, and Reports surfaces have been partially extracted:

- `frontend/src/modules/crm/myday/` — the My Day landing view (default CRM nav), fed by `GET /api/my-day/`; items deep-link into the linked lead's workspace.
- `frontend/src/modules/crm/tasks/` — the full-width Tasks queue (`TasksQueue`: Mine/Team/Unassigned + Today/Overdue/Upcoming/Waiting, assign + status transitions), task queue logic (`leadTasks`, `taskQueueCount`), workflow-reminder generation availability, and the surface header copy.
- `frontend/src/modules/crm/calendar/` — travel-date filtering and calendar count logic, plus the surface header copy.
- `frontend/src/modules/crm/reports/` — the leads CSV export and the surface header copy.
- `frontend/src/modules/crm/shared/` — helpers and components shared by the extracted surfaces (date/csv/initials formatting, lead metadata such as `leadOwner`, `processForLead`, `fallbackPriority`, and the `RequestQueueCard` / `RequestStatusReport` components rendered for the Tasks, Calendar, and Reports navs).

The shared list chrome (metric cards, filters, pagination) and the request detail pane used by these surfaces still live in `CrmPage.tsx` because they are deeply coupled to the page-wide state and to the other CRM workspaces.

Future cleanup should split the CRM into smaller components and feature folders such as:

- `command-center/`
- `briefing/`
- `leisure-studio/`
- `corporate-desk/`
- `trip-design/`
- `quotes/`
- `payments/`
- `workflow-reminders/`

## Key Flows

- New request intake.
- Briefing and client validation.
- Approval for Trip Design.
- Quote and proposal preparation.
- Booking, payment, and travel pack control.
