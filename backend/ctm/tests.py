from datetime import date
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from crm.models import AccommodationBlock, ItineraryStop, Lead, TransportSegment, TripItinerary

from .crm_handoff import sync_crm_lead_from_ctm_trip
from .models import CompanyAccount, CompanyUser, Traveler, TripApproval, TripQuote, TripRequest, TripTraveler


class BootstrapDockerDevTests(APITestCase):
    def test_bootstrap_docker_dev_creates_admin_company_and_ctm_admin(self):
        output = StringIO()

        call_command(
            "bootstrap_docker_dev",
            admin_username="dpm.test.admin",
            admin_email="admin@example.com",
            admin_password="admin-pass123",
            company_name="Example Corp",
            company_code="EXAMPLE",
            ctm_username="travel.admin",
            ctm_email="travel.admin@example.com",
            ctm_password="ctm-pass123",
            stdout=output,
        )

        admin_user = User.objects.get(username="dpm.test.admin")
        company = CompanyAccount.objects.get(account_code="EXAMPLE")
        membership = CompanyUser.objects.get(company=company, login_username="travel.admin")

        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.groups.filter(name="crm_admin").exists())
        self.assertEqual(company.name, "Example Corp")
        self.assertEqual(membership.role, CompanyUser.Role.COMPANY_ADMIN)
        self.assertTrue(membership.user.check_password("ctm-pass123"))
        self.assertIn("Docker development data is ready.", output.getvalue())


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

    def test_ops_user_with_ctm_company_context_only_lists_that_company_requests(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.get(reverse("ctm-trip-request-list"), HTTP_X_CTM_COMPANY_CODE=self.company_b.account_code)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [self.trip_b.reference_code])

    def test_ops_user_with_ctm_company_context_cannot_open_other_company_request(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.get(
            reverse("ctm-trip-request-detail", args=[self.trip_a.reference_code]),
            HTTP_X_CTM_COMPANY_CODE=self.company_b.account_code,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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

    def test_company_user_can_create_update_and_deactivate_unlinked_traveler(self):
        self.authenticate_company_user(self.company_user_a)

        create_response = self.client.post(
            reverse("ctm-traveler-list"),
            {
                "name": "Marta Uamusse",
                "email": "marta@example.com",
                "phone": "+258840000000",
                "department": "Finance",
                "nationality": "Mozambican",
                "passportNumber": "AB123456",
                "passportExpiry": "2028-10-12",
                "passportStatus": Traveler.PassportStatus.OK,
                "visaStatus": Traveler.VisaStatus.PENDING,
                "notes": "Needs Schengen support.",
                "isActive": True,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["name"], "Marta Uamusse")
        self.assertEqual(create_response.data["passportNumber"], "AB123456")
        self.assertEqual(create_response.data["passportStatus"], "OK")
        self.assertEqual(create_response.data["visaStatus"], "Pending")

        traveler_id = create_response.data["id"]
        update_response = self.client.patch(
            reverse("ctm-traveler-detail", args=[traveler_id]),
            {"phone": "+258850000000", "passportStatus": Traveler.PassportStatus.EXPIRED},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["phone"], "+258850000000")
        self.assertEqual(update_response.data["passportStatus"], "Expired")

        deactivate_response = self.client.delete(reverse("ctm-traveler-detail", args=[traveler_id]))

        self.assertEqual(deactivate_response.status_code, status.HTTP_204_NO_CONTENT)
        traveler = Traveler.objects.get(pk=traveler_id)
        self.assertFalse(traveler.is_active)

    def test_deactivate_linked_traveler_preserves_trip_history(self):
        self.authenticate_company_user(self.company_user_a)
        traveler = Traveler.objects.create(company=self.company_a, full_name="Linked Traveler", is_active=True)
        TripTraveler.objects.create(trip_request=self.trip_a, traveler=traveler)

        response = self.client.delete(reverse("ctm-traveler-detail", args=[traveler.pk]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        traveler.refresh_from_db()
        self.assertFalse(traveler.is_active)
        self.assertTrue(TripTraveler.objects.filter(trip_request=self.trip_a, traveler=traveler).exists())

    def test_final_cost_approval_is_locked_until_travel_need_and_sent_quote_are_ready(self):
        self.company_user_b.role = CompanyUser.Role.FINANCE_APPROVER
        self.company_user_b.access_roles = [CompanyUser.Role.FINANCE_APPROVER]
        self.company_user_b.save()
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.TRAVEL_NEED,
            status=TripApproval.Status.PENDING,
        )
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.FINAL_COST,
            status=TripApproval.Status.PENDING,
        )
        self.authenticate_company_user(self.company_user_b)

        detail_response = self.client.get(reverse("ctm-trip-request-detail", args=[self.trip_b.reference_code]))
        final_cost = next(item for item in detail_response.data["approvals"] if item["stage"] == "Final cost")
        self.assertFalse(final_cost["canApprove"])
        self.assertEqual(final_cost["blocker"], "Travel need approval must be completed before final cost approval.")

        approve_response = self.client.post(
            reverse("ctm-trip-request-approve", args=[self.trip_b.reference_code]),
            {"stage": "Final cost"},
            format="json",
        )

        self.assertEqual(approve_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(approve_response.data["detail"], "Travel need approval must be completed before final cost approval.")

    def test_final_cost_approval_requires_sent_quote(self):
        self.company_user_b.role = CompanyUser.Role.FINANCE_APPROVER
        self.company_user_b.access_roles = [CompanyUser.Role.FINANCE_APPROVER]
        self.company_user_b.save()
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.TRAVEL_NEED,
            status=TripApproval.Status.APPROVED,
        )
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.FINAL_COST,
            status=TripApproval.Status.PENDING,
        )
        TripQuote.objects.create(
            trip_request=self.trip_b,
            prepared_by=self.ops_user,
            amount="2400.00",
            currency="USD",
            status=TripQuote.Status.DRAFT,
        )
        self.authenticate_company_user(self.company_user_b)

        approve_response = self.client.post(
            reverse("ctm-trip-request-approve", args=[self.trip_b.reference_code]),
            {"stage": "Final cost"},
            format="json",
        )

        self.assertEqual(approve_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(approve_response.data["detail"], "DPM quote must be sent before final cost approval.")

    def test_trip_request_exposes_canonical_workflow_from_ctm_request(self):
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.TRAVEL_NEED,
            status=TripApproval.Status.APPROVED,
        )
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.FINAL_COST,
            status=TripApproval.Status.PENDING,
        )
        TripQuote.objects.create(
            trip_request=self.trip_b,
            prepared_by=self.ops_user,
            amount="2400.00",
            currency="USD",
            status=TripQuote.Status.SENT,
            valid_until=date(2026, 9, 10),
        )
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.get(reverse("ctm-trip-request-detail", args=[self.trip_b.reference_code]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["workflow"]["currentStage"], "quote_approval")
        self.assertEqual(response.data["workflow"]["currentStageLabel"], "Quote approval")
        self.assertTrue(response.data["workflow"]["progress"] > 0)
        self.assertEqual(
            [stage["id"] for stage in response.data["workflow"]["stages"]],
            [
                "request_received",
                "travel_need",
                "briefing",
                "briefing_approval",
                "trip_design",
                "quote_build",
                "quote_approval",
                "booking",
                "documents",
                "execution",
            ],
        )

    def test_final_cost_approval_succeeds_after_travel_need_and_sent_quote(self):
        self.company_user_b.role = CompanyUser.Role.FINANCE_APPROVER
        self.company_user_b.access_roles = [CompanyUser.Role.FINANCE_APPROVER]
        self.company_user_b.save()
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.TRAVEL_NEED,
            status=TripApproval.Status.APPROVED,
        )
        TripApproval.objects.create(
            trip_request=self.trip_b,
            approval_type=TripApproval.ApprovalType.FINAL_COST,
            status=TripApproval.Status.PENDING,
        )
        TripQuote.objects.create(
            trip_request=self.trip_b,
            prepared_by=self.ops_user,
            amount="2400.00",
            currency="USD",
            status=TripQuote.Status.SENT,
            valid_until=date(2026, 9, 10),
        )
        self.authenticate_company_user(self.company_user_b)

        approve_response = self.client.post(
            reverse("ctm-trip-request-approve", args=[self.trip_b.reference_code]),
            {"stage": "Final cost"},
            format="json",
        )

        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        final_cost = next(item for item in approve_response.data["approvals"] if item["stage"] == "Final cost")
        self.assertEqual(final_cost["status"], "Approved")

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

    def test_trip_request_exposes_read_only_crm_itinerary_draft(self):
        lead = sync_crm_lead_from_ctm_trip(self.trip_a)
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Executive Maputo to Lisbon draft",
            status=TripItinerary.Status.DRAFT,
            start_date=date(2026, 9, 12),
            end_date=date(2026, 9, 18),
            notes="Drafted by DPM after briefing approval.",
        )
        stop = ItineraryStop.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            city="Lisbon",
            country="Portugal",
            arrival_date=date(2026, 9, 12),
            departure_date=date(2026, 9, 18),
            nights=6,
            purpose=ItineraryStop.Purpose.BUSINESS,
            notes="Meetings near Avenida da Liberdade.",
        )
        AccommodationBlock.objects.create(
            stop=stop,
            name="Lisbon Business Hotel",
            room_type="Executive king",
            check_in=date(2026, 9, 12),
            check_out=date(2026, 9, 18),
            rooms=2,
            supplier="DPM hotel desk",
            booking_status=AccommodationBlock.BookingStatus.QUOTED,
        )
        TransportSegment.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            mode=TransportSegment.Mode.FLIGHT,
            from_city="Maputo",
            to_city="Lisbon",
            booking_status=TransportSegment.BookingStatus.DRAFT,
        )
        self.authenticate_company_user(self.company_user_a)

        response = self.client.get(reverse("ctm-trip-request-detail", args=[self.trip_a.reference_code]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["itineraryDraft"]["title"], "Executive Maputo to Lisbon draft")
        self.assertEqual(response.data["itineraryDraft"]["stops"][0]["city"], "Lisbon")
        self.assertEqual(response.data["itineraryDraft"]["stops"][0]["accommodations"][0]["name"], "Lisbon Business Hotel")
        self.assertEqual(response.data["itineraryDraft"]["transports"][0]["fromCity"], "Maputo")

    def test_ops_user_can_create_company_account(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.post(
            reverse("ctm-company-account-list"),
            {
                "name": "Nova Energy",
                "legalName": "Nova Energy SA",
                "industry": "Energy",
                "country": "Mozambique",
                "billingEmail": "finance@nova.example",
                "defaultCurrency": "usd",
                "serviceLevel": CompanyAccount.ServiceLevel.PRESTIGE_CORPORATE,
                "status": CompanyAccount.Status.ACTIVE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        company = CompanyAccount.objects.get(name="Nova Energy")
        self.assertEqual(company.default_currency, "USD")
        self.assertEqual(company.account_code, "NOVAENERGY")
        self.assertEqual(response.data["accountCode"], "NOVAENERGY")
        self.assertEqual(response.data["legalName"], "Nova Energy SA")

    def test_ops_user_can_create_ctm_user_for_selected_company(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        response = self.client.post(
            reverse("ctm-company-user-list"),
            {
                "companyId": str(self.company_b.id),
                "username": "finance-global",
                "email": "finance@global.example",
                "firstName": "Finance",
                "lastName": "Approver",
                "password": "pass12345",
                "accessRoles": [CompanyUser.Role.TRAVEL_COORDINATOR, CompanyUser.Role.FINANCE_APPROVER],
                "department": "Finance",
                "jobTitle": "Finance Controller",
                "isActive": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        company_user = CompanyUser.objects.get(login_username="finance-global")
        self.assertEqual(company_user.company, self.company_b)
        self.assertEqual(company_user.role, CompanyUser.Role.FINANCE_APPROVER)
        self.assertEqual(company_user.access_roles, [CompanyUser.Role.TRAVEL_COORDINATOR, CompanyUser.Role.FINANCE_APPROVER])
        self.assertEqual(response.data["companyId"], str(self.company_b.id))
        self.assertEqual(response.data["companyName"], "Global Mining")
        self.assertEqual(response.data["username"], "finance-global")

    def test_ops_user_can_create_same_login_username_for_different_companies(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        for company in (self.company_a, self.company_b):
            response = self.client.post(
                reverse("ctm-company-user-list"),
                {
                    "companyId": str(company.id),
                    "username": "travel.manager",
                    "email": f"travel.manager@{company.account_code.lower()}.example",
                    "password": "pass12345",
                    "accessRoles": [CompanyUser.Role.COMPANY_ADMIN, CompanyUser.Role.FINANCE_APPROVER],
                    "isActive": True,
                },
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(CompanyUser.objects.filter(login_username="travel.manager").count(), 2)

    def test_ops_user_can_reuse_email_across_company_users(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)

        for index, company in enumerate((self.company_a, self.company_b), start=1):
            response = self.client.post(
                reverse("ctm-company-user-list"),
                {
                    "companyId": str(company.id),
                    "username": f"shared-email-{index}",
                    "email": "travel.desk@example.com",
                    "password": "pass12345",
                    "accessRoles": [CompanyUser.Role.TRAVEL_COORDINATOR],
                    "isActive": True,
                },
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(CompanyUser.objects.filter(user__email="travel.desk@example.com").count(), 2)

    def test_ctm_login_by_duplicate_email_uses_matching_password_account(self):
        first_user = User.objects.create_user(username="shared-email-a", password="first-pass", email="shared@example.com")
        second_user = User.objects.create_user(username="shared-email-b", password="second-pass", email="shared@example.com")
        CompanyUser.objects.create(
            company=self.company_a,
            user=first_user,
            login_username="shared-email-a",
            role=CompanyUser.Role.TRAVEL_COORDINATOR,
            access_roles=[CompanyUser.Role.TRAVEL_COORDINATOR],
            is_active=True,
        )
        CompanyUser.objects.create(
            company=self.company_b,
            user=second_user,
            login_username="shared-email-b",
            role=CompanyUser.Role.COMPANY_ADMIN,
            access_roles=[CompanyUser.Role.COMPANY_ADMIN],
            is_active=True,
        )

        response = self.client.post(
            reverse("ctm-auth-login"),
            {"username": "shared@example.com", "password": "second-pass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"]["accountCode"], self.company_b.account_code)
        self.assertEqual(response.data["user"]["companyId"], str(self.company_b.id))

    def test_ctm_login_uses_company_code_for_scoped_username(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.ops_auth)
        create_response = self.client.post(
            reverse("ctm-company-user-list"),
            {
                "companyId": str(self.company_b.id),
                "username": "travel.manager",
                "email": "manager@global.example",
                "password": "pass12345",
                "accessRoles": [CompanyUser.Role.COMPANY_ADMIN],
                "isActive": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.client.credentials()

        response = self.client.post(
            reverse("ctm-auth-login"),
            {"companyCode": self.company_b.account_code, "username": "travel.manager", "password": "pass12345"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"]["accountCode"], self.company_b.account_code)
        self.assertEqual(response.data["user"]["companyId"], str(self.company_b.id))

    def test_company_admin_can_log_into_another_company_workspace(self):
        admin_user = User.objects.create_user(username="global-admin", password="pass12345", email="global.admin@example.com")
        CompanyUser.objects.create(
            company=self.company_a,
            user=admin_user,
            login_username="global-admin",
            role=CompanyUser.Role.COMPANY_ADMIN,
            access_roles=[CompanyUser.Role.COMPANY_ADMIN],
            is_active=True,
        )

        response = self.client.post(
            reverse("ctm-auth-login"),
            {"companyCode": self.company_b.account_code, "username": "global-admin", "password": "pass12345"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"]["accountCode"], self.company_b.account_code)
        self.assertEqual(response.data["user"]["companyId"], str(self.company_b.id))
        self.assertTrue(CompanyUser.objects.filter(company=self.company_b, user=admin_user, role=CompanyUser.Role.COMPANY_ADMIN).exists())

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        list_response = self.client.get(reverse("ctm-trip-request-list"), HTTP_X_CTM_COMPANY_CODE=self.company_b.account_code)

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in list_response.data], [self.trip_b.reference_code])
