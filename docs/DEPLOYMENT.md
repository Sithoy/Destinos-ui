# Deployment

## Current production architecture (September 2026)

- Website: Vercel project `destinos-ui`, repository root, https://www.dpmundo.com.
- API: Vercel project `dpm-backend`, root directory `backend`, Django framework, https://dpm-backend.vercel.app.
- Database: Vercel-managed Neon resource `dpm-production-db`, Washington DC (`iad1`), Free plan. Production started with a fresh schema; old Render data has not been imported.
- The backend and database are in the same region. The Neon integration supplies sensitive database environment variables and creates separate branches for previews.
- Frontend `VITE_CRM_API_URL` is `https://dpm-backend.vercel.app`.

The backend uses `backend/vercel.json`. Its build runs `vercel_build.py` to apply migrations; Vercel collects static files automatically. Configure `DJANGO_SECRET_KEY`, `DATABASE_URL`, `DJANGO_ALLOWED_HOSTS`, and `DJANGO_DEBUG=False` in the backend project. Missing production secrets fail deployment instead of falling back to SQLite. Keep database credentials out of frontend variables.

For an entirely fresh database only, `DPM_BOOTSTRAP_ADMIN_PASSWORD_HASH` can supply a Django password hash at the first production build, with optional `DPM_BOOTSTRAP_ADMIN_USERNAME`. It creates an administrator only if the user table is empty and never resets existing accounts. Remove the bootstrap variable afterward. Never run development seed commands in production.

Deploy schema-compatible backend changes before frontend changes that require them. Check CRM/CTM authentication, company isolation, API CORS, and inquiry validation after rollout. Record migrations and backup requirements before any destructive schema change.

Inquiry receipts are saved in CRM. Email notifications additionally require SMTP configuration and a scheduled invocation of `send_inquiry_notifications`; these are not automatically provisioned by Vercel. Until configured, staff must review inquiries in CRM.

The previous Render service/database are retained for possible recovery; this deployment does not delete them. Recover Render access separately to export historical data and review any remaining billing or automatic deployments.

## Previous Render deployment reference

This guide documents the deployment setup after the repo split into `frontend/` and `backend/`.

### Previous deployment split

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
