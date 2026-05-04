# CRM Module

The CRM module is the internal DPM workspace for managing travel requests and operational workflows.

## Responsibility

- Separate leisure, luxury, and corporate request processing.
- Manage briefing, qualification, trip design, quote linkage, proposal, booking, payment, reminders, and travel pack delivery.
- Give managers command-center visibility into status, ownership, bottlenecks, and workflow progress.
- Keep Django as the source of truth for CRM data.

## Current Implementation

CRM UI currently lives mainly in the existing `src/pages/CrmPage.tsx` file, with data/API helpers under `src/data/`.

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
