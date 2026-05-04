# Deployment Readiness

This guide documents the deployment setup after the repo split into `frontend/` and `backend/`.

## Deployment Split

- **Frontend**: Vercel
- **Backend**: Render web service
- **Database**: PostgreSQL in production, configured through `DATABASE_URL`

## Repository Paths

```text
dpmundo/
|-- frontend/       # React + Vite app
|-- backend/        # Django + DRF API
|-- vercel.json     # Vercel config from repo root
`-- .github/        # CI workflows
```

## Frontend Deployment: Vercel

Vercel is configured from the repository root through `vercel.json`.

Current expected settings:

```json
{
  "installCommand": "cd frontend && npm ci",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist"
}
```

Required Vercel environment variables:

```text
VITE_CRM_API_URL=https://api.dpmundo.com
```

For testing before the API custom domain is attached:

```text
VITE_CRM_API_URL=https://<render-service>.onrender.com
```

Frontend verification commands:

```bash
cd frontend
npm run lint
npm run build
```

## Backend Deployment: Render

Render should use `backend/` as the service root.

Build command:

```bash
bash render-build.sh
```

Start command:

```bash
gunicorn dpm_backend.wsgi:application
```

Required backend environment variables:

```text
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.dpmundo.com,<render-service>.onrender.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://www.dpmundo.com,https://dpmundo.com,https://api.dpmundo.com,https://<render-service>.onrender.com
DJANGO_CORS_ALLOWED_ORIGINS=https://www.dpmundo.com,https://dpmundo.com
DATABASE_URL=<production-postgres-url>
DATABASE_SSL_REQUIRE=True
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=False
DJANGO_SECURE_HSTS_PRELOAD=False
```

Backend verification commands:

```bash
python backend/manage.py check
python backend/manage.py test crm ctm
```

## GitHub Actions

CI is split by responsibility:

- `.github/workflows/frontend.yml` runs from `frontend/`.
- `.github/workflows/backend.yml` runs from `backend/`.

Expected checks:

- Frontend lint
- Frontend production build
- Django system check
- CRM and CTM backend tests

## Post-Deploy Checklist

1. Frontend loads at `https://www.dpmundo.com`.
2. Public trip request form submits successfully.
3. CRM login opens at `https://www.dpmundo.com/crm`.
4. CRM login works with a staff account.
5. CRM dashboard loads backend data without `Failed to fetch`.
6. CTM local/production route loads as expected.
7. Django admin works at `/admin/`.
8. No browser CORS errors appear.
9. Render logs show no startup or migration errors.
10. GitHub Actions are green after push.

## Current Verification

Last local verification after the `frontend/` migration:

- `npm run lint` from `frontend/`: passed
- `npm run build` from `frontend/`: passed
- `python backend/manage.py check`: passed
- `python backend/manage.py test crm ctm`: passed

Known warning:

- Vite reports the main frontend chunk is larger than 500 kB. This is not a deployment blocker, but future route-level code splitting should address it.
