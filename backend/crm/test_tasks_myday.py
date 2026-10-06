from datetime import datetime, time, timedelta

from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CommunicationRecord, Lead, PaymentRecord, Quote, QuoteApproval, QuoteLine, TripItinerary, WorkflowReminder
from .workflow import _payment_is_cleared
from .workflow_automation import reminder_candidates_for_lead


def make_user(username, *group_names):
    user = User.objects.create_user(username=username, password="pass")
    for group_name in group_names:
        group, _ = Group.objects.get_or_create(name=group_name)
        user.groups.add(group)
    return user


def make_lead(owner=None, **overrides):
    defaults = {
        "service": "Classic Form",
        "service_key": Lead.ServiceKey.CLASSIC,
        "name": "Task Traveler",
        "email": "traveler@example.com",
        "destination": "Lisbon",
        "dates": "10 Jun - 15 Jun 2026",
        "travelers": "2 travelers",
        "budget": "$3,000",
        "requested_services": "Flights, hotel",
        "lifecycle_stage": Lead.LifecycleStage.NEW_REQUEST,
        "status": Lead.Status.NEW,
        "owner": owner,
    }
    defaults.update(overrides)
    return Lead.objects.create(**defaults)


def make_task(lead, **overrides):
    defaults = {
        "reminder_type": WorkflowReminder.ReminderType.FOLLOW_UP,
        "source_stage": lead.lifecycle_stage,
        "title": "Task",
        "message": "Do the work.",
        "due_at": timezone.now(),
    }
    defaults.update(overrides)
    return WorkflowReminder.objects.create(lead=lead, **defaults)


class PaymentClearingTests(TestCase):
    def setUp(self):
        self.lead = make_lead()

    def test_no_payment_records_is_not_cleared(self):
        self.assertFalse(_payment_is_cleared(self.lead))

    def test_proof_received_alone_is_not_cleared(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=0, proof_received=True)

        self.assertFalse(_payment_is_cleared(self.lead))

    def test_partial_received_amount_is_not_cleared(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=60)

        self.assertFalse(_payment_is_cleared(self.lead))

    def test_received_covering_expected_is_cleared(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=100)

        self.assertTrue(_payment_is_cleared(self.lead))

    def test_paid_status_is_cleared(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=0, status=PaymentRecord.Status.PAID)

        self.assertTrue(_payment_is_cleared(self.lead))


class TaskCompletionConditionTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.lead = make_lead(owner=self.consultant)
        self.client.force_authenticate(self.consultant)

    def complete(self, task):
        return self.client.post(reverse("workflow-reminder-complete", args=[task.id]), {}, format="json")

    def test_none_condition_completes_freely(self):
        task = make_task(self.lead, completion_condition=WorkflowReminder.CompletionCondition.NONE)

        response = self.complete(task)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowReminder.Status.COMPLETED)
        self.assertIsNotNone(task.completed_at)

    def test_payment_verified_blocked_until_payment_cleared(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=0)
        task = make_task(
            self.lead,
            reminder_type=WorkflowReminder.ReminderType.PAYMENT_DUE,
            completion_condition=WorkflowReminder.CompletionCondition.PAYMENT_VERIFIED,
        )

        response = self.complete(task)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", response.data)
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowReminder.Status.PENDING)

        PaymentRecord.objects.update(amount_received=100)
        response = self.complete(task)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowReminder.Status.COMPLETED)

    def test_payment_verified_rejects_proof_without_cleared_amounts(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=0, proof_received=True)
        task = make_task(self.lead, completion_condition=WorkflowReminder.CompletionCondition.PAYMENT_VERIFIED)

        self.assertEqual(self.complete(task).status_code, status.HTTP_409_CONFLICT)

    def test_patch_status_completed_enforces_condition(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, amount_received=0)
        task = make_task(self.lead, completion_condition=WorkflowReminder.CompletionCondition.PAYMENT_VERIFIED)

        response = self.client.patch(
            reverse("workflow-reminder-detail", args=[task.id]),
            {"status": WorkflowReminder.Status.COMPLETED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowReminder.Status.PENDING)

    def test_patch_status_assignee_and_follow_up_allowed(self):
        other = make_user("other-consultant", "crm_consultant")
        follow_up_at = timezone.now() + timedelta(days=1)
        task = make_task(self.lead, completion_condition=WorkflowReminder.CompletionCondition.PAYMENT_VERIFIED)

        response = self.client.patch(
            reverse("workflow-reminder-detail", args=[task.id]),
            {
                "status": WorkflowReminder.Status.WAITING,
                "assignedToId": other.id,
                "waitingOn": WorkflowReminder.WaitingOn.CLIENT,
                "followUpAt": follow_up_at.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowReminder.Status.WAITING)
        self.assertEqual(task.assigned_to, other)
        self.assertEqual(task.waiting_on, WorkflowReminder.WaitingOn.CLIENT)
        self.assertIsNotNone(task.follow_up_at)

    def test_supplier_confirmed_requires_confirmed_quote_lines(self):
        quote = Quote.objects.create(lead=self.lead, quote_number="DPM-Q-TASK", version=1)
        line = QuoteLine.objects.create(quote=quote, category=QuoteLine.Category.HOTEL, description="Hotel", status=QuoteLine.Status.HELD)
        task = make_task(
            self.lead,
            reminder_type=WorkflowReminder.ReminderType.BOOKING_DEADLINE,
            completion_condition=WorkflowReminder.CompletionCondition.SUPPLIER_CONFIRMED,
        )

        self.assertEqual(self.complete(task).status_code, status.HTTP_409_CONFLICT)

        line.status = QuoteLine.Status.CONFIRMED
        line.save(update_fields=["status"])

        self.assertEqual(self.complete(task).status_code, status.HTTP_200_OK)

    def test_supplier_confirmed_requires_a_quote(self):
        task = make_task(self.lead, completion_condition=WorkflowReminder.CompletionCondition.SUPPLIER_CONFIRMED)

        self.assertEqual(self.complete(task).status_code, status.HTTP_409_CONFLICT)

    def test_client_responded_requires_linked_communication_response(self):
        communication = CommunicationRecord.objects.create(
            lead=self.lead,
            kind=CommunicationRecord.Kind.FOLLOW_UP,
            status=CommunicationRecord.Status.SENT,
            response_status=CommunicationRecord.ResponseStatus.AWAITING,
            message="Checking in.",
        )
        task = make_task(
            self.lead,
            communication=communication,
            completion_condition=WorkflowReminder.CompletionCondition.CLIENT_RESPONDED,
        )

        self.assertEqual(self.complete(task).status_code, status.HTTP_409_CONFLICT)

        communication.response_status = CommunicationRecord.ResponseStatus.RESPONDED
        communication.save(update_fields=["response_status"])

        self.assertEqual(self.complete(task).status_code, status.HTTP_200_OK)


class AutomationTaskMetadataTests(TestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.lead = make_lead(owner=self.consultant)

    def test_payment_due_candidate_sets_origin_and_condition(self):
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, due_date=timezone.localdate())

        candidates = reminder_candidates_for_lead(self.lead)

        payment_candidates = [c for c in candidates if c.reminder_type == WorkflowReminder.ReminderType.PAYMENT_DUE]
        self.assertEqual(len(payment_candidates), 1)
        self.assertEqual(payment_candidates[0].completion_condition, WorkflowReminder.CompletionCondition.PAYMENT_VERIFIED)

    def test_follow_up_candidate_waits_on_client(self):
        follow_up_due = timezone.now() - timedelta(hours=1)
        CommunicationRecord.objects.create(
            lead=self.lead,
            kind=CommunicationRecord.Kind.FOLLOW_UP,
            status=CommunicationRecord.Status.SENT,
            response_status=CommunicationRecord.ResponseStatus.AWAITING,
            follow_up_due=follow_up_due,
            message="Checking in.",
        )

        candidates = reminder_candidates_for_lead(self.lead)

        follow_ups = [c for c in candidates if c.reminder_type == WorkflowReminder.ReminderType.FOLLOW_UP]
        self.assertEqual(len(follow_ups), 1)
        self.assertEqual(follow_ups[0].completion_condition, WorkflowReminder.CompletionCondition.CLIENT_RESPONDED)
        self.assertEqual(follow_ups[0].waiting_on, WorkflowReminder.WaitingOn.CLIENT)
        self.assertEqual(follow_ups[0].follow_up_at, follow_up_due)

    def test_booking_deadline_candidate_waits_on_supplier(self):
        quote = Quote.objects.create(lead=self.lead, quote_number="DPM-Q-AUTO", version=1)
        QuoteLine.objects.create(
            quote=quote,
            category=QuoteLine.Category.HOTEL,
            description="Hotel hold",
            status=QuoteLine.Status.HELD,
            supplier_deadline=timezone.localdate(),
        )

        candidates = reminder_candidates_for_lead(self.lead)

        deadlines = [c for c in candidates if c.reminder_type == WorkflowReminder.ReminderType.BOOKING_DEADLINE]
        self.assertEqual(len(deadlines), 1)
        self.assertEqual(deadlines[0].completion_condition, WorkflowReminder.CompletionCondition.SUPPLIER_CONFIRMED)
        self.assertEqual(deadlines[0].waiting_on, WorkflowReminder.WaitingOn.SUPPLIER)

    def test_generated_reminder_persists_origin_and_condition(self):
        from .workflow_automation import generate_workflow_reminders

        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, due_date=timezone.localdate())

        generate_workflow_reminders(lead_queryset=Lead.objects.filter(id=self.lead.id))

        reminder = WorkflowReminder.objects.get(lead=self.lead, reminder_type=WorkflowReminder.ReminderType.PAYMENT_DUE)
        self.assertEqual(reminder.origin, WorkflowReminder.Origin.SYSTEM)
        self.assertEqual(reminder.completion_condition, WorkflowReminder.CompletionCondition.PAYMENT_VERIFIED)


class WorkflowSeverityTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.client.force_authenticate(self.consultant)

    def test_checklist_items_expose_severity(self):
        lead = make_lead(owner=self.consultant)

        response = self.client.get(reverse("lead-workflow", args=[lead.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        severities = {item["severity"] for item in response.data["checklist"]}
        self.assertTrue(severities <= {"blocker", "missing_info", "advisory"})
        self.assertIn("blocker", severities)
        for blocker in response.data["blockers"]:
            self.assertEqual(blocker["severity"], "blocker")

    def test_advisory_check_does_not_block_advancement(self):
        lead = make_lead(owner=self.consultant, preferred_contact="")

        response = self.client.get(reverse("lead-workflow", args=[lead.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        advisory = next(item for item in response.data["checklist"] if item["key"] == "preferred_contact")
        self.assertEqual(advisory["severity"], "advisory")
        self.assertFalse(advisory["ready"])
        self.assertTrue(response.data["canAdvance"])
        self.assertNotIn("preferred_contact", {item["key"] for item in response.data["blockers"]})

    def test_missing_info_check_does_not_block_advancement(self):
        lead = make_lead(
            owner=self.consultant,
            lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS,
            status=Lead.Status.PLANNING,
        )
        quote = Quote.objects.create(lead=lead, quote_number="DPM-Q-SEV", version=1)
        QuoteLine.objects.create(quote=quote, category=QuoteLine.Category.HOTEL, description="Hotel", supplier="")

        response = self.client.get(reverse("lead-workflow", args=[lead.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        missing = next(item for item in response.data["checklist"] if item["key"] == "line_suppliers")
        self.assertEqual(missing["severity"], "missing_info")
        self.assertFalse(missing["ready"])
        self.assertTrue(response.data["canAdvance"])
        self.assertEqual(response.data["blockers"], [])


class MyDayTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.other = make_user("other", "crm_consultant")
        self.manager = make_user("manager", "crm_manager")
        self.own_lead = make_lead(owner=self.consultant, name="Own Traveler")
        self.other_lead = make_lead(owner=self.other, name="Other Traveler")

        now = timezone.now()
        today = timezone.localdate()
        start_of_today = timezone.make_aware(datetime.combine(today, time.min))

        self.communication = CommunicationRecord.objects.create(
            lead=self.own_lead,
            kind=CommunicationRecord.Kind.FOLLOW_UP,
            status=CommunicationRecord.Status.SENT,
            response_status=CommunicationRecord.ResponseStatus.AWAITING,
            follow_up_due=now - timedelta(hours=2),
            subject="Checking in",
            message="Following up on the proposal.",
        )
        self.other_communication = CommunicationRecord.objects.create(
            lead=self.other_lead,
            kind=CommunicationRecord.Kind.FOLLOW_UP,
            status=CommunicationRecord.Status.SENT,
            response_status=CommunicationRecord.ResponseStatus.AWAITING,
            follow_up_due=now - timedelta(hours=3),
            subject="Other follow-up",
            message="Waiting on the other client.",
        )
        self.quote = Quote.objects.create(lead=self.own_lead, quote_number="DPM-Q-MYDAY", version=1)
        self.hold_line = QuoteLine.objects.create(
            quote=self.quote,
            category=QuoteLine.Category.HOTEL,
            description="Hotel hold",
            status=QuoteLine.Status.HELD,
            supplier_deadline=today + timedelta(days=1),
        )
        self.approval = QuoteApproval.objects.create(quote=self.quote, approver_name="Manager", decision=QuoteApproval.Decision.PENDING)
        self.itinerary = TripItinerary.objects.create(
            lead=self.own_lead,
            title="Lisbon trip",
            status=TripItinerary.Status.CONFIRMED,
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=5),
        )
        self.overdue_task = make_task(
            self.own_lead,
            title="Overdue task",
            due_at=start_of_today - timedelta(hours=1),
            assigned_to=self.consultant,
        )
        self.today_task = make_task(
            self.own_lead,
            title="Today task",
            due_at=start_of_today + timedelta(hours=12),
            assigned_to=self.consultant,
        )
        self.other_overdue_task = make_task(
            self.other_lead,
            title="Other overdue task",
            due_at=start_of_today - timedelta(hours=2),
            assigned_to=self.other,
        )

    def test_unauthenticated_is_rejected(self):
        self.assertIn(
            self.client.get(reverse("my-day")).status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_response_shape_and_own_sections(self):
        self.client.force_authenticate(self.consultant)

        response = self.client.get(reverse("my-day"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        section_keys = {
            "waitingClients",
            "expiringSupplierHolds",
            "pendingApprovals",
            "upcomingDepartures",
            "overdueTasks",
            "todayTasks",
        }
        self.assertEqual(set(response.data), {"generatedAt", "scope", "counts", *section_keys})
        self.assertEqual(response.data["scope"], "own")
        self.assertEqual(set(response.data["counts"]), section_keys)
        for key in section_keys:
            self.assertEqual(response.data["counts"][key], len(response.data[key]))

        self.assertEqual([item["communicationId"] for item in response.data["waitingClients"]], [str(self.communication.id)])
        self.assertEqual(response.data["waitingClients"][0]["leadId"], str(self.own_lead.id))
        self.assertEqual([item["quoteLineId"] for item in response.data["expiringSupplierHolds"]], [str(self.hold_line.id)])
        self.assertEqual([item["approvalId"] for item in response.data["pendingApprovals"]], [str(self.approval.id)])
        self.assertEqual([item["itineraryId"] for item in response.data["upcomingDepartures"]], [str(self.itinerary.id)])

        overdue_ids = {item["id"] for item in response.data["overdueTasks"]}
        today_ids = {item["id"] for item in response.data["todayTasks"]}
        self.assertEqual(overdue_ids, {str(self.overdue_task.id)})
        self.assertEqual(today_ids, {str(self.today_task.id)})
        task_item = response.data["overdueTasks"][0]
        self.assertEqual(str(task_item["leadId"]), str(self.own_lead.id))
        self.assertIn("origin", task_item)
        self.assertIn("completionCondition", task_item)

    def test_manager_sees_team_scope(self):
        self.client.force_authenticate(self.manager)

        response = self.client.get(reverse("my-day"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"], "team")
        waiting_ids = {item["communicationId"] for item in response.data["waitingClients"]}
        self.assertEqual(waiting_ids, {str(self.communication.id), str(self.other_communication.id)})
        overdue_ids = {item["id"] for item in response.data["overdueTasks"]}
        self.assertEqual(overdue_ids, {str(self.overdue_task.id), str(self.other_overdue_task.id)})

    def test_departure_with_sent_travel_pack_is_not_listed(self):
        CommunicationRecord.objects.create(
            lead=self.own_lead,
            kind=CommunicationRecord.Kind.TRAVEL_PACK,
            status=CommunicationRecord.Status.SENT,
            response_status=CommunicationRecord.ResponseStatus.NONE,
            message="Travel pack.",
        )
        self.client.force_authenticate(self.consultant)

        response = self.client.get(reverse("my-day"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["upcomingDepartures"], [])


class AssigneeVisibilityTests(APITestCase):
    """Tasks assigned to the requesting user stay visible even when the
    linked lead belongs to someone else (review finding #6)."""

    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.other = make_user("other", "crm_consultant")
        self.other_lead = make_lead(owner=self.other, name="Other Traveler")
        self.assigned_task = make_task(
            self.other_lead,
            title="Delegated to me",
            due_at=timezone.now() + timedelta(hours=2),
            assigned_to=self.consultant,
        )
        self.other_task = make_task(
            self.other_lead,
            title="Not mine",
            due_at=timezone.now() + timedelta(hours=3),
            assigned_to=self.other,
        )
        self.client.force_authenticate(self.consultant)

    def test_reminder_list_includes_tasks_assigned_to_me_on_other_leads(self):
        response = self.client.get(reverse("workflow-reminder-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data}
        self.assertIn(str(self.assigned_task.id), ids)
        self.assertNotIn(str(self.other_task.id), ids)

    def test_my_day_includes_assigned_task_on_other_lead(self):
        response = self.client.get(reverse("my-day"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        today_ids = {item["id"] for item in response.data["todayTasks"]}
        overdue_ids = {item["id"] for item in response.data["overdueTasks"]}
        self.assertIn(str(self.assigned_task.id), today_ids | overdue_ids)
        self.assertNotIn(str(self.other_task.id), today_ids | overdue_ids)


class ReminderGenerationHardeningTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.other = make_user("other", "crm_consultant")
        self.lead = make_lead(owner=self.consultant)
        PaymentRecord.objects.create(lead=self.lead, amount_expected=100, due_date=timezone.localdate())

    def generate(self, lead):
        from .workflow_automation import generate_workflow_reminders

        return generate_workflow_reminders(lead_queryset=Lead.objects.filter(id=lead.id))

    def test_in_progress_and_waiting_tasks_dedupe_regeneration(self):
        created = self.generate(self.lead)
        reminder = WorkflowReminder.objects.get(lead=self.lead, reminder_type=WorkflowReminder.ReminderType.PAYMENT_DUE)
        self.assertIn(reminder, created)

        for open_status in (WorkflowReminder.Status.IN_PROGRESS, WorkflowReminder.Status.WAITING):
            reminder.status = open_status
            reminder.save(update_fields=["status"])

            self.assertEqual(self.generate(self.lead), [])
            self.assertEqual(
                WorkflowReminder.objects.filter(lead=self.lead, reminder_type=WorkflowReminder.ReminderType.PAYMENT_DUE).count(),
                1,
            )

    def test_completed_task_allows_fresh_reminder(self):
        self.generate(self.lead)
        WorkflowReminder.objects.update(status=WorkflowReminder.Status.COMPLETED, completed_at=timezone.now())

        created = self.generate(self.lead)

        self.assertEqual(len(created), 1)

    def test_generate_scopes_lead_id_to_visible_leads(self):
        other_lead = make_lead(owner=self.other, lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS, status=Lead.Status.PLANNING)
        self.client.force_authenticate(self.consultant)

        response = self.client.post(reverse("workflow-reminder-generate"), {"leadId": str(other_lead.id)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_generate_allows_visible_lead(self):
        blocked = make_lead(owner=self.consultant, lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS, status=Lead.Status.PLANNING)
        self.client.force_authenticate(self.consultant)

        response = self.client.post(reverse("workflow-reminder-generate"), {"leadId": str(blocked.id)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(response.data["created"], 1)


class TaskApiContractTests(APITestCase):
    """API clients cannot set origin or completedAt directly (finding #7)."""

    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.lead = make_lead(owner=self.consultant)
        self.client.force_authenticate(self.consultant)

    def test_api_created_task_forces_manager_origin_and_ignores_completed_at(self):
        response = self.client.post(
            reverse("workflow-reminder-list"),
            {
                "leadId": str(self.lead.id),
                "title": "Manual task",
                "dueAt": timezone.now().isoformat(),
                "origin": WorkflowReminder.Origin.SYSTEM,
                "completedAt": timezone.now().isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = WorkflowReminder.objects.get()
        self.assertEqual(task.origin, WorkflowReminder.Origin.MANAGER)
        self.assertIsNone(task.completed_at)
        self.assertEqual(response.data["origin"], WorkflowReminder.Origin.MANAGER)
        self.assertIsNone(response.data["completedAt"])
