# CTM Backend App

The CTM app supports company travel management for corporate clients.

## Responsibility

- Company account records.
- Company user and requester records.
- Traveler directory and reusable traveler profiles.
- Passport and visa readiness fields.
- Corporate trip requests.
- Approval workflow and decision tracking.
- Request timeline/events.
- Quotes, bookings, billing, tasks, documents, and messages for corporate travel.

## Main Files

- `models.py` - CTM domain data model.
- `serializers.py` - DRF request/response shaping and validation.
- `views.py` - CTM API endpoints and viewsets.
- `bootstrap.py` - local/demo CTM seed or setup helpers.
- `tests.py` - CTM backend tests if present.
- `admin.py` - Django admin configuration.

## Corporate Flow

Corporate requests should come from CTM rather than manual CRM leisure request creation.

Recommended flow:

1. Company creates or owns a travel request.
2. Traveler selection and readiness are confirmed.
3. DPM reviews the request in the corporate workflow.
4. Approval owner or approval status is tracked.
5. Booking, billing, documents, and messages are linked to the company request.
6. CRM operations can process the request while preserving corporate-specific controls.

## Development Rules

- Keep CTM domain logic separate from leisure/luxury CRM flows.
- Use Django migrations for schema changes.
- Keep company accounts, travelers, approvals, and billing PostgreSQL-compatible.
- Do not duplicate CRM models unless CTM has a genuinely different process need.
- Add or update tests when request lifecycle, approvals, travelers, or billing logic changes.

## Test Command

```bash
python backend/manage.py test ctm
```
