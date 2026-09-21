import uuid
from io import StringIO
from unittest.mock import patch

from django.contrib.auth.models import Group, User
from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Lead


class ReviewRegressionTests(APITestCase):
    def test_public_submission_ignores_internal_fields_and_returns_only_receipt(self):
        response = self.client.post(reverse("public-leads"), {
            "service": "Leisure", "serviceKey": "classic", "name": "Traveler",
            "email": "test@example.com", "internalNotes": "Injected", "lifecycleStage": "confirmed",
            "status": "won", "emailStatus": "sent", "ctmRequestId": "SECRET", "priority": "urgent",
            "companyAccountId": str(uuid.uuid4()), "clientId": str(uuid.uuid4()),
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(set(response.data), {"id", "received"})
        lead = Lead.objects.get(pk=response.data["id"])
        self.assertEqual((lead.status, lead.lifecycle_stage, lead.email_status), ("new", "new_request", "pending"))
        self.assertEqual((lead.internal_notes, lead.ctm_request_reference, lead.priority), ("", "", "normal"))
        self.assertIsNone(lead.company_account_id)
        self.assertIsNone(lead.client_id)

    def test_retry_deduplicates_and_conflicting_reuse_fails(self):
        payload = {"service": "Leisure", "serviceKey": "classic", "name": "Traveler", "email": "test@example.com", "submissionId": str(uuid.uuid4())}
        first = self.client.post(reverse("public-leads"), payload, format="json")
        second = self.client.post(reverse("public-leads"), payload, format="json")
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.data, second.data)
        self.assertEqual(Lead.objects.count(), 1)
        payload["name"] = "Changed"
        self.assertEqual(self.client.post(reverse("public-leads"), payload, format="json").status_code, 409)

    def test_public_submission_requires_contact(self):
        response = self.client.post(reverse("public-leads"), {"service": "Leisure", "serviceKey": "classic", "name": "Traveler"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Lead.objects.exists())

    def authenticate(self, role):
        user = User.objects.create_user(username=role)
        group, _ = Group.objects.get_or_create(name=f"crm_{role}")
        user.groups.add(group)
        self.client.force_authenticate(user)

    def test_viewer_can_read_but_cannot_mutate(self):
        self.authenticate("viewer")
        lead = Lead.objects.create(service="Leisure", service_key="classic", name="Original")
        detail = reverse("lead-detail", args=[lead.pk])
        self.assertEqual(self.client.get(detail).status_code, 200)
        self.assertEqual(self.client.patch(detail, {"name": "Changed"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(detail).status_code, 403)
        self.assertEqual(self.client.post(reverse("lead-list"), {}, format="json").status_code, 403)
        lead.refresh_from_db()
        self.assertEqual(lead.name, "Original")

    def test_generic_patch_cannot_skip_workflow_gates(self):
        self.authenticate("agent")
        lead = Lead.objects.create(service="Leisure", service_key="classic", name="Original")
        response = self.client.patch(reverse("lead-detail", args=[lead.pk]), {"status": "execution", "lifecycleStage": "confirmed"}, format="json")
        self.assertEqual(response.status_code, 400)
        lead.refresh_from_db()
        self.assertEqual(lead.lifecycle_stage, "new_request")

    def test_closed_workflow_is_terminal(self):
        from .workflow import workflow_for_lead
        lead = Lead.objects.create(service="Leisure", service_key="classic", name="Closed", status="lost", lifecycle_stage="closed")
        state = workflow_for_lead(lead)
        self.assertEqual(state["currentStage"], "closed")
        self.assertFalse(state["canAdvance"])
        self.assertIsNone(state["nextStage"])

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", DPM_INQUIRY_NOTIFICATION_EMAIL="desk@example.com")
    def test_failed_notification_retries_without_creating_another_lead(self):
        lead = Lead.objects.create(service="Leisure", service_key="classic", name="Traveler", submission_id=uuid.uuid4())
        with patch("crm.management.commands.send_inquiry_notifications.send_mail", side_effect=RuntimeError("offline")):
            call_command("send_inquiry_notifications", stdout=StringIO(), stderr=StringIO())
        lead.refresh_from_db()
        self.assertEqual(lead.email_status, "failed")
        call_command("send_inquiry_notifications", stdout=StringIO())
        lead.refresh_from_db()
        self.assertEqual(lead.email_status, "sent")
        self.assertEqual(len(mail.outbox), 1)
        call_command("send_inquiry_notifications", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(Lead.objects.count(), 1)
