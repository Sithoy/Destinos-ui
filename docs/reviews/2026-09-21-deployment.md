# DPM production deployment — 21 September 2026

Deployed commit `2a4cf87229c11c07495b4176aedc2d4b2d4f6906` from `master`.

- Website: https://www.dpmundo.com; Vercel `destinos-ui`; deployment `dpl_5hvB7D6YhjZfQ2kdr1u6hCguYf7e`, READY.
- Backend: https://dpm-backend.vercel.app; Vercel `dpm-backend`; deployment `dpl_53DtsHqkXu819wwjojG8GcGrXAJp`, READY.
- Database: Vercel-managed Neon `dpm-production-db`, resource `wandering-night-02171878`, Free plan, iad1. Connected only to the backend; preview database branching enabled.
- All Django migrations applied, including `crm.0010`. Fresh database initialization was explicitly authorized; historical Render records and accounts were not migrated.
- Initial administrator `dpm.admin` and company workspace `DPM Operations` / company ID `DPM` provisioned. Credentials delivered in a local file outside the repository. The temporary bootstrap hash environment variable was removed before the final production build.

## Verification

- 59 Django tests passed locally after deployment configuration changes.
- GitHub Frontend and Backend workflows passed on the deployed commit.
- Both production deployments reported READY.
- Administrator authentication succeeded for CRM and CTM; authenticated reads returned empty inquiry and trip lists.
- Unauthenticated CRM access returned 401; incomplete public inquiry returned 400.
- A synthetic public inquiry returned 201, persisted in CRM, and returned the same receipt on retry with HTTP 200. That exact generated test record was removed afterward; zero inquiries remained.
- API CORS returned `https://www.dpmundo.com` for the production origin.
- Live website shared JavaScript contains `https://dpm-backend.vercel.app` as the API base.
- Browser checks confirmed the updated landing page and both CRM/CTM login routes.

## Operational follow-up

- SMTP and scheduled inquiry notification delivery are not configured. Inquiries are saved to CRM; staff must monitor CRM until notification delivery is configured.
- Existing Render services and database remain untouched administratively because authenticator access is unavailable. Recover access to retrieve historical data and review remaining billing/automatic deployments.
- New staff/company accounts must be created in the fresh database. The larger product improvements listed in the remediation report remain separate work.
