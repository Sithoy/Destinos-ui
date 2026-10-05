# CRM + CTM End-to-End Review: Business Trips Readiness

Date: 2026-09-22
Scope: `backend/crm/`, `backend/ctm/`, handoff between them, docs and frontend touchpoints.

## Verdict

The core business-trip lifecycle already works end to end. CTM (Company Travel Management) is a functional corporate pipeline: company accounts -> trip request -> 3-stage approval -> quote -> booking -> invoice/payments -> billing reports, with a one-way handoff that mirrors each trip into the CRM as a lead. What is missing is the depth a corporate travel product implies: travel policy, real cost centers/budgets, enforced approver identity, two-way sync, and spend reporting.

## End-to-end flow as it exists today

1. **Intake** — A company user (roles: employee -> company_admin, `backend/ctm/models.py:80`) creates a `TripRequest` with travelers (passport/visa readiness auto-computed), purpose, department, cost center, budget band (`backend/ctm/serializers.py:1821-1906`).
2. **Approvals** — Three sequential gates: travel need -> briefing -> final cost (`TripApproval`, `backend/ctm/models.py:301`), with role checks and hard server-side gates (`serializers.py:264-318`). Booking cannot confirm without approved final cost and a cost matching the quote exactly (`serializers.py:1488-1503`).
3. **CRM handoff** — Trip creation mirrors a CRM `Lead` (`service_key=corporate`) via `backend/ctm/crm_handoff.py:18-51`; the CRM runs its own 14-stage pipeline with corporate stage labels and a corporate briefing gate (`backend/crm/workflow.py:215-225`). The CRM itinerary is surfaced read-only back into CTM.
4. **Commercials** — CRM side: `Quote`/`QuoteLine` with cost/sell/margin. CTM side: `TripQuote` -> `TripBooking` -> `TripInvoice` (auto `INV-####`) -> `TripPayment` with auto status sync (`serializers.py:1752-1785`).
5. **Reporting** — Company-scoped billing reports (summary/invoices/payments) at `backend/ctm/views.py:194-300`.

## Key gaps for business-trip demand

### Structural (highest impact)

- **Two unsynchronized corporate stacks.** CRM `Quote`/`PaymentRecord` and CTM `TripQuote`/`TripInvoice`/`TripPayment` are separate graphs for the same trip. The handoff fires once at creation and even resets the lead to NEW on each call (`crm_handoff.py`); quote/booking/invoice progress never flows back, so the CRM lead goes stale.
- **No travel policy engine.** No model for rate caps, cabin class, advance-purchase rules, or preferred suppliers — "policy" exists only as checklist text (`workflow.py:222`). Biggest miss versus corporate-client expectations.
- **Cost centers/budgets are decoration.** `TripRequest.cost_center` is unvalidated free text (`models.py:202`); budget is a 3-band picker mapped to hardcoded fake estimates 800/3000/7000 (`serializers.py:565-570`). No PO field, no budget-vs-actual.

### Control weaknesses

- **Approver identity is not enforced.** Approvals are assigned as text labels ("Finance Controller", `serializers.py:1876-1889`) and any member with the right role can approve — `views.py:786-820` never checks `approval.approver == membership`. No amount-based routing beyond one hardcoded `gt5k` branch, no delegation or escalation.
- **Fragile corporate gate in CRM.** Stage advancement depends on the literal string `"[Corporate validation brief]"` in `internal_notes` (`workflow.py:224`) — editable free text can fake or break the gate.
- **Ownership is cosmetic.** `owner`, `assigned_to`, `booking_owner` are plain strings, not user FKs — no real assignment or per-account-manager reporting.

### Operational gaps

- No notifications in CTM (nothing emails on approval/quote/invoice events).
- Invoice `overdue` status exists but nothing ever sets it automatically.
- Trip requests cannot be edited as drafts or revised after rejection (open item in `docs/reviews/2026-09-22-followup-review.md:75`, along with hardcoded departments/budget bands and missing report filters/exports).
- Documents are URL strings, no file storage; booking content is a free-text blob.

## Suggested improvements, in priority order

1. **Make the CRM<->CTM sync two-way (or pick one source of truth).** At minimum, push CTM status milestones (quoted -> approved -> booked -> invoiced -> paid) back onto the mirrored `Lead`, and stop the handoff from resetting stage to NEW. Ideally retire either CRM `Quote` or CTM `TripQuote` for corporate trips so margin and billing reconcile.
2. **Add a travel-policy model.** `CompanyPolicy` (per `CompanyAccount`): max nightly rate, cabin class by trip length/role, advance-purchase days, approval thresholds by amount. Evaluate at trip creation and quote time; store a compliance flag + violation reasons on the trip. Replaces the hardcoded `gt5k` branch with data.
3. **Promote cost centers to a model.** `CostCenter` per company (code, name, budget, period), FK from `TripRequest`; validate at creation; add spend-vs-budget to the billing reports. Add a `po_number` field on `TripRequest`/`TripInvoice`.
4. **Enforce approver identity.** Make `TripApproval.approver` required and check it in the `approve` action; support amount-based routing from the policy model; add delegation and due dates for reminders/escalation.
5. **Replace the text-marker gate.** Add a `CorporateBrief` record (or boolean + FK) on the Lead instead of substring matching in `internal_notes`.
6. **Add CTM notifications + schedulers.** Reuse the CRM email pattern: notify on approval requested/decided, quote sent, invoice issued; a management command to mark invoices overdue and escalate stale approvals (CRM `generate_workflow_reminders` is the template).
7. **Close known review items:** editable drafts / revision-after-rejection, company-configured departments & budget bands (replacing `frontend/src/data/corporatePortal.ts:26`), report filters/CSV export, approver identity display.
8. **Convert ownership strings to user FKs** (`Client.owner`, `WorkflowReminder.assigned_to`, `QuoteLine.booking_owner`) to enable real assignment and account-manager reporting.
9. **Add travel-spend reporting:** spend by department/cost center/traveler, policy-compliance rate, approval cycle time — beyond today's billing-only endpoints.
10. **Real file storage for trip documents** (passport copies, invoices) instead of `file_url` strings.

## Follow-up status

- [ ] 1. Two-way CRM<->CTM sync / single source of truth
- [ ] 2. Travel-policy model
- [ ] 3. CostCenter model + PO field
- [ ] 4. Enforced approver identity + amount-based routing
- [ ] 5. CorporateBrief record replacing text-marker gate
- [ ] 6. CTM notifications + overdue/escalation scheduler
- [ ] 7. Known review items (drafts/revisions, configurable departments, report exports, approver display)
- [ ] 8. Ownership strings -> user FKs
- [ ] 9. Travel-spend reporting
- [ ] 10. File storage for trip documents
