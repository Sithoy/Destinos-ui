# DPM Architecture

DPM means Destinos pelo Mundo. The platform is organized around three product areas:

- **Landing**: public client-facing travel request and brand experience.
- **CRM**: internal DPM workspace for sales, operations, trip design, workflow control, reminders, quoting, booking, payments, and travel pack delivery.
- **CTM**: company travel management workspace for corporate accounts, travelers, trip requests, approvals, billing, documents, and communications.

## Source of Truth

The Django backend is the source of truth for CRM and CTM data. Frontend screens should read from and write to backend APIs, then use local state only for temporary UI drafts.

Core domains:

- customers and clients
- leads and requests
- destinations and trip design
- trips and bookings
- tasks and workflow events
- documents and messages
- quotes, invoices, and payments
- company accounts, travelers, and approvals

## Current Structure

```text
dpmundo/
|-- frontend/
|   |-- src/
|   |   |-- modules/
|   |   |   |-- landing/
|   |   |   |-- crm/
|   |   |   `-- ctm/
|   |   |-- components/
|   |   |-- data/
|   |   |-- pages/
|   |   |-- locales/
|   |   `-- types.ts
|   |-- public/
|   |-- package.json
|   `-- vite.config.ts
|-- backend/
|   |-- crm/
|   |   |-- models.py
|   |   |-- serializers.py
|   |   |-- views.py
|   |   `-- workflow.py
|   |-- ctm/
|   |   |-- models.py
|   |   |-- serializers.py
|   |   `-- views.py
|   `-- dpm_backend/
|-- docs/
|-- .github/workflows/
|-- vercel.json
`-- README.md
```

## Frontend Boundaries

The frontend lives under `frontend/`.

- `frontend/src/modules/landing/` documents and will gradually host landing-page features.
- `frontend/src/modules/crm/` hosts extracted CRM modules, starting with the briefing gate.
- `frontend/src/modules/ctm/` documents and will gradually host corporate travel features.
- `frontend/src/components/` is for shared UI.
- `frontend/src/data/` is for frontend API/data access helpers.

The current page-level files can be split further, but each extraction should preserve behavior and keep builds passing.

## Backend Boundaries

The backend lives under `backend/`.

- `backend/crm/` owns CRM leads, clients, workflow, trip design, quotes, payments, communications, reminders, and travel pack logic.
- `backend/ctm/` owns company accounts, travelers, corporate trip requests, approvals, billing, documents, and messages.
- `backend/dpm_backend/` owns Django settings, URL routing, CORS, auth, and deployment configuration.

## CI and Deployment

- Frontend GitHub Action runs from `frontend/`.
- Backend GitHub Action runs from `backend/`.
- Vercel is configured from the repository root with `frontend/dist` as output.
- Render-compatible Django deployment remains under `backend/`.

## Recruiter Review Notes

The clearest story for reviewers is:

- DPM is a real travel operations platform, not a static website.
- The landing page captures demand.
- The CRM processes leisure and luxury travel through briefing, trip design, quote, booking, payment, and travel pack workflows.
- The CTM module supports corporate travel through company accounts, travelers, approvals, billing, and documents.
- Django owns the data model and API; React owns the user experience.
