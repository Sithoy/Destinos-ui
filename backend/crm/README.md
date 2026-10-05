# CRM Backend App

The CRM app supports DPM's internal travel operations workflow.

## Responsibility

- Public lead intake from the landing page.
- CRM lead lifecycle and workflow stages.
- Client records and lead-to-client conversion.
- Quote, quote line, approval, and margin data.
- Payment records and payment readiness.
- Communication records for proposals, payment requests, travel packs, and follow-ups.
- Trip itinerary structures for stops, accommodation, transport, and experiences.
- Workflow checklist gates, blockers, reminders, and automation rules.
- CRM role and permission behavior for staff users.

## Main Files

- `models.py` - CRM data model and persistence rules.
- `serializers.py` - DRF request/response shaping and validation.
- `views.py` - API endpoints and viewsets.
- `workflow.py` - workflow gate/checklist logic.
- `workflow_automation.py` - reminder and workflow automation helpers.
- `tests.py` - CRM backend tests.
- `admin.py` - Django admin configuration.

## Current Process Flow

CRM requests should move through a controlled value chain:

1. New request
2. Briefing / pending information
3. Validated for trip design
4. Quote in progress
5. Quote sent
6. Awaiting approval
7. Approved
8. Payment / finance
9. Booking in progress
10. Confirmed
11. Travel pack sent
12. In travel
13. Completed or closed

## Development Rules

- Keep CRM and CTM changes separate unless explicitly requested.
- Use Django migrations for schema changes.
- Add or update tests when workflow gates, serializers, or models change.
- Keep business rules in backend workflow logic where the frontend should not be the source of truth.
- Preserve existing API behavior unless the task explicitly changes it.

## Ownership and Permissions

- Owners are real users: `Lead.owner`, `Client.owner`, `WorkflowReminder.assigned_to`, and `QuoteLine.booking_owner` are nullable FKs to `auth.User`; null means "Unassigned". Legacy free-text values live in `*_label` columns and remain exposed under the old API keys (`owner`, `assignedTo`, `bookingOwner`); the FKs are exposed as `ownerId`/`ownerName`, `assignedToId`/`assignedToName`, `bookingOwnerId`/`bookingOwnerName`.
- A lead cannot advance past the `new_request` stage without an owner; the workflow checklist exposes this as the `assigned` blocker and `advance-workflow` returns 409.
- The workflow payload's `responsibleOwner`/`responsibleOwnerId` reflect the real owner; `serviceDesk` keeps the service-type desk label as a queue hint only.
- Role resolution lives in `serializers.py` (`get_user_responsibilities`, `can_*` helpers, `get_user_capabilities`). Groups are combinable: `crm_admin`, `crm_manager`, `crm_team_manager`, `crm_consultant`, `crm_operations`, `crm_finance`, `crm_viewer`, `crm_auditor`; legacy `crm_agent` is consultant-equivalent.
- Record scoping: consultant/agent see own + unassigned records; other CRM roles see all. Applied via `scope_records_for_user` in each viewset's `get_queryset`, scoped through the lead's owner for lead-linked models.
- Action permissions are enforced server-side in views: quote send, workflow advance, payment create/verify, user administration.
- Financial field policy: `QuoteLine.unitCost`/`unitSell`/`totalCost`/`margin` and `Quote.subtotalCost`/`margin` are hidden from `viewer` and `auditor` (see `FinancialFieldsMixin` and `CRM_FINANCIAL_VISIBILITY_ROLES` in `serializers.py`).
- Lead list supports `assigned_to=<user id>` and `unassigned=true` filters.

## Tasks (Workflow Reminders) and My Day

- `WorkflowReminder` is the task model: real `assignee` FK (`assignedToId`/`assignedToName`), linked `lead`, `dueAt`, `origin` (`system` / `manager` / `automation`), `completionCondition` (`none` / `payment_verified` / `supplier_confirmed` / `client_responded`), `waitingOn` (`client` / `supplier` / `internal` / null), `followUpAt`, and status (`pending` / `in_progress` / `waiting` / `completed` / `cancelled`; legacy `done` is migrated to `completed`).
- Automation-generated tasks (`generate_workflow_reminders`, the `generate` action, and the management command) get `origin=system` and a completion condition derived from the reminder type: `payment_due` -> `payment_verified`, `booking_deadline` -> `supplier_confirmed`, `follow_up` -> `client_responded`. Tasks created by a person through the API default to `origin=manager`.
- Completing a task (the `complete` action or PATCHing `status` to `completed`) enforces the completion condition against underlying records and returns 409 with an explanation when it is not met. `payment_verified` uses the strengthened `_payment_is_cleared`: received amounts must cover expected amounts or a record must be marked paid — `proof_received` alone never clears.
- Workflow checklist checks carry a `severity` (`blocker` / `missing_info` / `advisory`); only unready blockers gate advancement and appear in the payload's `blockers` list.
- `GET /api/my-day/` returns `{generatedAt, scope, counts, waitingClients, expiringSupplierHolds, pendingApprovals, upcomingDepartures, overdueTasks, todayTasks}`. Scope: users with `leads.view_all` get `scope=team` (own + unassigned + team); consultant/agent get `scope=own` (own + unassigned records, tasks assigned to them or unassigned). Task items are serialized `WorkflowReminder` objects; other items link to their lead/record via `leadId` + the section's id key.

## Test Command

```bash
python backend/manage.py test crm
```
