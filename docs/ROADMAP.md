# DPM Roadmap

This roadmap focuses on making DPM clear, stable, and credible for GitHub review while continuing product development.

## 1. Portfolio Readiness

Status: in progress.

- Keep README clear and recruiter-friendly.
- Maintain architecture documentation.
- Add screenshots under `docs/screenshots/`.
- Keep GitHub Actions green.
- Add concise demo flow descriptions.

## 2. Frontend Modularization

Goal: make the React code easier to review without breaking deployment.

- Keep current Vite setup stable.
- Gradually move frontend logic into `src/modules/`.
- Split large CRM page sections into focused components.
- Keep shared UI under `src/components/`.
- Keep API/data clients under `src/data/`.

Suggested order:

1. Landing components.
2. CRM Briefing Gate.
3. CRM Command Center.
4. Leisure Studio and Trip Design.
5. Corporate Desk and CTM screens.

## 3. Backend Stabilization

Goal: keep Django as the source of truth and make backend domains easier to understand.

- Add backend documentation for CRM and CTM apps.
- Keep schema changes in Django migrations.
- Keep workflow rules in backend services where possible.
- Expand tests around request lifecycle, briefing, workflow gates, quotes, payments, and CTM approvals.

## 4. Full Repository Layout Migration

Goal: move to a cleaner top-level structure only after module boundaries are stable.

Target:

```text
dpmundo/
|-- frontend/
|-- backend/
|-- docs/
|-- scripts/
|-- .github/workflows/
`-- README.md
```

Required updates:

- Vite config
- TypeScript config
- package scripts
- Vercel settings
- GitHub workflows
- documentation links

## 5. Deployment Readiness

Goal: make production setup predictable.

- Confirm frontend deployment on Vercel.
- Confirm backend deployment and environment variables.
- Confirm production database uses PostgreSQL through `DATABASE_URL`.
- Document required environment variables without exposing secrets.
- Keep local and production API configuration clear.

## 6. Product Enhancements

Priority areas:

- Client-facing proposal validation flow.
- Travel pack output and document generation.
- More structured quote engine and quote-to-booking linkage.
- CTM traveler readiness, approvals, billing, and reporting.
- Workflow reminders and calendar rules.
- Better dashboards for manager decision-making.

## 7. Known Technical Improvements

- Split oversized frontend files.
- Add route-level code splitting to reduce bundle size.
- Add screenshots and demo data guidance.
- Improve test coverage around frontend workflows.
- Add API documentation for CRM and CTM endpoints.
