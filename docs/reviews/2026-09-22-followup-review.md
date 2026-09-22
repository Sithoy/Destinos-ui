# DPM website and operations follow-up review

Reviewed 22 September 2026. Workspace revision: **f7d939a**. Follow-up to the [21 September review](2026-09-21-dpm-review.md) and its [remediation](2026-09-21-remediation.md).

**Assessment:** The September remediation is genuine and intact. Every release blocker from the previous review still holds as fixed in current code, and the backend test suite is green (64/64). Since then, work concentrated on the public site: redesigned Prestige Luxury/Corporate journeys, a two-step enquiry intake, CMS-driven travel inspiration with versioned enquiry snapshots, and direct service navigation. The live site at [www.dpmundo.com](https://www.dpmundo.com/) reflects this and reads as a coherent, credible brand in both languages. The operations workspaces (CRM & CTM) were barely touched since remediation, so their structural product gaps remain open. One pre-existing destructive-endpoint gap was found that both prior rounds missed.

## Scope and method

- Live site fetched: home, [/prestige/luxury](https://www.dpmundo.com/prestige/luxury), [/prestige/corporate](https://www.dpmundo.com/prestige/corporate). Copy review only; no authenticated production access.
- Backend: full test suite run locally (`python manage.py test`, sqlite), remediation claims re-verified by source inspection, and `git diff 966d332..HEAD` reviewed for regressions.
- Frontend: landing, CRM, and CTM source reviewed against each prior finding and the remediation's "remaining product work" list.

## Verification of previous fixes — all hold

| Prior finding | Status | Evidence |
|---|---|---|
| Cross-company admin access (Critical) | Fixed, holds | `backend/ctm/serializers.py:1929-1954`, negative tests `backend/ctm/tests.py:579-597` |
| Anonymous enquiry accepts internal fields (Critical) | Fixed, holds | Allowlist at `backend/crm/serializers.py:266-270`; receipt-only response `backend/crm/views.py:551` |
| Viewer role could write (High) | Fixed, holds | `backend/crm/views.py:46-50` |
| Saved-traveler identity/readiness (High) | Fixed, holds | `backend/ctm/serializers.py:1814-1866` |
| Booking/workflow gate bypass (High) | Fixed, holds | `backend/ctm/serializers.py:1488-1503,264-318` |
| Mixed-currency totals (High) | Fixed, holds | `backend/ctm/views.py:259-288` |
| Invalid request URL shows another trip (High) | Fixed, holds | `frontend/src/pages/corporate-portal/CorporatePortalApp.tsx:229` |
| Enquiry saved but UI says retry (High) | Fixed, holds | Single POST with stable `submissionId` (`frontend/src/components/InquiryModal.tsx:66-70`); backend dedupe + 409 (`backend/crm/views.py:527-551`) |
| Operations nav lost below desktop (High) | Fixed, holds | `frontend/src/pages/CrmPage.tsx:4378`; `frontend/src/components/corporate-portal/CorporateSidebar.tsx:45` |
| Mock bookings/prices rendered as real (High) | Fixed, holds | Mocks return `[]` (`CrmPage.tsx:1341-1350`); demo data gated behind "no API configured" (`frontend/src/data/crm.ts:838`) |

Test suite: **64 passed, 0 failed** (up from 59; new tests cover travel content and tailored intake). `makemigrations --check` clean.

## New findings

**Medium**

1. **`CompanyUserViewSet.destroy` is unguarded (pre-existing, missed by both prior rounds).** Create and update require COMPANY_ADMIN, but DELETE falls through to DRF's default under any membership with `can_view_company_users` — so a company **manager**, who cannot create or edit users, can hard-delete a membership in their company (`backend/ctm/views.py:1022-1066`). Same class as blocker #3. Gate or disable `destroy`.

2. **Unguarded experience-snapshot render can crash CRM lead detail.** `frontend/src/components/ExperienceSnapshot.tsx:11` maps `itinerary/included/excluded/options` from arbitrary stored JSON with only a slug/en guard. A legacy or hand-edited revision missing an array throws with no error boundary. Related weak typing at `frontend/src/types.ts:77`.

**Low**

3. Public experiences endpoint (`/api/public/experiences/`) is unthrottled while other public endpoints have scoped limits (`backend/crm/travel_content.py:76-85`).
4. Public intake can 500 instead of 400 if a stored experience revision is missing keys (`content['pt']['title']` etc. dereferenced unguarded, `backend/crm/views.py:537-542`).
5. `TravelExperience.save()` mints an unpruned revision on every save, including no-ops (`backend/crm/travel_models.py:27-32`).
6. Backend 409/400 enquiry responses surface as a generic "retry" message, inviting retries that can never succeed (`InquiryModal.tsx:73`).
7. Dead code: unreachable `PrestigeGateway` path (`App.tsx:127-130,192-204`), stale `monacoImage`/`classicDestinations`/duplicate-Paris data (`frontend/src/data/travel.ts:21,31-52`), dead `parisExperiences` locale keys, and empty "fulfillment mock" render shells (`CrmPage.tsx:7708-7730,8130`).
8. Small i18n/polish gaps: English-only "Loading workspace…" fallback (`App.tsx:188`); English filter map omits `Romance` (`InspirationPage.tsx:11`); stale meta description on `/inspiracao` listing (`InspirationPage.tsx:25`); modal initial focus lands on the close button rather than the heading (`useModalFocus.ts:18` vs `InquiryModal.tsx:39`).
9. CTM "Document alerts" counts per-trip occurrences, not unique travelers (`CorporatePortalApp.tsx:84`) — ambiguous metric definition.
10. Production throttles use locmem cache; on multi-instance/serverless they are per-instance and weak (rollout note 6 from remediation, still open). Staff auto-membership on any presented company code remains a deliberate but broad grant (`backend/ctm/serializers.py:115-138`).

## Landing page feedback

The live site is in good shape. The redesign commits resolved most prior feedback:

- **Resolved:** explicit Leisure/Luxury/Corporate navigation (`frontend/src/components/Nav.tsx:71-86`); design-review copy replaced with real service descriptions on both Prestige pages (confirmed live); destination cards now have "Make it my holiday" prefilled actions and are CMS-driven (Monaco/Dubai and duplicate-Paris issues gone from the rendered site); hero images load eagerly; CRM/CTM are lazy bundles; dialog accessibility (focus trap, Escape, inert background, scroll lock) handled by a shared hook; corporate social attribution corrected; per-page titles/descriptions and a data-use notice in the enquiry form.
- **Two-step intake is well built:** summary review before contact details, channel validation, honest failure states, idempotent submission, and the CRM shows the exact inspiration revision the client enquired from.

Still open from prior feedback:

- **Trust signals (partial):** still no team introduction, testimonials/case studies, business location, or stated response window. The privacy notice lives only inside the modal, not the footer. This is now the biggest gap for converting first-time visitors.
- **SEO/sharing (partial):** no `og:`/`twitter:` tags, no `sitemap.xml` or `robots.txt`, and unknown paths still fall back to home instead of a genuine 404 (`frontend/src/data/travel.ts:134-146`). Social shares of the live site will render without a preview card.
- Live-copy nit: hero headlines render without a space after the preceding line in extracted text ("O extraordinário,à sua medida." / "O seu negócio avança.Nós coordenamos a viagem.") — worth a visual check that the line-break styling doesn't collapse oddly on narrow screens.

## CRM feedback

- **Intact:** backend-driven blocked/ready counts, priority-queue bell, responsive layout, real quote-line-driven pricing, versioned "Original inspiration" panel on leads.
- **Still open (unchanged since September):**
  - Quote-line editing fires a PATCH plus a full quotes refetch **per keystroke** with no debounce or draft buffer (`CrmPage.tsx:6654-6658,7162-7166,8137-8156` → `saveQuoteLine :3627-3635`). Confirmed race/lag risk under load.
  - Initial load is a single `Promise.all` of 11 fetches; one failure wipes all workspaces (`CrmPage.tsx:2246-2276`; same pattern in `CorporatePortalApp.tsx:167-190`).
  - Calendar is a dated-request list, not a calendar; Reports re-opens the filtered request list; Corporate Desk's primary action is still labeled "New Leisure Request" (`CrmPage.tsx:4460`).
  - No shareable routes — refresh/back loses working context; client-side pagination only.
  - `CrmPage.tsx` remains a single **8,683-line** file; the planned extraction into `modules/crm/` never happened.

## CTM feedback

- **Intact:** shareable deep links with legacy redirects, invalid-request "not found" state, itineraries listing real confirmed bookings with an empty state, per-currency billing in reports, dead notification bell removed.
- **Still open:** no editable drafts or revision-after-rejection; departments/budget bands hard-coded (`frontend/src/data/corporatePortal.ts:26`); no reporting filters/exports; no approver identity display; operations UI remains English-only while the public site is bilingual; role-aware hiding of controls is partial (backend enforcement stands).

## Recommended order of work

1. Gate `CompanyUserViewSet.destroy` (finding 1) and harden the snapshot render (finding 2) — small, contained fixes.
2. Quote-line editing: debounced/draft saves with explicit saved/error state; then partial-load recovery per workspace.
3. Trust content on the public site (team, location, response window, footer privacy notice) plus `og:` metadata, sitemap, robots, and a real 404.
4. CRM calendar/reports substance and the Corporate Desk label; CTM draft editing and reporting filters.
5. Cleanup batch: dead gateway/mock shells/locale keys, throttle parity on the experiences endpoint, guarded revision dereference, shared production cache for throttling.
6. The `CrmPage.tsx` extraction, kept separate from behavior changes.

No application changes were made as part of this review.

## Remediation applied 22 September 2026 (same day, working tree)

**Backend** (67/67 tests pass, +3 new regression tests):
- `CompanyUserViewSet.destroy` now requires the same company-admin manage check as create/update (`backend/ctm/views.py:1087-1091`); regression test covers manager 403 / admin 204.
- Public experiences endpoint throttled (`public_experiences` scope, 240/hour; `backend/crm/travel_content.py:78-84`, `backend/dpm_backend/settings.py:126`).
- Intake revision dereference hardened — malformed stored revisions skip the snapshot instead of a 500 (`backend/crm/views.py:523-568`).
- `TravelExperience.save()` only mints revisions on actual content change; pruning keeps 20 most recent plus any revision referenced by a lead (`backend/crm/travel_models.py:30-59`).

**CRM/CTM frontend** (tsc, ESLint, build, unit tests all pass):
- `ExperienceSnapshot` renders defensively against partial/untrusted JSON; proper snapshot types (`frontend/src/components/ExperienceSnapshot.tsx`, `frontend/src/types.ts:76-93`).
- Quote-line edits are local drafts with 650ms debounced PATCH, per-lead refetch, stale-response guard, and a Saving/Saved/Error indicator (`frontend/src/pages/CrmPage.tsx`).
- Initial loads use per-subsystem `Promise.allSettled` in both CRM and CTM — one failure no longer wipes the workspace.
- Corporate Desk fallback action relabeled "New Request"; dead mock render shells and factories removed; CTM document-alerts metric states its per-trip unit.

**Public site** (en/pt locale parity maintained at 422 keys each):
- og:/twitter metadata with per-page updates, `robots.txt`, `sitemap.xml` (confirmed served from `dist/`).
- Genuine bilingual 404 for unknown paths (`frontend/src/pages/NotFoundPage.tsx`); CRM/CTM routing unchanged.
- Footer privacy/data-use notice in both languages.
- Removed dead PrestigeGateway path/images/locale keys, stale Monaco/Paris destination data, and `parisExperiences` keys.
- Translated Suspense fallback, added the missing English `Romance` filter label, listing meta description, and fixed modal initial-focus ordering.

**Not done (still open):** trust content (team/testimonials/response window), CRM calendar/reports substance, shareable CRM routes, CTM draft editing and reporting filters/exports, `CrmPage.tsx` extraction, last-admin guard on membership deletion, and the production shared-cache/ingress rate-limit setup. Also present in the working tree: an unplanned CRM login-screen redesign (`frontend/src/components/CrmLoginLayout.tsx`, `frontend/src/styles/crm.css`) introduced during the fix session — visually verify before committing.
