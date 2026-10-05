from django.contrib.auth.models import Group, User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Lead, PaymentRecord, Quote, QuoteLine


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
        "name": "Scoped Traveler",
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


class RecordScopingTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.other_consultant = make_user("consultant2", "crm_consultant")
        self.manager = make_user("manager", "crm_manager")
        self.own_lead = make_lead(owner=self.consultant, name="Own Lead")
        self.other_lead = make_lead(owner=self.other_consultant, name="Other Lead")
        self.unassigned_lead = make_lead(owner=None, name="Unassigned Lead")

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def lead_ids(self, response):
        return {item["id"] for item in response.data}

    def test_consultant_sees_own_and_unassigned_leads_only(self):
        self.authenticate(self.consultant)
        response = self.client.get(reverse("lead-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.lead_ids(response),
            {str(self.own_lead.id), str(self.unassigned_lead.id)},
        )

    def test_manager_sees_all_leads(self):
        self.authenticate(self.manager)
        response = self.client.get(reverse("lead-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.lead_ids(response),
            {str(self.own_lead.id), str(self.other_lead.id), str(self.unassigned_lead.id)},
        )

    def test_consultant_cannot_retrieve_lead_owned_by_someone_else(self):
        self.authenticate(self.consultant)
        response = self.client.get(reverse("lead-detail", args=[self.other_lead.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_consultant_scoping_applies_to_quotes_via_lead(self):
        own_quote = Quote.objects.create(lead=self.own_lead, quote_number="DPM-Q-OWN", version=1)
        other_quote = Quote.objects.create(lead=self.other_lead, quote_number="DPM-Q-OTHER", version=1)
        unassigned_quote = Quote.objects.create(lead=self.unassigned_lead, quote_number="DPM-Q-UNASSIGNED", version=1)

        self.authenticate(self.consultant)
        response = self.client.get(reverse("quote-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item["id"] for item in response.data}, {str(own_quote.id), str(unassigned_quote.id)})
        self.assertEqual(
            self.client.get(reverse("quote-detail", args=[other_quote.id])).status_code,
            status.HTTP_404_NOT_FOUND,
        )


class LeadAssignmentFilterTests(APITestCase):
    def setUp(self):
        self.manager = make_user("manager", "crm_manager")
        self.consultant = make_user("consultant", "crm_consultant")
        self.assigned = make_lead(owner=self.consultant, name="Assigned Lead")
        self.unassigned = make_lead(owner=None, name="Unassigned Lead")
        self.client.force_authenticate(self.manager)

    def test_assigned_to_filter(self):
        response = self.client.get(reverse("lead-list"), {"assigned_to": self.consultant.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [str(self.assigned.id)])
        self.assertEqual(response.data[0]["ownerId"], self.consultant.id)
        self.assertEqual(response.data[0]["ownerName"], "consultant")

    def test_unassigned_filter(self):
        response = self.client.get(reverse("lead-list"), {"unassigned": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [str(self.unassigned.id)])
        self.assertIsNone(response.data[0]["ownerId"])


class UnassignedAdvanceGateTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.client.force_authenticate(self.consultant)

    def test_unassigned_lead_cannot_advance_past_new_request(self):
        lead = make_lead(owner=None)

        response = self.client.post(reverse("lead-advance-workflow", args=[lead.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(response.data["canAdvance"])
        self.assertTrue(any("owner" in blocker["detail"].lower() for blocker in response.data["blockers"]))
        lead.refresh_from_db()
        self.assertEqual(lead.lifecycle_stage, Lead.LifecycleStage.NEW_REQUEST)

    def test_assigned_lead_can_advance_past_new_request(self):
        lead = make_lead(owner=self.consultant)

        response = self.client.post(reverse("lead-advance-workflow", args=[lead.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.lifecycle_stage, Lead.LifecycleStage.PENDING_INFORMATION)


class ActionPermissionTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.operations = make_user("operations", "crm_operations")
        self.finance = make_user("finance", "crm_finance")
        self.viewer = make_user("viewer", "crm_viewer")
        self.lead = make_lead(owner=self.consultant)
        self.quote = Quote.objects.create(lead=self.lead, quote_number="DPM-Q-ACT", version=1, status=Quote.Status.DRAFT)

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def send_quote(self):
        return self.client.patch(reverse("quote-detail", args=[self.quote.id]), {"status": Quote.Status.SENT}, format="json")

    def test_consultant_can_send_quote(self):
        self.authenticate(self.consultant)
        response = self.send_quote()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.quote.refresh_from_db()
        self.assertEqual(self.quote.status, Quote.Status.SENT)

    def test_operations_cannot_send_quote(self):
        self.authenticate(self.operations)
        response = self.send_quote()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.quote.refresh_from_db()
        self.assertEqual(self.quote.status, Quote.Status.DRAFT)

    def test_finance_cannot_send_quote(self):
        self.authenticate(self.finance)
        self.assertEqual(self.send_quote().status_code, status.HTTP_403_FORBIDDEN)

    def test_operations_cannot_create_payment_record(self):
        self.authenticate(self.operations)
        response = self.client.post(
            reverse("payment-record-list"),
            {"leadId": str(self.lead.id), "amountExpected": "100.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_consultant_can_create_payment_record(self):
        self.authenticate(self.consultant)
        response = self.client.post(
            reverse("payment-record-list"),
            {"leadId": str(self.lead.id), "amountExpected": "100.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_consultant_cannot_verify_payment(self):
        record = PaymentRecord.objects.create(lead=self.lead, amount_expected=100)
        self.authenticate(self.consultant)
        response = self.client.patch(
            reverse("payment-record-detail", args=[record.id]),
            {"status": PaymentRecord.Status.PAID},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        record.refresh_from_db()
        self.assertEqual(record.status, PaymentRecord.Status.PENDING)

    def test_finance_can_verify_payment(self):
        record = PaymentRecord.objects.create(lead=self.lead, amount_expected=100)
        self.authenticate(self.finance)
        response = self.client.patch(
            reverse("payment-record-detail", args=[record.id]),
            {"status": PaymentRecord.Status.PAID, "proofReceived": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record.refresh_from_db()
        self.assertEqual(record.status, PaymentRecord.Status.PAID)

    def test_viewer_cannot_advance_workflow(self):
        self.authenticate(self.viewer)
        response = self.client.post(reverse("lead-advance-workflow", args=[self.lead.id]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class FinancialFieldVisibilityTests(APITestCase):
    def setUp(self):
        self.consultant = make_user("consultant", "crm_consultant")
        self.viewer = make_user("viewer", "crm_viewer")
        self.auditor = make_user("auditor", "crm_auditor")
        self.lead = make_lead(owner=self.consultant)
        self.quote = Quote.objects.create(lead=self.lead, quote_number="DPM-Q-FIN", version=1)
        QuoteLine.objects.create(
            quote=self.quote,
            category=QuoteLine.Category.HOTEL,
            description="Hotel",
            quantity=1,
            unit_cost=100,
            unit_sell=150,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def test_viewer_does_not_see_costs_or_margins(self):
        self.authenticate(self.viewer)
        response = self.client.get(reverse("quote-detail", args=[self.quote.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("subtotalCost", response.data)
        self.assertNotIn("margin", response.data)
        self.assertIn("subtotalSell", response.data)
        line = response.data["lines"][0]
        for field in ("unitCost", "unitSell", "totalCost", "margin"):
            self.assertNotIn(field, line)
        self.assertIn("totalSell", line)

    def test_auditor_does_not_see_costs_or_margins(self):
        self.authenticate(self.auditor)
        response = self.client.get(reverse("quote-detail", args=[self.quote.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("subtotalCost", response.data)
        self.assertNotIn("unitCost", response.data["lines"][0])

    def test_consultant_sees_costs_and_margins(self):
        self.authenticate(self.consultant)
        response = self.client.get(reverse("quote-detail", args=[self.quote.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["subtotalCost"], "100.00")
        self.assertEqual(response.data["margin"], "50.00")
        self.assertEqual(response.data["lines"][0]["unitCost"], "100.00")


class AuthMeCapabilityTests(APITestCase):
    def test_auth_me_returns_roles_and_capabilities(self):
        user = make_user("finance", "crm_finance")
        self.client.force_authenticate(user)

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "finance")
        self.assertEqual(response.data["roles"], ["finance"])
        self.assertIn("payments.verify", response.data["capabilities"])
        self.assertIn("leads.view_all", response.data["capabilities"])
        self.assertNotIn("quotes.send", response.data["capabilities"])
        self.assertNotIn("users.admin", response.data["capabilities"])

    def test_legacy_agent_is_consultant_equivalent(self):
        user = make_user("legacy-agent", "crm_agent")
        self.client.force_authenticate(user)

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "agent")
        self.assertIn("consultant", response.data["roles"])
        self.assertIn("quotes.send", response.data["capabilities"])
        self.assertIn("leads.view_own", response.data["capabilities"])
