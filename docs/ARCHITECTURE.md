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
├── src/
│   ├── components/
│   ├── data/
│   ├── pages/
│   ├── i18n/
│   └── types.ts
├── public/
├── backend/
│   ├── crm/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── workflow.py
│   ├── ctm/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   └── views.py
│   └── dpm_backend/
├── docs/
├── scripts/
└── README.md
```

This structure works, but the frontend module boundaries are not obvious from the top level. That makes the repo harder to review quickly on GitHub.

## Proposed Structure

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
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── crm/
│   ├── ctm/
│   ├── dpm_backend/
│   ├── manage.py
│   └── requirements.txt
├── docs/
├── scripts/
├── .github/workflows/
└── README.md
```

## Recommended Migration Plan

1. **Documentation first**
   - Keep this README and architecture document accurate.
   - Add screenshots and workflow descriptions before moving code.

2. **Frontend module cleanup**
   - Move landing, CRM, and CTM page logic under `frontend/src/modules/`.
   - Keep shared UI under `frontend/src/components/`.
   - Keep API/data clients under `frontend/src/data/`.

3. **Repository layout migration**
   - Move current frontend files into `frontend/`.
   - Update Vite, TypeScript, ESLint, Vercel, and package scripts.
   - Verify local dev and production build.

4. **Backend cleanup**
   - Keep Django apps inside `backend/crm/` and `backend/ctm/`.
   - Keep schema changes in Django migrations.
   - Keep business rules close to DRF serializers, views, and workflow services.

5. **CI and deployment readability**
   - Add `.github/workflows/` for frontend build and backend checks.
   - Keep deployment notes explicit for Vercel and Render.

## Recruiter Review Notes

The clearest story for reviewers is:

- DPM is a real travel operations platform, not a static website.
- The landing page captures demand.
- The CRM processes leisure and luxury travel through briefing, trip design, quote, booking, payment, and travel pack workflows.
- The CTM module supports corporate travel through company accounts, travelers, approvals, billing, and documents.
- Django owns the data model and API; React owns the user experience.
