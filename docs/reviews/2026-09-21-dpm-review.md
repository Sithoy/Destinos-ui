# DPM website and operations review

Reviewed 21 September 2026. Workspace revision: **a45cd49**.

**Assessment:** DPM has a coherent travel brand and a substantial operations foundation. The public website needs stronger customer-facing content, clearer navigation, and accessibility improvements. CRM and CTM still require security and data-integrity fixes before they should be trusted with multiple companies, live approvals, bookings, and financial reporting.

**Scope and evidence**

The live public site at [www.dpmundo.com](https://www.dpmundo.com/), [Prestige Luxury](https://www.dpmundo.com/prestige/luxury), and [Prestige Corporate](https://www.dpmundo.com/prestige/corporate) was inspected in Chrome, including desktop and mobile layouts, language switching, enquiry modal behavior, and the CRM/CTM login pages. The authenticated operations review used the local frontend and Django backend with a separate review database and synthetic/sample records. It covered CRM navigation, Command Center, Leisure Studio, Corporate Desk, accounts, clients, tasks, calendar, reports, settings, and CTM dashboard, request detail, new trip, travelers, itineraries, and reports, supplemented by source inspection of approvals, billing, and permissions.

The backend findings below were reproduced against the local implementation. **The deployed backend version and production permission behavior were not verified.** No production login, customer-record mutation, booking, approval, or email was performed. The local enquiry test blocked the external notification request. Screenshots of operations contain sample data, not verified business activity. This is a product, implementation, and targeted security review, not an exhaustive penetration test or field-performance certification.

**What is working well**

- Leisure, luxury, and corporate services have distinct visual identities while retaining a common DPM brand. The home page fits a 390px viewport without horizontal overflow, and its primary enquiry CTA remains visible near the top.
- Portuguese and English switching works on the public website. Enquiry forms are relatively short, and the corporate page distinguishes consultation from CTM access.
- CRM separates customer intake, briefing, trip design, quotes, payments, and fulfillment. CTM includes company context, approval stages, traveler records, and a service timeline.
- The Django model structure, migrations, API layer, existing tests, and CI workflows are a useful foundation. The ordinary CTM request creation path creates a linked CRM lead in the local test.
- The frontend type check, production build, and ESLint run completed successfully. Django's system check reported no issues.

**Release blockers: fix these first**

**1. Critical — company administrators can obtain another company's access.** A user who was an administrator of review company A successfully signed in to company B with their existing credentials and B's company code. The response was HTTP 200, and a new administrator membership in B was created automatically. The implementation treats any company administrator as able to administer every company. An existing test even expects this behavior. Company administrators must remain scoped to their own explicitly assigned companies; cross-company administration needs a separate DPM operations permission. Ordinary authentication or a context switch should not create privileged memberships. Add negative tests for both login and the company-context header.

Evidence: [CTM membership policy](../../backend/ctm/serializers.py) lines 100–155; [existing cross-company test](../../backend/ctm/tests.py) line 578; [local probe results](evidence/probe-results.json).

**2. Critical — the anonymous enquiry API accepts internal CRM fields.** An unauthenticated enquiry was saved with lifecycle stage **closed**, an injected internal note, an arbitrary CTM reference, and links to existing synthetic company/client records. Its response also returned their names. The inherited serializer explicitly declares these fields, so listing them in the subclass's Meta.read_only_fields does not make those declared fields read-only. The public input should have its own small allowlist of enquiry fields and return only a receipt/reference. Internal associations, workflow state, and delivery status must be assigned by the server.

Evidence: [LeadSerializer and PublicLeadSerializer](../../backend/crm/serializers.py) lines 168–223; HTTP 201 and stored values in [probe results](evidence/probe-results.json).

**3. High — role names do not consistently match API permissions.** The CRM settings screen describes Viewer as read-only, but a viewer created a lead (HTTP 201) and changed its lifecycle stage (HTTP 200). Separately, an ordinary CTM employee deleted a trip requested by another user in the same company (HTTP 204), including its related invoice in the synthetic test. Restrict write methods by role and action, enforce object-level rules, and disable inherited destructive endpoints where cancellation with preserved history is the intended operation. Test all supported HTTP methods, including DELETE, not just the UI's normal actions.

Evidence: [CRM permission and lead viewset](../../backend/crm/views.py) lines 40–61; [CTM trip viewset](../../backend/ctm/views.py) line 674; [probe results](evidence/probe-results.json).

**4. High — traveler reuse loses identity and reports unverified documents as ready.** Selecting a saved traveler sends only name, email, and department; the backend creates another Traveler instead of linking the existing profile. It defaults the new passport status to OK with no passport number and treats the visa as not applicable unless the destination is exactly Dubai. In the isolated test, an existing profile marked missing was duplicated into a trip as Passport OK / Visa N/A, and the dashboard showed zero document alerts. Preserve the traveler ID, validate company ownership, default missing evidence to unknown/missing, and evaluate visa requirements from verified traveler and itinerary information. Do not infer readiness from a destination string alone.

Evidence: [new-trip payload](../../frontend/src/pages/corporate-portal/CorporateNewTripPage.tsx) line 131; [trip creation](../../backend/ctm/serializers.py) lines 1733–1783; [dashboard screenshot](evidence/ctm-desktop.png).

**5. High — operational gates can be bypassed.** The local booking API accepted a confirmed booking with no approvals and changed the trip to booked. The ordinary CRM lead PATCH endpoint also accepts lifecycle changes without passing through the workflow advance gate. Centralize transition validation in backend services used by every write path. Require the appropriate approvals before confirmation/ticketing, and prevent ordinary field updates from bypassing workflow rules. If emergency overrides are needed, make them explicit, privileged, and recorded with a reason.

Evidence: [booking endpoint](../../backend/ctm/views.py) line 374; [booking serializer and sync](../../backend/ctm/serializers.py) lines 1460–1510 and 1673; [lead serializer](../../backend/crm/serializers.py) line 177; [probe results](evidence/probe-results.json).

**6. High — financial totals combine unlike currencies.** Two invoices for USD 100 and EUR 100 produced **EUR 200** in the local billing summary. The summary adds amounts directly and uses the first invoice's currency; payment reconciliation also sums amounts without currency conversion. The default invoice aggregation includes draft and void records. Group by currency or use explicit, dated exchange rates and a defined reporting currency. Define which invoice states count toward billed and outstanding balances, validate payment currency against its invoice, and reject invalid negative amounts unless a specific credit/refund transaction supports them.

Evidence: [billing summary](../../backend/ctm/views.py) line 252; [payment serializer](../../backend/ctm/serializers.py) line 1600; [payment reconciliation](../../backend/ctm/serializers.py) line 1693; [probe results](evidence/probe-results.json).

**7. High — an invalid CTM request URL displays a different request.** The Itineraries placeholder links to a hard-coded DPM-2419. In the local review, that URL displayed DPM-2401, including actionable approval controls. The selected request falls back to the first available record when the requested ID is absent. A user could review or act on the wrong trip. Return an explicit not-found/unavailable state; never substitute another record for an explicit ID. The Itineraries action must target an actual booked request, or the incomplete page should be removed from primary navigation until implemented.

Evidence: [request selection and placeholder](../../frontend/src/pages/corporate-portal/CorporatePortalApp.tsx) lines 232 and 485; [mismatched request screen](evidence/ctm-request-mismatch.png).

**8. High — enquiries can be saved while the website tells the customer to retry.** The browser first creates a CRM lead and then separately calls FormSubmit. With that external notification deliberately blocked, the local website displayed “We could not send your request” although the lead was already stored. Its email status remained pending because the unauthenticated status update only changed local storage. Retrying can create duplicate leads. Use one backend submission endpoint that persists the enquiry once, returns its reference, and queues/retries notifications independently. Persist delivery status server-side and use an idempotency key. The corporate consultation form uses the same problematic pattern.

Evidence: [enquiry submission](../../frontend/src/components/InquiryModal.tsx) lines 186–226; [corporate consultation](../../frontend/src/pages/CorporatePage.tsx) lines 70–123; [CRM API fallback](../../frontend/src/data/crm.ts) lines 1225–1270; [observed error after persistence](evidence/form-notification-failure.png).

**9. High — operations navigation disappears on smaller screens.** Both CRM and CTM hide their sidebars below 1280px without providing a mobile/tablet menu. CTM also hides its search field below 1024px. This affects many laptop windows as well as phones. CRM additionally hides the main detail pane in several views. At a 1280px viewport, the Command Center document measured **1394px** wide. Add a drawer or compact navigation, keep search accessible, and provide a dedicated request-detail route on narrow screens. Replace fixed minimum column widths with layouts that adapt to the available content width.

Evidence: [CRM layout](../../frontend/src/pages/CrmPage.tsx) lines 4524, 4650, and 5532; [CTM sidebar](../../frontend/src/components/corporate-portal/CorporateSidebar.tsx) line 29; [CRM at 1280px](evidence/crm-1280.png); [CTM mobile](evidence/ctm-mobile.png).

**10. High — operational screens still mix real records and invented fallbacks.** CRM contains generated booking references and confirmation states, sample supplier costs, package prices, and synthetic workflow/history content. In particular, the travel-pack confirmation section uses mockBookingRecords when quote lines are absent. Missing data must show as missing, not become a plausible held/confirmed service. Isolate demonstrations from the operating application and make confirmations, prices, ownership, and history derive from persisted records.

Evidence: [CRM mock bookings, pricing, and rendered fallbacks](../../frontend/src/pages/CrmPage.tsx) lines 1397, 1882, 1900, 1977, 7456, and 7864. This finding is based on source inspection; the review did not send a generated travel pack.

**Landing page and public brand feedback**

The visual system is consistent, and the home page gives a credible first impression. The next improvement should be clarity and trust, followed by refinements to the visual hierarchy.

- **Replace design-review copy already visible on the live site.** Luxury shows “Warm premium aesthetic” and corporate shows “Executive efficiency aesthetic,” with bullets about tone and presentation. Explain the actual service instead: the planning process, support coverage, approvals, traveler coordination, reporting, or supplier handling that DPM really provides. Avoid unsupported promises. See the [live corporate screenshot](evidence/live-corporate-desktop.png) and [copy source](../../frontend/src/locales/en.ts) lines 364 and 459.
- **Reduce repeated oversized logos.** The header already establishes the brand; the very large hero logo and watermark consume space that could explain the offer. The luxury and corporate pages particularly need a more prominent customer benefit and CTA on ordinary laptop screens.
- **Make the three service paths explicit.** “Enter Prestige” requires visitors to understand the brand architecture before they can choose corporate travel. Offer clear Leisure / Luxury / Corporate links and make CTM access easy for returning clients. Move DPM staff login to a discreet utility location; the current support panel leads to internal team access rather than customer support.
- **Make destination cards useful.** They currently provide visual inspiration without a destination-specific action. Add “Plan this trip” with the destination prefilled. Review image accuracy: the card labeled Monaco uses imagery that appears to show Dubai. Reduce duplicate Paris coverage if a broader destination range is intended.
- **Add verifiable trust signals.** Introduce the actual team, business location, genuine testimonials or case studies, and relevant real credentials. Explain what happens after an enquiry, the response window, and what information the customer will receive. Add a clear privacy/data-use notice alongside the forms and in the footer. The current forms send contact and trip information to a third-party service.
- **Fix brand attribution.** Corporate social contact points to ETIOS Systems rather than a DPM corporate profile. Confirm whether that is intended. Technology-provider credit should remain visually secondary to DPM's customer contact information.
- **Strengthen search and sharing metadata.** The HTML has a generic title but no meta description, canonical URL, or social preview metadata. Use page-specific titles/descriptions, real navigation links, a sitemap, and a genuine not-found route. Evaluate prerendering the public pages separately from authenticated operations.

**CRM usability and product feedback**

The workflow coverage is a strength, but the main screens expose too much competing information at once. In the 1440px Command Center, six metrics occupy a five-column layout, leaving the sixth card on a mostly empty second row. The request table becomes compressed beside the permanent detail panel, and client/destination values truncate heavily. Use a compact metric row, a wider queue, and a detail view that opens on demand. Prioritize the owner, actual blocker, next action, deadline, and last activity. See [Command Center](evidence/crm-desktop.png) and [Leisure Studio](evidence/crm-leisure.png).

Several labels need more reliable definitions. “Blocked” is calculated from proposal/won statuses, and “Ready to Advance” from execution status, rather than the workflow engine's blockers and canAdvance value. These labels can therefore contradict the detailed workflow. Make metrics and their click-through queues use the same server-backed definitions. Counts should clearly state whether they represent all records, active records, or the current filter. See [metric definitions](../../frontend/src/pages/CrmPage.tsx) line 2835.

The Calendar and Reports destinations largely reuse request-list machinery. Develop a real departure/return/deadline calendar and decision-oriented reporting with date, owner, stage, conversion, turnaround, and margin views. The Corporate Desk's primary action still says “New Leisure Request,” which does not match the current workspace. CRM navigation and selected record are component state rather than shareable routes, so refresh/back navigation does not preserve the working context well.

Quote-line fields issue PATCH requests and reload quotes on every change, with no evident request ordering or draft buffer. This creates a risk of laggy editing and stale responses replacing newer values; this race was not stress-tested. Prefer local drafts with explicit save or debounced, versioned saves and clear saved/error states. The initial data load also groups many unrelated requests in one Promise.all, so one failed subsystem prevents the whole batch from updating. Fetch by workspace, show partial failures, paginate on the server, and protect unsaved work.

**CTM usability and product feedback**

The dashboard and request detail communicate the workflow clearly on wide screens. The traveler directory and staged approvals are useful concepts. Their value depends on correcting the access, readiness, and workflow defects above.

- Complete the Itineraries experience with real booked services and downloadable trip documents. The present page is explicitly a future-feature placeholder.
- Add return date or trip duration, editable drafts, revision after rejection, company-configured departments/cost centers, and a clear approver identity. The new-trip flow currently captures only departure date and uses hard-coded departments/budget bands. Adding a saved traveler also leaves the original empty traveler row to be handled.
- Make action availability reflect the logged-in user's role and the current gate. Show why an approval is unavailable and prevent duplicate submissions while a decision is pending.
- Correct dashboard semantics: Travelers managed counts trip participations rather than unique people; document alerts omit some unsafe states such as expired passports and pending visas; the travelers metric opens a pending-approval request filter; the activity feed reverses a flattened list rather than sorting all events by timestamp. See [portal statistics and timeline](../../frontend/src/pages/corporate-portal/CorporatePortalApp.tsx) lines 74–99 and the dashboard action handler.
- The notification bell has no action. Replace it with a working notification list or remove it. Avoid timeline statements that an approver was notified when the implementation only recorded an event.
- Reporting currently presents summary tiles and the six most recent invoices/payments. Add period filters, currency handling, department/cost-center breakdowns, exports, and a route to the full underlying record set.
- Operations are largely English-only while the public site supports Portuguese. Establish a consistent language choice across login and workspaces, and remove implementation commentary such as references to backend endpoints from customer-facing screens.

**Accessibility, performance, and maintainability**

The live enquiry modal retains keyboard focus on the background “Plan Your Trip” button when opened, and Escape does not close it. The background remains scrollable. Add initial focus, focus containment, Escape handling, focus restoration, and appropriate background inertness to all modal variants. Automated checks also found contrast problems on the live home page; the orange enquiry button was measured locally at 2.8:1 for white normal-size text. CRM has an unnamed theme button, and both operations areas need better landmark structure. Light-mode CTM billing colors require separate contrast treatment. These automated checks are partial and do not establish accessibility conformance.

The production build emitted a **998.66 kB JavaScript chunk, 252.81 kB gzip**, plus **95.63 kB CSS, 15.42 kB gzip**. App.tsx eagerly imports the public pages and both operations workspaces, so public visitors load code intended for staff and corporate users. Split by route and load operations on demand. The shared SmartImage marks even the hero image as lazy-loaded; give the hero eager/high-priority loading and use responsive optimized assets. No production Core Web Vitals claim is made from these build measurements.

CrmPage.tsx is **8,833 lines / 524,398 bytes** and mixes business rules, data fetching, layout, generated demo values, and many independent workflows. Extract focused workspace modules and shared domain services after the critical fixes, keeping the refactor separate from behavior changes. Add browser coverage for enquiry persistence, keyboard/modal use, mobile navigation, role restrictions, saved-traveler reuse, approval-to-booking gates, and currency-safe billing. Authentication endpoints and public lead creation have no application throttling configured in the reviewed settings; add explicit abuse controls and review token expiry/session handling before wider rollout.

**Validation results and limits**

| Check | Result |
|---|---|
| Live home, luxury, corporate, CRM login, CTM login | Loaded in Chrome; public layouts and interactions reviewed |
| Local authenticated CRM and CTM | Loaded using isolated sample data; key screens inspected |
| TypeScript + Vite production build | Passed; large single-chunk warning |
| ESLint | Passed |
| Django system check | Passed |
| Existing backend tests | **41 passed, 1 failed** out of 42 |
| Targeted local API probes | Confirmed tenant-access, public-field, role, workflow, and currency defects |
| Saved traveler / readiness probe | Confirmed duplicate profile and false passport readiness |
| Local enquiry with notification blocked | Lead persisted, UI showed failure, delivery state stayed pending |
| Responsive checks | Home fits 390px; operations lose navigation; CRM overflows at 1280px |
| Automated accessibility | Findings recorded in attached JSON; manual modal issue reproduced live |

The failing test is test_final_cost_approval_succeeds_after_travel_need_and_sent_quote. Its quote expires on **10 September 2026**, which is before the review date, and the API correctly rejects the expired quote with HTTP 400. Replace the fixed future-date assumption with a relative date or a controlled clock. This failure is evidence of a brittle test fixture, not proof that valid final-cost approval is broken. Existing tests passing also do not invalidate the authorization defects: one test explicitly asserts the unsafe cross-company behavior.

**Recommended order of work**

1. **Contain access and public-input risks:** company isolation, anonymous field allowlist, viewer restrictions, and trip deletion policy. Acceptance: unauthorized cross-company access and writes are rejected, and a public enquiry cannot affect internal fields or expose linked record names.
2. **Make operational truth reliable:** saved-traveler identity/readiness, approval and booking gates, currency/state-aware billing, correct request routing, and removal of mock production fallbacks. Acceptance: missing data stays visibly missing and every action applies to the displayed, authorized trip.
3. **Make daily work dependable:** atomic/idempotent enquiry capture, notification delivery tracking, responsive navigation, usable queues, consistent metrics, safe editing, and failure recovery.
4. **Finish the customer experience:** rewrite design-note copy, improve service navigation and trust content, complete itineraries/reports, fix accessibility, add public metadata, and split the bundle.

No application fixes or deployment changes were made as part of this review. The review documents and selected evidence are the only added repository files.
