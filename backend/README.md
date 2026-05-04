# DPM Backend

This Django backend powers the DPM CRM and CTM domains.

Django is the source of truth for operational data. The React frontend should consume these APIs rather than keeping long-lived mock state for CRM or CTM workflows.

## Backend Apps

- `crm/` - CRM leads, clients, quotes, payments, communications, trip itineraries, workflow gates, reminders, and staff access rules.
- `ctm/` - company accounts, company users, travelers, trip requests, approvals, timeline/events, quotes, bookings, billing, tasks, documents, and messages.
- `dpm_backend/` - Django project settings, URL routing, WSGI/ASGI entry points, auth, CORS, static files, and deployment configuration.

## Architecture Rules

- Use Django ORM only.
- Do not introduce Prisma.
- Use Django migrations for schema changes.
- Use DRF serializers, views, and viewsets for APIs.
- Keep PostgreSQL compatibility in mind, even when local development uses SQLite.
- Keep CRM and CTM process logic separated unless a task explicitly asks for shared behavior.
- Keep workflow/business rules testable and close to backend services.

## Local Setup

```bash
python -m pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver
```

Set the frontend API URL:

```bash
copy .env.example .env
```

Then keep `VITE_CRM_API_URL=http://localhost:8000` in the repository root `.env` and run the frontend with:

```bash
cd frontend
npm run dev
```

## API

- `POST /api/public/leads/` creates public website form leads.
- `POST /api/auth/login/` returns a CRM token.
- `POST /api/auth/logout/` revokes the CRM token.
- `GET /api/auth/me/` returns the signed-in user.
- `GET/POST/PATCH/DELETE /api/leads/` manages CRM leads for authenticated users.
- `GET/POST/PATCH/DELETE /api/clients/` manages registered CRM clients for authenticated CRM users.

See app-level documentation for domain responsibilities:

- [crm/README.md](crm/README.md)
- [ctm/README.md](ctm/README.md)

## Checks and Tests

Run system checks:

```bash
python backend/manage.py check
```

Run app tests:

```bash
python backend/manage.py test crm ctm
```

## Roles

CRM access is allowed for:

- superusers
- staff users
- Django group members in `crm_admin`, `crm_manager`, `crm_agent`, or `crm_viewer`

Client registration/editing is allowed for:

- superusers
- staff users
- Django group members in `crm_admin`, `crm_manager`, or `crm_agent`

## Production Notes

Use PostgreSQL through `DATABASE_URL`, set a strong `DJANGO_SECRET_KEY`, configure `DJANGO_ALLOWED_HOSTS`, and set `DJANGO_CORS_ALLOWED_ORIGINS` to the production website domains.

## Render Deployment

Recommended production split:

- Frontend: Vercel
- Backend: Render web service
- Database: Render PostgreSQL

### 1. Create the Render database

Create a PostgreSQL database in Render and copy its `DATABASE_URL`.

### 2. Create the Render web service

Use the `backend` directory as the service root.

- Build command:

```bash
bash render-build.sh
```

- Start command:

```bash
gunicorn dpm_backend.wsgi:application
```

### 3. Set backend environment variables

At minimum:

```text
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.dpmundo.com,<your-render-service>.onrender.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://www.dpmundo.com,https://dpmundo.com,https://api.dpmundo.com,https://<your-render-service>.onrender.com
DJANGO_CORS_ALLOWED_ORIGINS=https://www.dpmundo.com,https://dpmundo.com
DATABASE_URL=<render-postgres-url>
DATABASE_SSL_REQUIRE=True
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=False
DJANGO_SECURE_HSTS_PRELOAD=False
```

### 4. Point the frontend to the backend

In Vercel, set:

```text
VITE_CRM_API_URL=https://api.dpmundo.com
```

If you want to test before attaching the custom domain, use the Render URL first:

```text
VITE_CRM_API_URL=https://<your-render-service>.onrender.com
```

### 5. Create the first admin user

After the first deploy, open a Render shell and run:

```bash
python manage.py createsuperuser
```

### 6. Final production checks

Verify:

- `https://www.dpmundo.com` form submissions create leads
- `https://www.dpmundo.com/crm` opens the CRM login
- CRM login works with a valid staff account
- Django admin works at `/admin/`
- lead conversion to client works
- no CORS errors appear in the browser
