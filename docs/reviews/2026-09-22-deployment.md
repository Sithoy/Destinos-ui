# DPM production deployment — 22 September 2026

Deployed commit `83bb5af` from `master` (push-triggered auto-deploy). Contents: the same-day follow-up review remediation — see [the follow-up review](2026-09-22-followup-review.md) for the full change list. Includes the CRM login visual polish (`CrmLoginLayout`, `styles/crm.css`). No new database migrations; `makemigrations --check` was clean before the push.

- Website: https://www.dpmundo.com — Vercel `destinos-ui`, deployment READY (~25s build).
- Backend: https://dpm-backend.vercel.app — Vercel `dpm-backend`, deployment READY (~30s build).
- GitHub Actions: Backend and Frontend workflows both succeeded on the deployed commit.
- Local gates before push: 67/67 Django tests, `tsc --noEmit`, ESLint, Vite build, frontend unit tests — all green.

## Production verification

- Home page serves og:/twitter metadata (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`).
- `robots.txt` served with sitemap reference; `sitemap.xml` returns 200.
- Unknown path returns the SPA (client renders the bilingual 404).
- `GET /api/public/experiences/` returns 200 (now scoped-throttled at 240/hour).
- Incomplete public inquiry still returns 400; no synthetic records were created.
- API CORS returns `https://www.dpmundo.com` for the production origin.

## Operational follow-up (unchanged from 21 September)

- SMTP and scheduled inquiry notification delivery remain unconfigured; staff must monitor inquiries in CRM.
- Scoped throttles use Django's locmem cache, so rate limits are per-instance on serverless. Add a shared cache or ingress rate limiting for strict enforcement.
- A company admin can still delete the final admin membership of their own company (no last-admin guard on `CompanyUserViewSet.destroy`); flagged for a follow-up.
- CRM login visual polish should be eyeballed on the live `/crm` route at the next staff sign-in.
