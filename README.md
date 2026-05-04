# DPM - Destinos pelo Mundo

DPM is a travel platform for leisure, luxury, and corporate travel operations. The project combines a public landing experience, an internal CRM workspace, and a CTM corporate travel module backed by a Django API.

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

## Current Repository Structure

```text
dpmundo/
├── src/                  # React frontend application
├── public/               # Static frontend assets
├── backend/              # Django backend
│   ├── crm/              # CRM backend domain
│   ├── ctm/              # CTM backend domain
│   └── dpm_backend/      # Django project settings and routing
├── docs/                 # Architecture and product documentation
├── scripts/              # Utility scripts
├── package.json          # Frontend scripts and dependencies
├── vite.config.ts        # Vite configuration
└── README.md
```

## Target Structure

The current repo is functional, but the planned cleanup is to make the module boundaries clearer for maintainers and reviewers:

```text
dpmundo/
├── frontend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── landing/
│   │   │   ├── crm/
│   │   │   └── ctm/
│   │   ├── components/
│   │   ├── data/
│   │   ├── hooks/
│   │   └── types/
│   ├── public/
│   └── package.json
├── backend/
│   ├── crm/
│   ├── ctm/
│   ├── dpm_backend/
│   └── manage.py
├── docs/
├── scripts/
├── .github/workflows/
└── README.md
```

This migration should be done in phases to avoid breaking imports, deployment settings, and environment configuration.

## Local Development

Install frontend dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the Django backend:

```bash
npm run backend:dev
```

Run frontend checks:

```bash
npm run build
npm run lint
```

Run backend checks:

```bash
python backend/manage.py check
python backend/manage.py migrate
```

## Architecture Notes

The Django backend is the source of truth. The React frontend should consume backend APIs for CRM and CTM workflows instead of relying on long-lived mock state.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current architecture, module boundaries, and proposed cleanup path.
