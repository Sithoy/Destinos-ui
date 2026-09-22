# DPM review remediation

Implemented against the findings in [the full review](2026-09-21-dpm-review.md), then deployed to www.dpmundo.com with a fresh Neon database and Vercel backend. See [the deployment record](2026-09-21-deployment.md) for production verification and remaining operational setup. The original remediation checks below used the isolated review database and synthetic accounts.

## Completed

| Area | Result |
| --- | --- |
| Tenant isolation | Company administrators cannot acquire another company's membership through login or a company-context header. Unknown and unauthorized contexts fail closed. DPM staff retain their existing cross-company operations access. |
| CRM roles | Viewers can read but cannot create, update, delete, or invoke write actions. |
| Public intake | An explicit field allowlist excludes internal associations, status, notes, and delivery state. Responses contain only a receipt. Submission IDs deduplicate retries, and conflicting reuse returns 409. Login and intake endpoints have scoped rate limits. |
| Inquiry delivery | Browser submission now saves directly to CRM. A separate server command retries notification failures without creating another lead. The browser no longer depends on FormSubmit or attempts an unauthenticated delivery-status PATCH. |
| Trip history | CTM requests no longer expose inherited PUT, PATCH, or DELETE operations. Existing approval actions remain available. |
| Travelers | Saved profile IDs are preserved and checked against the active company. The empty initial row is replaced when selecting a saved traveler. New profiles remain unverified; passport OK requires evidence; unknown visas no longer display as N/A in the directory. Trip creation is transactional and validates departure/return dates. |
| Workflow | Generic CRM edits cannot skip workflow gates. Closed requests return a terminal workflow state. Low-budget CTM requests no longer receive automatic final-cost approval. Confirmed bookings require approvals, a valid sent quote, a matching amount/currency, and a supplier reference. Repricing a quote resets final approval; confirmed bookings prevent repricing. |
| Finance | Billing totals are separated by currency and exclude draft/void invoices. Payments must be positive and match an active issued invoice. Invoice currency cannot change after payment records exist, and amounts cannot fall below collected payments. Reconciliation ignores mismatched-currency legacy payments and preserves void status. |
| Record identity | An invalid explicit CTM request URL shows an unavailable state, never another trip. |
| Operational displays | Removed fabricated booking references, package prices, and inferred completed-history entries. Leisure workbench pricing uses saved quote lines. CRM readiness/blocked counts use backend checks. CTM counts unique traveler IDs and sorts activity using timestamps. |
| Navigation | CRM and CTM navigation remains available below desktop width. CRM Command Center fits 390px and 1280px without page-wide overflow; selected details remain accessible below desktop width. CTM search is available on mobile. |
| Itineraries | Replaced the hard-coded placeholder link with a list of actual confirmed bookings linking to their request/travel-pack view, with an explicit empty state. |
| Public site | Added direct service links, reduced the hero brand size, improved primary-button contrast, replaced internal design copy in both languages, moved team access to the footer, corrected corporate social attribution, and added metadata and an inquiry data-use notice. |
| Accessibility/loading | Public dialogs manage focus, Escape, background inertness, scroll locking, and focus restoration. CRM theme control is named; CTM content has a main landmark. Hero imagery loads eagerly. CRM and CTM are separate lazy-loaded bundles. |

## Verification

- **59 backend tests passed**, including 17 new regression tests and the corrected cross-company test. Time-sensitive fixtures now use relative dates.
- TypeScript, ESLint, Vite production build, Django system checks, migration consistency, and `git diff --check` passed.
- The main JavaScript bundle changed from 998.66 KB / 252.81 KB gzip to **441.83 KB / 134.22 KB gzip**. Other shared bundles still load as needed; this is a build-size measurement, not a field-performance score.
- Browser inquiry submission showed success and produced exactly one local lead with a submission ID and pending notification. Notification failure/retry tests used an in-memory email backend.
- Browser checks confirmed 390px CTM navigation/search, 390px and 1280px CRM layout, modal focus/Escape behavior, the invalid-request state, saved-profile row replacement, and the itinerary empty state. No application errors appeared in the browser error log during these checks.
- Screenshots: [CRM mobile](evidence/fixes-crm-mobile.png), [CRM 1280px](evidence/fixes-crm-1280.png), [CTM mobile](evidence/fixes-ctm-mobile.png), [home desktop](evidence/fixes-home-desktop.png).

## Rollout requirements

1. Apply `python manage.py migrate` before enabling the updated public intake endpoint. Migration `crm.0010` adds the unique submission ID and fingerprint.
2. Deploy backend and frontend together; set the frontend's `VITE_CRM_API_URL` to the intended backend. Public intake deliberately reports an error if no backend is configured.
3. Configure `DJANGO_EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`, and `DPM_INQUIRY_NOTIFICATION_EMAIL`. Schedule one worker to run `python manage.py send_inquiry_notifications --limit 50` periodically. Credentials belong in the deployment's secret store.
4. Notification delivery is retryable and at-least-once: a crash after SMTP accepts a message but before the database records success can repeat a notification. Previously saved inquiries without submission IDs are not automatically added to this queue.
5. Verify existing company memberships before release. The patch prevents new unauthorized grants; it cannot distinguish historical automatic grants from legitimate memberships and therefore does not revoke them automatically. Previously duplicated travelers and incorrectly marked documents also need a data review.
6. Scoped throttles use Django's configured cache. Multi-instance production requires a shared cache or equivalent ingress rate limiting for consistent enforcement.

## Remaining product work

The review also proposed larger features that are not included in this remediation:

- A real travel/deadline calendar, expanded CRM analytics, and CTM reporting filters/exports.
- Editable CTM drafts, revisions after rejection, company-configured departments and cost centers, and explicit approver assignment.
- Ordered or explicitly saved quote-line editing, partial-load recovery, server pagination, and shareable CRM working-context routes.
- Complete role-aware hiding/disabling of every editing control; backend write restrictions are enforced now.
- Full operations localization and a comprehensive accessibility/contrast pass across all forms and themes.
- Verified customer proof, company-approved privacy/retention terms, destination-specific inquiry prefilling, and full social-preview metadata.
- Historical data cleanup, an auditable exceptional-override workflow, and broader concurrent-write/security testing.

The passing checks cover the implemented changes. They do not establish production deployment parity, a complete security audit, or accessibility conformance.
