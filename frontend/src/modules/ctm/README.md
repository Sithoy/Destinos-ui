# CTM Module

The CTM module is the corporate travel management workspace for company clients.

## Responsibility

- Manage company accounts and corporate traveler records.
- Support reusable traveler selection for faster request creation.
- Track passport and visa readiness.
- Manage corporate trip requests, approvals, billing, documents, messages, and reporting.
- Keep corporate requests flowing into the shared Django backend and CRM operations.

## Current Implementation

CTM UI currently lives in the existing `src/` application structure. Backend CTM domain code lives under `backend/ctm/`.

Future cleanup should move CTM frontend code here in small slices such as:

- `company-accounts/`
- `travelers/`
- `trip-requests/`
- `approvals/`
- `billing/`
- `documents/`
- `messages/`
- `reports/`

## Key Flows

- Company user creates a corporate travel request.
- DPM receives the corporate request through CTM/CRM.
- Approval, traveler readiness, billing, and documents are tracked against the company account.
