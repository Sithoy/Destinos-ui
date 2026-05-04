# DPM - Destinos pelo Mundo

DPM is a travel platform for leisure, luxury, and corporate travel operations. The project combines a public landing experience, an internal CRM workspace, and a CTM corporate travel module backed by a Django API.

## Project Highlights

- Public landing page with simplified trip request capture.
- CRM command center for request intake, briefing, workflow control, trip design, quotes, bookings, reminders, documents, and payments.
- CTM workspace for company travel management, traveler records, approvals, billing, documents, and messages.
- Django REST backend used as the source of truth for CRM and CTM data.
- GitHub Actions for frontend and backend checks.

## Demo Flows

1. **Landing to CRM**
   - A client submits a simplified travel planning request.
   - DPM staff reviews the request in CRM.
   - Staff completes the internal briefing and generates a client validation brief.
   - Approved requests move into Trip Design.

2. **Leisure / Luxury CRM**
   - Staff qualifies the request.
   - The trip design workspace captures route, stays, room setup, movements, and experiences.
   - Quote, proposal, payment, booking, and travel pack stages are tracked from one operational workspace.

3. **Corporate Travel Management**
   - Corporate users create travel requests through CTM.
   - DPM manages company travelers, approval status, billing, documents, and messages.
   - Corporate requests stay separated from leisure/luxury process flow.

## Screenshots

Screenshots should be added before external portfolio review:

- Landing page hero and simplified request form.
- CRM Command Center.
- CRM Briefing Gate and client validation brief.
- Leisure Studio Trip Design workspace.
- Corporate Desk / CTM traveler directory.

Recommended location:

```text
docs/screenshots/
```

## Modules

- **Landing**: public website and simplified trip request flow for clients.
- **CRM**: internal command center for leads, briefing, trip design, quotes, bookings, tasks, documents, reminders, and payments.
- **CTM**: corporate travel workspace for company accounts, travelers, trip requests, approvals, billing, documents, and messages.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Django, Django REST Framework
- **Database**: SQLite locally, PostgreSQL preferred in production
- **ORM**: Django ORM only
- **Deployment targets**: Vercel for frontend, Render-compatible Django backend

## Current Status

- Landing page: active and simplified for easier client adoption.
- CRM: advanced workflow prototype connected to Django APIs.
- CTM: active local module with backend domain support.
- Backend: Django apps for CRM and CTM with tests.
- CI: frontend and backend workflows are configured.

## Current Repository Structure

```text
dpmundo/
|-- frontend/             # React + Vite frontend application
|   |-- src/              # Frontend source
|   |-- public/           # Static frontend assets
|   |-- package.json      # Frontend scripts and dependencies
|   `-- vite.config.ts    # Vite configuration
|-- backend/              # Django backend
|   |-- crm/              # CRM backend domain
|   |-- ctm/              # CTM backend domain
|   `-- dpm_backend/      # Django project settings and routing
|-- docs/                 # Architecture and product documentation
|-- scripts/              # Utility scripts
|-- .github/workflows/    # CI checks
|-- vercel.json           # Vercel build/output routing
`-- README.md
```

## Target Structure

The repo now uses the target top-level structure. Ongoing cleanup will continue inside `frontend/src/modules/`:

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
|   |   |-- hooks/
|   |   `-- types/
|   |-- public/
|   `-- package.json
|-- backend/
|   |-- crm/
|   |-- ctm/
|   |-- dpm_backend/
|   `-- manage.py
|-- docs/
|-- scripts/
|-- .github/workflows/
`-- README.md
```

Further cleanup should be done in small module-level phases to avoid mixing unrelated Landing, CRM, CTM, and backend changes.

## Local Development

Install frontend dependencies:

```bash
cd frontend
npm install
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Run the Django backend:

```bash
python backend/manage.py runserver
```

Run frontend checks:

```bash
cd frontend
npm run build
npm run lint
```

Run backend checks:

```bash
python backend/manage.py check
python backend/manage.py test crm ctm
```

## Architecture Notes

The Django backend is the source of truth. The React frontend should consume backend APIs for CRM and CTM workflows instead of relying on long-lived mock state.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current architecture, module boundaries, and proposed cleanup path.
