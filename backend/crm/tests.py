from django.contrib.auth.models import Group, User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Lead, Quote, WorkflowReminder


class LeadWorkflowApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="agent", password="pass")
        group, _ = Group.objects.get_or_create(name="crm_agent")
        self.user.groups.add(group)
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def make_lead(self, **overrides):
        defaults = {
            "service": "Classic Form",
            "service_key": Lead.ServiceKey.CLASSIC,
            "name": "Test Traveler",
            "email": "traveler@example.com",
            "destination": "Lisbon",
            "dates": "10 Jun - 15 Jun 2026",
            "travelers": "2 travelers",
            "budget": "$3,000",
            "requested_services": "Flights, hotel",
            "lifecycle_stage": Lead.LifecycleStage.NEW_REQUEST,
            "status": Lead.Status.NEW,
        }
        defaults.update(overrides)
        return Lead.objects.create(**defaults)

    def test_workflow_state_returns_stage_and_checklist(self):
        lead = self.make_lead()

        response = self.client.get(reverse("lead-workflow", args=[lead.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currentStage"], Lead.LifecycleStage.NEW_REQUEST)
        self.assertEqual(response.data["nextStage"], Lead.LifecycleStage.PENDING_INFORMATION)
        self.assertTrue(response.data["canAdvance"])
        self.assertEqual(response.data["responsibleOwner"], "Leisure Studio")

    def test_advance_workflow_moves_to_next_stage_when_gates_pass(self):
        lead = self.make_lead()

        response = self.client.post(reverse("lead-advance-workflow", args=[lead.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.lifecycle_stage, Lead.LifecycleStage.PENDING_INFORMATION)
        self.assertEqual(lead.status, Lead.Status.CONTACTED)

    def test_advance_workflow_blocks_when_stage_gate_fails(self):
        lead = self.make_lead(
            lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS,
            status=Lead.Status.PLANNING,
        )
        quote = Quote.objects.create(
            lead=lead,
            quote_number="DPM-Q-TEST",
            version=1,
            status=Quote.Status.DRAFT,
            currency="USD",
        )

        response = self.client.post(reverse("lead-advance-workflow", args=[lead.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["currentStage"], Lead.LifecycleStage.QUOTE_IN_PROGRESS)
        self.assertFalse(response.data["canAdvance"])
        self.assertTrue(response.data["blockers"])

    def test_generate_workflow_reminders_creates_pending_blocker(self):
        lead = self.make_lead(
            lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS,
            status=Lead.Status.PLANNING,
        )

        response = self.client.post(reverse("workflow-reminder-generate"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(response.data["created"], 1)
        reminder = WorkflowReminder.objects.filter(lead=lead, reminder_type=WorkflowReminder.ReminderType.BLOCKER).first()
        self.assertIsNotNone(reminder)
        self.assertEqual(reminder.status, WorkflowReminder.Status.PENDING)

    def test_complete_workflow_reminder_marks_done(self):
        lead = self.make_lead()
        reminder = WorkflowReminder.objects.create(
            lead=lead,
            reminder_type=WorkflowReminder.ReminderType.FOLLOW_UP,
            source_stage=Lead.LifecycleStage.PENDING_INFORMATION,
            title="Follow up client",
            message="Client response is due.",
            due_at=timezone.now(),
            assigned_to="Leisure Studio",
            created_by=self.user,
        )

        response = self.client.post(reverse("workflow-reminder-complete", args=[reminder.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, WorkflowReminder.Status.DONE)
        self.assertIsNotNone(reminder.completed_at)
