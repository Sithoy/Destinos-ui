from datetime import date

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from crm.models import Lead

from .crm_handoff import sync_crm_lead_from_ctm_trip
from .models import CompanyAccount, CompanyUser, TripQuote, TripRequest


class CtmOpsScopeTests(APITestCase):
    def setUp(self):
        self.ops_user = User.objects.create_user(username="ops", password="pass", is_staff=True)
        ops_token, _ = Token.objects.get_or_create(user=self.ops_user)
        self.ops_auth = f"Token {ops_token.key}"

        self.company_a = CompanyAccount.objects.create(name="Acme Travel")
        self.company_b = CompanyAccount.objects.create(name="Global Mining")
        self.company_user_a = self.make_company_user("coordinator-a", self.company_a)
        self.company_user_b = self.make_company_user("coordinator-b", self.company_b)
        self.trip_a = self.make_trip(self.company_a, self.company_user_a, "Maputo", "Lisbon")
        self.trip_b = self.make_trip(self.company_b, self.company_user_b, "Maputo", "Dubai")

    def make_company_user(self, username, company):
        user = User.objects.create_user(username=username, password="pass")
        return CompanyUser.objects.create(
            company=company,
            user=user,
            role=CompanyUser.Role.TRAVEL_COORDINATOR,
            department="Operations",
            is_active=True,
        )

    def make_trip(self, company, requested_by, origin, destination):
        return TripRequest.objects.create(
            company=company,
            requested_by=requested_by,
            department="Operations",
            origin=origin,
            destination=destination,
            departure_date=date(2026, 8, 10),
            purpose="Corporate movement",
            budget_band="1k_5k",
            status=TripRequest.Status.APPROVED,
        )

    def authenticate_company_user(self, company_user):
        token, _ = Token.objects.get_or_create(user=company_user.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_ops_user_can_list_trip_requests_across_companies(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.get(reverse("ctm-trip-request-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item["id"] for item in response.data}, {self.trip_a.reference_code, self.trip_b.reference_code})

    def test_company_user_only_lists_own_company_trip_requests(self):
        self.authenticate_company_user(self.company_user_a)

        response = self.client.get(reverse("ctm-trip-request-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [self.trip_a.reference_code])

    def test_ops_user_can_create_quote_for_another_company_trip(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.post(
            reverse("ctm-trip-quote", args=[self.trip_b.reference_code]),
            {"amount": "2400.00", "currency": "USD", "status": TripQuote.Status.SENT, "notes": "Shared from CRM."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["tripRequestId"], self.trip_b.reference_code)
        self.assertTrue(TripQuote.objects.filter(trip_request=self.trip_b, prepared_by=self.ops_user).exists())

    def test_ctm_request_creation_creates_crm_corporate_lead(self):
        self.company_user_a.user.email = "coordinator@acme.example"
        self.company_user_a.user.first_name = "Ana"
        self.company_user_a.user.last_name = "Mabunda"
        self.company_user_a.user.save()
        self.authenticate_company_user(self.company_user_a)

        response = self.client.post(
            reverse("ctm-trip-request-list"),
            {
                "department": "Finance",
                "origin": "Maputo",
                "destination": "Lisbon",
                "departureDate": "2026-09-12",
                "purpose": "Quarterly planning meetings",
                "budgetBand": "1k_5k",
                "services": ["Flight", "Hotel"],
                "travelers": [
                    {"name": "Ana Mabunda", "email": "ana@example.com", "department": "Finance"},
                    {"name": "Luis Macamo", "email": "luis@example.com", "department": "Finance"},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lead = Lead.objects.get(ctm_request_reference=response.data["id"])
        self.assertEqual(lead.service_key, Lead.ServiceKey.CORPORATE)
        self.assertEqual(lead.company_account, self.company_a)
        self.assertEqual(lead.name, self.company_a.name)
        self.assertEqual(lead.contact, "Ana Mabunda")
        self.assertEqual(lead.email, "coordinator@acme.example")
        self.assertEqual(lead.departure_city, "Maputo")
        self.assertEqual(lead.destination, "Lisbon")
        self.assertEqual(lead.travelers, "2 travelers")
        self.assertIn("Flight", lead.requested_services)
        self.assertIn("Hotel", lead.requested_services)

    def test_ctm_to_crm_handoff_is_idempotent(self):
        first_lead = sync_crm_lead_from_ctm_trip(self.trip_a)
        self.trip_a.destination = "Porto"
        self.trip_a.save(update_fields=["destination", "updated_at"])

        second_lead = sync_crm_lead_from_ctm_trip(self.trip_a)

        self.assertEqual(first_lead.id, second_lead.id)
        self.assertEqual(Lead.objects.filter(ctm_request_reference=self.trip_a.reference_code).count(), 1)
        first_lead.refresh_from_db()
        self.assertEqual(first_lead.destination, "Porto")
