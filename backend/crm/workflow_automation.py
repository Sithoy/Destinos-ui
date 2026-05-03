from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.db.models import QuerySet
from django.utils import timezone

from .models import CommunicationRecord, Lead, PaymentRecord, QuoteLine, WorkflowReminder
from .workflow import workflow_for_lead


@dataclass(frozen=True)
class ReminderCandidate:
    lead: Lead
    reminder_type: str
    source_stage: str
    title: str
    message: str
    due_at: datetime
    assigned_to: str = ""
    communication: CommunicationRecord | None = None


def generate_workflow_reminders(
    *,
    now: datetime | None = None,
    lead_queryset: QuerySet[Lead] | None = None,
    created_by=None,
) -> list[WorkflowReminder]:
    reference_time = now or timezone.now()
    leads = lead_queryset or Lead.objects.exclude(status__in=[Lead.Status.COMPLETED, Lead.Status.LOST])
    created: list[WorkflowReminder] = []

    for lead in leads.prefetch_related("quotes__lines", "payment_records", "communications", "workflow_reminders"):
        for candidate in reminder_candidates_for_lead(lead, reference_time):
            reminder, was_created = _create_pending_reminder(candidate, created_by=created_by)
            if was_created:
                created.append(reminder)

    return created


def reminder_candidates_for_lead(lead: Lead, now: datetime | None = None) -> list[ReminderCandidate]:
    reference_time = now or timezone.now()
    state = workflow_for_lead(lead)
    candidates: list[ReminderCandidate] = []

    for blocker in state["blockers"]:
        candidates.append(
            ReminderCandidate(
                lead=lead,
                reminder_type=WorkflowReminder.ReminderType.BLOCKER,
                source_stage=state["currentStage"],
                title=f"{state['currentStageLabel']}: {blocker['label']}",
                message=blocker["detail"],
                due_at=reference_time,
                assigned_to=state["responsibleOwner"],
            )
        )

    candidates.extend(_communication_follow_up_candidates(lead, reference_time, state))
    candidates.extend(_payment_due_candidates(lead, reference_time, state))
    candidates.extend(_booking_deadline_candidates(lead, reference_time, state))
    candidates.extend(_travel_pack_candidates(lead, reference_time, state))
    return candidates


def _create_pending_reminder(candidate: ReminderCandidate, *, created_by=None) -> tuple[WorkflowReminder, bool]:
    existing = WorkflowReminder.objects.filter(
        lead=candidate.lead,
        reminder_type=candidate.reminder_type,
        status=WorkflowReminder.Status.PENDING,
        source_stage=candidate.source_stage,
        title=candidate.title,
    ).first()
    if existing:
        return existing, False

    return (
        WorkflowReminder.objects.create(
            lead=candidate.lead,
            communication=candidate.communication,
            reminder_type=candidate.reminder_type,
            source_stage=candidate.source_stage,
            title=candidate.title,
            message=candidate.message,
            due_at=candidate.due_at,
            assigned_to=candidate.assigned_to,
            created_by=created_by,
        ),
        True,
    )


def _communication_follow_up_candidates(lead: Lead, now: datetime, state: dict) -> list[ReminderCandidate]:
    records = lead.communications.filter(
        follow_up_due__isnull=False,
        follow_up_due__lte=now,
    ).exclude(status__in=[CommunicationRecord.Status.CANCELLED, CommunicationRecord.Status.FAILED])

    return [
        ReminderCandidate(
            lead=lead,
            communication=record,
            reminder_type=WorkflowReminder.ReminderType.FOLLOW_UP,
            source_stage=state["currentStage"],
            title=f"Follow up: {record.subject or record.get_kind_display()}",
            message=record.notes or record.message[:240],
            due_at=record.follow_up_due,
            assigned_to=state["responsibleOwner"],
        )
        for record in records
    ]


def _payment_due_candidates(lead: Lead, now: datetime, state: dict) -> list[ReminderCandidate]:
    horizon = now.date() + timedelta(days=2)
    records = lead.payment_records.filter(due_date__isnull=False, due_date__lte=horizon).exclude(
        status__in=[PaymentRecord.Status.PAID, PaymentRecord.Status.CANCELLED, PaymentRecord.Status.REFUNDED]
    )

    return [
        ReminderCandidate(
            lead=lead,
            reminder_type=WorkflowReminder.ReminderType.PAYMENT_DUE,
            source_stage=state["currentStage"],
            title=f"Payment due: {record.get_payment_type_display()}",
            message=f"{record.currency} {record.amount_expected} expected; {record.currency} {record.amount_received} received.",
            due_at=timezone.make_aware(datetime.combine(record.due_date, time(hour=9))),
            assigned_to="Finance",
        )
        for record in records
    ]


def _booking_deadline_candidates(lead: Lead, now: datetime, state: dict) -> list[ReminderCandidate]:
    horizon = now.date() + timedelta(days=2)
    lines = QuoteLine.objects.filter(
        quote__lead=lead,
        supplier_deadline__isnull=False,
        supplier_deadline__lte=horizon,
    ).exclude(status=QuoteLine.Status.CONFIRMED)

    return [
        ReminderCandidate(
            lead=lead,
            reminder_type=WorkflowReminder.ReminderType.BOOKING_DEADLINE,
            source_stage=state["currentStage"],
            title=f"Supplier deadline: {line.description}",
            message=line.booking_notes or line.notes or "Supplier hold or confirmation deadline is approaching.",
            due_at=timezone.make_aware(datetime.combine(line.supplier_deadline, time(hour=9))),
            assigned_to=line.booking_owner or "Operations",
        )
        for line in lines
    ]


def _travel_pack_candidates(lead: Lead, now: datetime, state: dict) -> list[ReminderCandidate]:
    if state["currentStage"] != Lead.LifecycleStage.CONFIRMED:
        return []

    has_pack = lead.communications.filter(
        kind=CommunicationRecord.Kind.TRAVEL_PACK,
        status__in=[CommunicationRecord.Status.READY, CommunicationRecord.Status.SENT],
    ).exists()
    if has_pack:
        return []

    return [
        ReminderCandidate(
            lead=lead,
            reminder_type=WorkflowReminder.ReminderType.TRAVEL_PACK,
            source_stage=state["currentStage"],
            title="Prepare travel pack",
            message="Trip is confirmed; create a ready travel pack communication record.",
            due_at=now + timedelta(hours=4),
            assigned_to="Operations",
        )
    ]
