from __future__ import annotations

from decimal import Decimal

from .models import CommunicationRecord, Lead, PaymentRecord, Quote, QuoteApproval, QuoteLine


LEISURE_STAGE_LABELS = {
    Lead.LifecycleStage.NEW_REQUEST: "New request",
    Lead.LifecycleStage.PENDING_INFORMATION: "Qualification",
    Lead.LifecycleStage.VALIDATED: "Validated brief",
    Lead.LifecycleStage.QUOTE_IN_PROGRESS: "Trip design",
    Lead.LifecycleStage.QUOTE_SENT: "Proposal sent",
    Lead.LifecycleStage.AWAITING_APPROVAL: "Awaiting approval",
    Lead.LifecycleStage.APPROVED: "Approved",
    Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE: "Payment",
    Lead.LifecycleStage.BOOKING_IN_PROGRESS: "Booking",
    Lead.LifecycleStage.CONFIRMED: "Confirmed",
    Lead.LifecycleStage.TRAVEL_PACK_SENT: "Travel pack sent",
    Lead.LifecycleStage.IN_TRAVEL: "In travel",
    Lead.LifecycleStage.COMPLETED: "Completed",
    Lead.LifecycleStage.CLOSED: "Closed",
}

CORPORATE_STAGE_LABELS = {
    **LEISURE_STAGE_LABELS,
    Lead.LifecycleStage.PENDING_INFORMATION: "Company brief",
    Lead.LifecycleStage.VALIDATED: "Traveler readiness",
    Lead.LifecycleStage.QUOTE_IN_PROGRESS: "Corporate options",
    Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE: "Finance clearance",
    Lead.LifecycleStage.BOOKING_IN_PROGRESS: "Fulfilment",
}

LEISURE_STAGES = [
    Lead.LifecycleStage.NEW_REQUEST,
    Lead.LifecycleStage.PENDING_INFORMATION,
    Lead.LifecycleStage.VALIDATED,
    Lead.LifecycleStage.QUOTE_IN_PROGRESS,
    Lead.LifecycleStage.QUOTE_SENT,
    Lead.LifecycleStage.AWAITING_APPROVAL,
    Lead.LifecycleStage.APPROVED,
    Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE,
    Lead.LifecycleStage.BOOKING_IN_PROGRESS,
    Lead.LifecycleStage.CONFIRMED,
    Lead.LifecycleStage.TRAVEL_PACK_SENT,
    Lead.LifecycleStage.IN_TRAVEL,
    Lead.LifecycleStage.COMPLETED,
]

CORPORATE_STAGES = [
    Lead.LifecycleStage.NEW_REQUEST,
    Lead.LifecycleStage.PENDING_INFORMATION,
    Lead.LifecycleStage.VALIDATED,
    Lead.LifecycleStage.QUOTE_IN_PROGRESS,
    Lead.LifecycleStage.QUOTE_SENT,
    Lead.LifecycleStage.AWAITING_APPROVAL,
    Lead.LifecycleStage.APPROVED,
    Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE,
    Lead.LifecycleStage.BOOKING_IN_PROGRESS,
    Lead.LifecycleStage.CONFIRMED,
    Lead.LifecycleStage.TRAVEL_PACK_SENT,
    Lead.LifecycleStage.IN_TRAVEL,
    Lead.LifecycleStage.COMPLETED,
]

STATUS_BY_STAGE = {
    Lead.LifecycleStage.NEW_REQUEST: Lead.Status.NEW,
    Lead.LifecycleStage.PENDING_INFORMATION: Lead.Status.CONTACTED,
    Lead.LifecycleStage.VALIDATED: Lead.Status.CONTACTED,
    Lead.LifecycleStage.QUOTE_IN_PROGRESS: Lead.Status.PLANNING,
    Lead.LifecycleStage.QUOTE_SENT: Lead.Status.PROPOSAL,
    Lead.LifecycleStage.AWAITING_APPROVAL: Lead.Status.PROPOSAL,
    Lead.LifecycleStage.APPROVED: Lead.Status.WON,
    Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE: Lead.Status.WON,
    Lead.LifecycleStage.BOOKING_IN_PROGRESS: Lead.Status.EXECUTION,
    Lead.LifecycleStage.CONFIRMED: Lead.Status.EXECUTION,
    Lead.LifecycleStage.TRAVEL_PACK_SENT: Lead.Status.EXECUTION,
    Lead.LifecycleStage.IN_TRAVEL: Lead.Status.EXECUTION,
    Lead.LifecycleStage.COMPLETED: Lead.Status.COMPLETED,
    Lead.LifecycleStage.CLOSED: Lead.Status.LOST,
}

OWNER_BY_SERVICE = {
    Lead.ServiceKey.CLASSIC: "Leisure Studio",
    Lead.ServiceKey.LUXURY: "Leisure Studio",
    Lead.ServiceKey.CORPORATE: "Corporate Desk",
}


def workflow_for_lead(lead: Lead) -> dict:
    stages = _stage_sequence(lead)
    current_stage = _normalized_stage(lead, stages)
    current_index = stages.index(current_stage)
    next_stage = stages[current_index + 1] if current_index + 1 < len(stages) else None
    checklist = _checklist_for_stage(lead, current_stage)
    blockers = [item for item in checklist if not item["ready"]]

    return {
        "leadId": str(lead.id),
        "workflowType": "corporate" if lead.service_key == Lead.ServiceKey.CORPORATE else "leisure",
        "currentStage": current_stage,
        "currentStageLabel": _stage_label(lead, current_stage),
        "nextStage": next_stage,
        "nextStageLabel": _stage_label(lead, next_stage) if next_stage else "",
        "canAdvance": next_stage is not None and not blockers,
        "responsibleOwner": _owner_for_stage(lead, current_stage),
        "checklist": checklist,
        "blockers": blockers,
        "stages": [_stage_payload(lead, stage, current_index, index) for index, stage in enumerate(stages)],
    }


def advance_workflow(lead: Lead, target_stage: str | None = None) -> tuple[Lead, dict]:
    state = workflow_for_lead(lead)
    if not state["canAdvance"]:
        return lead, state

    next_stage = target_stage or state["nextStage"]
    allowed_stage = state["nextStage"]
    if next_stage != allowed_stage:
        state["canAdvance"] = False
        state["blockers"] = [
            {
                "key": "target_stage",
                "label": "Target stage",
                "ready": False,
                "detail": f"Only {allowed_stage} is allowed from {state['currentStage']}.",
            }
        ]
        return lead, state

    lead.lifecycle_stage = next_stage
    lead.status = STATUS_BY_STAGE.get(next_stage, lead.status)
    lead.save(update_fields=["lifecycle_stage", "status", "updated_at"])
    return lead, workflow_for_lead(lead)


def _stage_sequence(lead: Lead) -> list[str]:
    return CORPORATE_STAGES if lead.service_key == Lead.ServiceKey.CORPORATE else LEISURE_STAGES


def _normalized_stage(lead: Lead, stages: list[str]) -> str:
    if lead.status == Lead.Status.LOST:
        return Lead.LifecycleStage.CLOSED
    if lead.lifecycle_stage in stages:
        return lead.lifecycle_stage
    return stages[0]


def _stage_label(lead: Lead, stage: str | None) -> str:
    if not stage:
        return ""
    labels = CORPORATE_STAGE_LABELS if lead.service_key == Lead.ServiceKey.CORPORATE else LEISURE_STAGE_LABELS
    return labels.get(stage, stage.replace("_", " ").title())


def _stage_payload(lead: Lead, stage: str, current_index: int, index: int) -> dict:
    if index < current_index:
        state = "done"
    elif index == current_index:
        state = "current"
    else:
        state = "upcoming"

    return {
        "stage": stage,
        "label": _stage_label(lead, stage),
        "state": state,
    }


def _owner_for_stage(lead: Lead, stage: str) -> str:
    if stage in {Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE, Lead.LifecycleStage.APPROVED}:
        return "Finance"
    if stage in {Lead.LifecycleStage.BOOKING_IN_PROGRESS, Lead.LifecycleStage.CONFIRMED, Lead.LifecycleStage.TRAVEL_PACK_SENT, Lead.LifecycleStage.IN_TRAVEL}:
        return "Operations"
    return OWNER_BY_SERVICE.get(lead.service_key, "CRM")


def _checklist_for_stage(lead: Lead, stage: str) -> list[dict]:
    checks_by_stage = {
        Lead.LifecycleStage.NEW_REQUEST: _intake_checks,
        Lead.LifecycleStage.PENDING_INFORMATION: _brief_checks,
        Lead.LifecycleStage.VALIDATED: _design_input_checks,
        Lead.LifecycleStage.QUOTE_IN_PROGRESS: _quote_build_checks,
        Lead.LifecycleStage.QUOTE_SENT: _quote_sent_checks,
        Lead.LifecycleStage.AWAITING_APPROVAL: _approval_checks,
        Lead.LifecycleStage.APPROVED: _payment_record_checks,
        Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE: _payment_clearance_checks,
        Lead.LifecycleStage.BOOKING_IN_PROGRESS: _booking_checks,
        Lead.LifecycleStage.CONFIRMED: _travel_pack_checks,
        Lead.LifecycleStage.TRAVEL_PACK_SENT: _travel_support_checks,
        Lead.LifecycleStage.IN_TRAVEL: _completion_checks,
        Lead.LifecycleStage.COMPLETED: _closed_checks,
        Lead.LifecycleStage.CLOSED: _closed_checks,
    }
    return checks_by_stage.get(stage, _closed_checks)(lead)


def _check(key: str, label: str, ready: bool, detail: str) -> dict:
    return {"key": key, "label": label, "ready": ready, "detail": detail}


def _intake_checks(lead: Lead) -> list[dict]:
    has_contact = bool(lead.email or lead.whatsapp or lead.contact)
    has_request = bool(lead.destination or lead.requested_services or lead.trip_type)
    return [
        _check("contact", "Client contact", has_contact, "Email, WhatsApp, or contact name must be present."),
        _check("request_scope", "Request scope", has_request, "Destination, service scope, or trip type must be known."),
    ]


def _brief_checks(lead: Lead) -> list[dict]:
    if lead.service_key == Lead.ServiceKey.CORPORATE:
        return [
            _check("travelers", "Traveler scope", bool(lead.travelers), "Corporate request needs traveler count or traveler scope."),
            _check("dates", "Travel dates", bool(lead.dates), "Corporate movement needs timing before options are built."),
            _check("services", "Service scope", bool(lead.requested_services), "Policy, invoice, visa, hotel, and movement needs should be visible."),
        ]

    return [
        _check("destination", "Destination", bool(lead.destination), "Leisure destination must be known."),
        _check("dates", "Travel dates", bool(lead.dates), "Travel window must be known."),
        _check("travelers", "Travelers", bool(lead.travelers), "Traveler count must be known."),
        _check("budget", "Budget posture", bool(lead.budget), "Budget range should be captured before design."),
    ]


def _design_input_checks(lead: Lead) -> list[dict]:
    itinerary = lead.itineraries.order_by("-updated_at").first()
    return [
        _check("brief", "Qualified brief", bool(lead.destination and lead.dates), "Destination and dates must be stable."),
        _check("itinerary", "Trip design record", bool(itinerary), "Create an itinerary record before pricing."),
    ]


def _quote_build_checks(lead: Lead) -> list[dict]:
    quote = _latest_quote(lead)
    line_count = quote.lines.count() if quote else 0
    return [
        _check("quote", "Quote exists", bool(quote), "Create a quote for this workflow."),
        _check("quote_lines", "Quote lines", line_count > 0, "Add at least one priced or researched quote line."),
    ]


def _quote_sent_checks(lead: Lead) -> list[dict]:
    quote = _latest_quote(lead)
    return [
        _check("quote", "Quote exists", bool(quote), "A quote must exist before sending."),
        _check("sent", "Proposal sent", bool(quote and (quote.sent_at or quote.status in {Quote.Status.SENT, Quote.Status.ACCEPTED})), "Mark quote as sent or accepted."),
    ]


def _approval_checks(lead: Lead) -> list[dict]:
    quote = _latest_quote(lead)
    approved = bool(quote and (quote.status == Quote.Status.ACCEPTED or quote.approvals.filter(decision=QuoteApproval.Decision.APPROVED).exists()))
    return [
        _check("quote", "Quote exists", bool(quote), "A quote must exist before approval."),
        _check("approval", "Client approval", approved, "Client or company approval must be recorded."),
    ]


def _payment_record_checks(lead: Lead) -> list[dict]:
    return [
        _check("payment_record", "Payment checkpoint", lead.payment_records.exists(), "Create a payment or finance checkpoint."),
    ]


def _payment_clearance_checks(lead: Lead) -> list[dict]:
    return [
        _check("payment_clearance", "Payment clearance", _payment_is_cleared(lead), "Payment or finance clearance must be marked paid/proof received."),
    ]


def _booking_checks(lead: Lead) -> list[dict]:
    quote = _latest_quote(lead)
    actionable_lines = quote.lines.exclude(category=QuoteLine.Category.SERVICE_FEE) if quote else QuoteLine.objects.none()
    total = actionable_lines.count()
    ready = total > 0 and not actionable_lines.exclude(status__in=[QuoteLine.Status.HELD, QuoteLine.Status.CONFIRMED]).exists()
    return [
        _check("booking_items", "Booking items", total > 0, "Quote must include operational booking items."),
        _check("booking_release", "Bookings held or confirmed", ready, "All operational items must be held or confirmed."),
    ]


def _travel_pack_checks(lead: Lead) -> list[dict]:
    has_pack = lead.communications.filter(kind=CommunicationRecord.Kind.TRAVEL_PACK, status__in=[CommunicationRecord.Status.READY, CommunicationRecord.Status.SENT]).exists()
    return [
        _check("payment", "Payment cleared", _payment_is_cleared(lead), "Payment clearance is required before travel pack release."),
        _check("bookings", "Bookings controlled", all(item["ready"] for item in _booking_checks(lead)), "Bookings must be held or confirmed."),
        _check("travel_pack", "Travel pack record", has_pack, "Create a ready or sent travel pack communication record."),
    ]


def _travel_support_checks(lead: Lead) -> list[dict]:
    has_dates = bool(lead.dates or lead.itineraries.filter(start_date__isnull=False).exists())
    return [
        _check("travel_dates", "Travel dates", has_dates, "Travel dates should be visible for in-travel support."),
    ]


def _completion_checks(lead: Lead) -> list[dict]:
    return [
        _check("support_complete", "Support complete", True, "Manual completion can be recorded after travel support closes."),
    ]


def _closed_checks(lead: Lead) -> list[dict]:
    return [
        _check("closed", "No next stage", False, "Workflow has no automatic next stage."),
    ]


def _latest_quote(lead: Lead) -> Quote | None:
    return lead.quotes.prefetch_related("lines", "approvals").order_by("-version", "-created_at").first()


def _payment_is_cleared(lead: Lead) -> bool:
    records = list(lead.payment_records.all())
    if not records:
        return False

    expected = sum((record.amount_expected for record in records), Decimal("0"))
    received = sum((record.amount_received for record in records), Decimal("0"))
    has_paid_record = any(record.status == PaymentRecord.Status.PAID or record.proof_received for record in records)

    if expected > 0:
        return received >= expected or has_paid_record

    return has_paid_record
