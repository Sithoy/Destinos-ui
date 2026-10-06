# CRM UX Assessment, Review Response, and Remediation Plan

Date: 2026-09-22
Related: [2026-09-22 CRM/CTM business-travel review](2026-09-22-crm-ctm-business-travel-review.md), [2026-09-22 follow-up review](2026-09-22-followup-review.md)

---

## Part 1 — Original assessment (as provided)

**CRM has a useful operational foundation, but it still asks people to understand the system before they can do their work.** The visual polish helps; the next improvement should reorganise the experience around responsibilities, decisions and handoffs.

Role-access findings come from code inspection; no full permissions audit using every role has been performed.

### What is working well

- **The journey lifecycle is valuable.** Briefing, trip design, costing, approval, payment and delivery belong together. Keep that continuity.
- **Leisure and corporate need different workflows.** The existing distinction makes sense, particularly around company approvals and traveller coordination.
- **Readiness checks and blockers are a strong foundation.** Showing what is missing before the next step can prevent mistakes.
- **The original client request remains available.** Preserving inspiration, preferences and requested customisations helps consultants deliver something personal.
- **The manager overview has a useful direction.** "At risk", "Blocked" and "Ready to advance" are more actionable than a dashboard filled only with totals.

### What deserves redesign

| Area | What was found | Recommended direction |
|---|---|---|
| **Tasks** | Currently opens a request list filtered to high/urgent priority. Metrics and filters are squeezed into a narrow column. | A dedicated, full-width work queue with actual tasks, owners, deadlines and next actions. |
| **Calendar** | Primarily a list of requests with dates. It can also inherit filtering from the previous screen. | An agenda for departures, returns, payment deadlines, supplier holds and follow-ups. |
| **Reports** | Mostly filtered request data and CSV export, alongside a request workbench. | Purpose-built operational, commercial and financial reporting, with period comparisons and drill-down. |
| **Trip workspace** | Repeated status information, large stage navigation and several competing actions push the actual work down the page. | A compact trip summary, one prominent next action and focused sections. |
| **Navigation** | Broadly the same menu for every CRM role. | Navigation based on responsibilities and permitted capabilities. |
| **Ownership** | Some displayed owners are fixed names selected by service type, rather than actual assignments. | Real user/team assignments, with "Unassigned" when nobody owns the work. |

The ownership issue is especially important: **a named owner should mean that a real person has responsibility for that record.** The current `leadOwner()` implementation (`frontend/src/pages/CrmPage.tsx:1771`) returns a service-based name. That needs correcting before "My work", workload reporting or agent delegation can be trustworthy.

Confusing signals: a request can be labelled ready to advance while another part of the interface displays a generic "blocker". Actual blocking conditions, missing information and advisory suggestions should be clearly different.

### "My Day" as the primary entry point

The first screen should answer: **What needs my attention, why does it matter, and what can I do next?**

Examples: clients waiting for a response; a hotel hold expiring this afternoon; a proposal awaiting manager approval; tomorrow's departures with incomplete travel packs; AI-prepared drafts ready for review. Each item should open directly into the relevant task or decision. Managers default to a team view, consultants to their own work.

### Roles should shape the experience

Proposed responsibilities (not yet implemented):

| Responsibility | Default workspace | Typical authority |
|---|---|---|
| **Travel consultant / account manager** | My enquiries, proposals, follow-ups and clients | Maintain briefs, design trips and prepare proposals within assigned scope. |
| **Operations / reservations** | Supplier deadlines, bookings, documents and departures | Confirm operational details and fulfil approved bookings. |
| **Finance** | Payments to verify, invoices, balances and exceptions | Verify receipts and release financial clearance. |
| **Team manager** | Unassigned work, workload, overdue items and approval requests | Assign work and approve defined commercial exceptions. |
| **Administrator** | Users, permissions, integrations and configuration | Manage access and system settings; business approval authority assigned separately. |
| **Read-only / auditor** | Permitted records, reports and activity history | Inspect and export only where authorised. |

A small team can combine responsibilities without receiving unrestricted administrator access.

Current state: CRM has **admin, manager, agent and viewer** with broad read/write checks. Lead and quote queries do not restrict records by assigned consultant or team. Several operational resources share the same general write permission. See role rules (`backend/crm/serializers.py:11`) and API access checks (`backend/crm/views.py:46`).

Permissions should be defined across three dimensions, enforced by the backend:

- **Records:** own assignments, team, selected corporate accounts or all.
- **Actions:** view, edit, submit, approve, send, book, cancel or export.
- **Sensitive information:** supplier costs, margins, financial details and traveller documents.

### Tasks as the connection between people and trips

Every task needs a real assignee, linked trip, deadline, status, origin and completion condition. Start with **Mine / Team / Unassigned**, then **Today / Overdue / Upcoming / Waiting**. "Waiting for client" should show who must follow up and when. Completing a reminder must be distinct from proving the underlying work is complete — clicking "Done" on "Verify payment" must not itself establish that funds cleared.

### AI agents: preparation and checking, not a chat panel

| Opportunity | AI contribution | Human accountability |
|---|---|---|
| **Intake assistant** | Extract preferences, identify missing details, suggest duplicates, draft follow-up questions. | Consultant verifies the brief and accepts assignment. |
| **Trip research assistant** | Prepare itinerary alternatives and supplier comparisons with sources and freshness dates. | Consultant validates suitability, availability and terms. |
| **Proposal assistant** | Draft narrative and assemble approved itinerary + calculated prices into a proposal. | Authorised person reviews and sends the exact version. |
| **Quality-check assistant** | Flag date conflicts, inconsistent names, missing confirmations, quote/itinerary differences. | Operations resolves or explicitly accepts exceptions. |
| **Finance assistant** | Suggest receipt/invoice matches and explain discrepancies. | Finance verifies payment and authorises clearance. |
| **Follow-up assistant** | Draft contextual messages and a daily list of outstanding responses. | Account owner reviews external communications. |
| **Manager assistant** | Summarise bottlenecks and suggest workload redistribution. | Manager makes assignments and decisions. |

Dates, arithmetic, overdue rules and mandatory fields remain deterministic application logic. AI interprets incomplete information, compares alternatives and prepares explanations (aligned with [Anthropic's guidance on effective agents](https://www.anthropic.com/engineering/building-effective-agents)).

### Human review as a real product feature

An AI-prepared action shows: what it proposes and what would change; which records and sources support it; what remains uncertain; who must review it; **approve / edit / reject** controls. Approval applies to a specific version — if price, itinerary or recipient changes, prior approval no longer authorises execution. Agents get restricted service identities, never administrator credentials, and respect the same record/field permissions as the workflow they serve. Uploaded documents and supplier messages are information, not instructions. Activity history distinguishes **AI prepared -> person reviewed -> system executed** with timestamps, versions and outcomes (aligned with the [NIST AI Risk Management Framework](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)).

### Recommended order (from the assessment)

1. Establish reliable ownership and permission boundaries.
2. Redesign My Day and Tasks together, including assignment and handoffs.
3. Simplify the trip workspace around the current action.
4. Build genuine Calendar and Reports experiences.
5. Pilot intake summarisation and proposal quality checks as reviewable suggestions.

Success metrics: time to first client response, overdue work, handoff delays, proposal turnaround, preventable booking errors. For AI: reviewer corrections and escaped mistakes.

**First prototype:** one consultant's "My Day" -> task -> trip workspace -> manager approval flow.

---

## Part 2 — Review response (second opinion, code-verified)

The assessment's diagnosis, ordering and prototype choice are endorsed. Key confirmations and amendments:

### Confirmed against the code

- **Ownership is a label, not an assignment.** `OWNER_BY_SERVICE` (`backend/crm/workflow.py:83-87`) derives owners from service type; `Client.owner`, `WorkflowReminder.assigned_to`, `QuoteLine.booking_owner` are plain strings. Correctly elevated to first priority.
- **The task critique matches the backend.** `WorkflowReminder` (`backend/crm/models.py:340-379`) is auto-generated, string-assigned, and completable without proof. The same leak exists one level down: `_payment_is_cleared` (`backend/crm/workflow.py:324-336`) treats `proof_received` as cleared.
- **Conflicting signals are real.** Blockers from `workflow_for_lead` and the quote-approval satisfaction path (`workflow.py:260-266`) are computed differently; blockers/missing-info/advisory hints are not distinguished in the data model.
- **Permissions are a single broad gate.** `HasCrmAccess` (`backend/crm/views.py:46-50`), four roles, no record-level scoping, no field-level (cost/margin) protection. CTM has the parallel issue: any member with the right role can approve regardless of named approver (`backend/ctm/views.py:786-820`).

### Amendments to the assessment

1. **De-emphasise AI further.** Every AI opportunity consumes data that does not exist yet (structured briefs, real assignees, invoice states). Build the deterministic foundations first.
2. **Build versioned approval for humans before AI review.** CTM already resets approval on quote repricing (`backend/ctm/serializers.py:1433-1441`); CRM `QuoteApproval` is free-text with no version binding. The AI approve/edit/reject UI then falls out of the human mechanism.
3. **CrmPage extraction is part of the cost, not an implicit precondition.** `frontend/src/pages/CrmPage.tsx` is ~8,700 lines; redesigning surfaces inside it without extraction will stall. Extraction of the surfaces being redesigned is scheduled into the plan.
4. **Scope the permission model across CRM and CTM from the start.** CTM staff auto-membership (`backend/ctm/bootstrap.py`) is a broad grant already flagged as open in the 22-Sep follow-up review.
5. **"Preventable booking errors" has no telemetry source today.** Extend CTM's `TripTimelineEvent` audit-trail pattern into CRM rather than inventing parallel logging.

---

## Part 3 — Remediation plan

Phases are dependency-ordered; each ends in a verifiable state. Backend rules ship before (or with) the UI that depends on them.

### Phase 0 — Ownership and extraction (foundations) — COMPLETE 2026-09-22

**Goal: a named owner means a real, accountable user; the surfaces to be redesigned are extracted from the monolith.**

- [x] 0.1 Done. `Lead.owner` (new FK); `Client.owner`, `QuoteLine.booking_owner`, `WorkflowReminder.assigned_to` converted to nullable user FKs with legacy strings preserved as `*_label` columns and name-match backfill in `backend/crm/migrations/0015_ownership_assignees.py`. Serializers expose `ownerId`/`ownerName` etc. plus legacy keys; `workflow.py` `responsibleOwner` now comes from the real FK, desk label kept as `serviceDesk` queue hint; automation and seeds assign real users.
- [x] 0.2 Done. `leadOwner()` moved to `frontend/src/modules/crm/shared/leadMeta.ts` and now returns the API's real `ownerName` or "Unassigned"; all owner displays (queue cards, command center, corporate desk, detail pane, left rail) use it. `ownerByService` map deleted.
- [x] 0.3 Done. Lead list: `assigned_to=<id>` / `unassigned=true` filters; `advance-workflow` returns 409 with an owner blocker past `new_request` for unassigned leads; seeds/fixtures assign owners.
- [x] 0.4 Done. Tasks/Calendar/Reports logic + queue card + status report extracted to `frontend/src/modules/crm/{tasks,calendar,reports,shared}/`; CrmPage.tsx 8,653 -> 8,149 lines. Deferred: the ~780-line request detail pane (too coupled; extract as `RequestWorkspacePane` in Phase 2/3) and shared list chrome.

**Done when:** every lead/task shows a real user or "Unassigned"; tests cover backfill and advancement blocking; CrmPage shrinks by the extracted surfaces. — Met: 100 backend tests OK; frontend build/lint/tests green.

### Phase 1 — Permission model (CRM + CTM) — COMPLETE 2026-09-22

**Goal: the three permission dimensions enforced in the backend.**

- [x] 1.1 Done. Combinable groups `crm_consultant`, `crm_operations`, `crm_finance`, `crm_team_manager`, `crm_auditor` added alongside legacy roles (agent = consultant-equivalent); centralized helpers in `backend/crm/serializers.py`.
- [x] 1.2 Done. All lead-linked viewsets scope querysets via `scope_records_for_user` (consultant/agent: own + unassigned; others: all); detail access 404s out-of-scope records.
- [x] 1.3 Done. Server-side checks: `quotes.send`, `workflow.advance`, `payments.create`, `payments.verify`, `reports.export`, `users.admin`. Note: export is capability-only until Phase 4.2 adds server-side export endpoints (today's CSV is client-side).
- [x] 1.4 Done. `FinancialFieldsMixin` hides `unitCost`/`unitSell`/`totalCost`/`margin` (+ quote `subtotalCost`/`margin`) from viewer/auditor; visible to admin/manager/team_manager/finance/operations/consultant. Known gap to tighten in Phase 2: serializer FK querysets on write are not owner-scoped.
- [x] 1.5 Done. CTM approve/reject return 403 unless acting membership is the assigned approver or a company_admin (null approver = legacy role-based); approvals resolved to real CompanyUsers at creation (department-matched manager for travel_need, finance_approver for final_cost); `approverIdentity` serialized; staff auto-membership on arbitrary company codes removed (ops keep membership-free access; bootstrap default-company provisioning unchanged). 11 new CTM tests.
- [x] 1.6 Done. `/api/auth/me/` returns `roles` + `capabilities` (10 strings); frontend `userHasCapability` hides Settings nav (`users.admin`), disables CSV export / advance-workflow / add-payment / mark-paid / send-quote buttons with tooltips, and filters cost/margin tabs (`financials.view`). Backward compatible when capabilities absent.

**Done when:** per-role API tests prove record/action/field restrictions in both apps; UI hides what the API forbids. — Met: `backend/crm/test_permissions.py` (18 tests) + CTM approver/scope tests (11); 100 backend tests OK overall.

### Phase 2 — My Day + real Tasks — COMPLETE 2026-09-22

**Goal: the first screen answers "what needs my attention, why, and what next".**

- [x] 2.1 Done. `WorkflowReminder` extended into the task model (no parallel model): `origin` (system/manager/automation), `completion_condition` (none/payment_verified/supplier_confirmed/client_responded), `waiting_on` (client/supplier/internal), `follow_up_at`, status extended to pending/in_progress/waiting/completed/cancelled; migration `0016` backfills `done`->`completed` and derives conditions from reminder type. Automation sets `origin=system` + type-derived conditions; API-created tasks default to `origin=manager`.
- [x] 2.2 Done. `complete` action and PATCH-to-`completed` enforce the completion condition against underlying records (409 + explanation when unmet). `_payment_is_cleared` no longer treats `proof_received` as cleared — received >= expected or a `paid` record is required.
- [x] 2.3 Done. `GET /api/my-day/` (`MyDayView`): waitingClients, expiringSupplierHolds, pendingApprovals, upcomingDepartures (no sent travel pack), overdueTasks, todayTasks — with per-section counts and team/own scoping.
- [x] 2.4 Done. My Day is the default CRM landing (`frontend/src/modules/crm/myday/`): six sections matching the API with why-it-matters detail, owner chips, team/own scope banner; every item deep-links into the lead's workspace. Tasks surface replaced by a full-width queue (`frontend/src/modules/crm/tasks/TasksQueue.tsx`): Mine/Team/Unassigned + Today/Overdue/Upcoming/Waiting, real assignees, assign/start/wait/complete/cancel actions, 409 completion-condition errors surfaced inline. Workflow panel renders blocker/missing-info/advisory severities distinctly.
- [x] 2.5 Done. Every workflow checklist check carries `severity` (blocker/missing_info/advisory); only unready blockers gate advancement or appear in `blockers`. New non-gating checks added (intake preferred-contact advisory, quote-line supplier missing-info, unverified-payment-proof advisory).

**Done when:** the first prototype path works — consultant My Day -> task -> trip workspace -> manager approval; time-to-first-response and overdue counts measurable.

### Phase 3 — Trip workspace simplification

- [ ] 3.1 Compact trip summary header (status shown once); one prominent next action derived from workflow state; competing secondary actions collapsed.
- [ ] 3.2 Focused full-width sections/editors for briefing, trip design, costing; stage navigation demoted to a slim progress indicator.
- [ ] 3.3 Replace the `"[Corporate validation brief]"` text-marker gate (`backend/crm/workflow.py:224`) with a `CorporateBrief` record referenced by the gate (also item 5 in the business-travel review).

### Phase 4 — Calendar and Reports

- [ ] 4.1 Calendar agenda endpoint: departures, returns, payment due dates, supplier deadlines/holds, follow-ups — sourced from `TripItinerary` dates, `PaymentRecord.due_date`, `QuoteLine.supplier_deadline`, communication follow-ups.
- [ ] 4.2 Reports: operational (pipeline, SLA, overdue), commercial (conversion, margin by account/consultant), financial (receivables, aging) with period comparison and drill-down; server-side aggregation endpoints replacing client-side CSV over filtered lists (`frontend/src/pages/CrmPage.tsx:1839-1917`).
- [ ] 4.3 Extend `TripTimelineEvent`-style audit logging into CRM so "preventable booking errors" has a telemetry source.

### Phase 5 — Versioned approvals, then AI pilot

- [ ] 5.1 Bind `QuoteApproval` to a specific quote version; any change to price/itinerary/recipient invalidates the approval (mirrors CTM repricing reset, `backend/ctm/serializers.py:1433-1441`). Approver becomes a real user.
- [ ] 5.2 Approval UX: what changes, supporting records, uncertainties, reviewer, approve/edit/reject — built for humans first.
- [ ] 5.3 AI pilot (intake summarisation + proposal quality-check only): suggestions as reviewable drafts; restricted service identity; activity history records AI prepared -> person reviewed -> system executed with versions.
- [ ] 5.4 Measure reviewer corrections and escaped mistakes before expanding AI scope.

### Cross-cutting CTM items carried from the business-travel review

Tracked in [2026-09-22-crm-ctm-business-travel-review.md](2026-09-22-crm-ctm-business-travel-review.md) — two-way CRM<->CTM sync, travel-policy model, CostCenter model, CTM notifications/overdue scheduler, configurable departments/budget bands, report exports. Items 4 (approver identity) and 8 (ownership FKs) of that review are absorbed into Phases 1 and 0 above.

### Metrics to instrument from Phase 2 onward

Time to first client response; overdue work count/age; handoff delays; proposal turnaround; preventable booking errors (once 4.3 lands); AI reviewer corrections and escaped mistakes (Phase 5).
