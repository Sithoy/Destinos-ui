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

## Test Command

```bash
python backend/manage.py test crm
```
