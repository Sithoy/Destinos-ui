from datetime import timedelta

from django.contrib.auth.models import Group, User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from ctm.models import CompanyAccount

from .models import AccommodationBlock, ItineraryStop, Lead, Quote, TransportSegment, TripItinerary, WorkflowReminder


class CrmAuthTests(APITestCase):
    def test_login_by_duplicate_email_uses_matching_crm_account(self):
        group, _ = Group.objects.get_or_create(name="crm_agent")
        crm_user = User.objects.create_user(username="crm-agent", email="shared@example.com", password="crm-pass")
        crm_user.groups.add(group)
        User.objects.create_user(username="ctm-user", email="shared@example.com", password="ctm-pass")

        response = self.client.post(
            reverse("auth-login"),
            {"username": "shared@example.com", "password": "crm-pass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "crm-agent")


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

    def test_lead_can_store_linked_ctm_request_reference(self):
        lead = self.make_lead(
            service="Prestige Corporate Form",
            service_key=Lead.ServiceKey.CORPORATE,
        )

        response = self.client.patch(reverse("lead-detail", args=[lead.id]), {"ctmRequestId": "DPM-2401"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ctmRequestId"], "DPM-2401")
        lead.refresh_from_db()
        self.assertEqual(lead.ctm_request_reference, "DPM-2401")

    def test_corporate_lead_can_store_company_account(self):
        company = CompanyAccount.objects.create(name="Acme Mining", legal_name="Acme Mining SA")
        lead = self.make_lead(
            service="Prestige Corporate Form",
            service_key=Lead.ServiceKey.CORPORATE,
        )

        response = self.client.patch(reverse("lead-detail", args=[lead.id]), {"companyAccountId": str(company.id)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["companyAccountId"]), str(company.id))
        self.assertEqual(response.data["companyAccountName"], "Acme Mining")
        lead.refresh_from_db()
        self.assertEqual(lead.company_account, company)

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

    def test_generate_workflow_reminders_can_target_one_lead(self):
        blocked_lead = self.make_lead(
            lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS,
            status=Lead.Status.PLANNING,
            name="Blocked Traveler",
        )
        self.make_lead(name="Ready Traveler")

        response = self.client.post(reverse("workflow-reminder-generate"), {"leadId": str(blocked_lead.id)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(response.data["created"], 1)
        self.assertEqual(len(response.data["reminders"]), response.data["created"])
        self.assertEqual(WorkflowReminder.objects.exclude(lead=blocked_lead).count(), 0)

        second_response = self.client.post(reverse("workflow-reminder-generate"), {"leadId": str(blocked_lead.id)}, format="json")

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["created"], 0)
        self.assertGreaterEqual(len(second_response.data["reminders"]), 1)

    def test_trip_itinerary_rejects_end_before_start(self):
        lead = self.make_lead()

        response = self.client.post(
            reverse("trip-itinerary-list"),
            {
                "leadId": str(lead.id),
                "title": "Portugal family trip",
                "startDate": "2026-06-10",
                "endDate": "2026-06-09",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("endDate", response.data)

    def test_trip_itinerary_rejects_dates_before_current_date(self):
        lead = self.make_lead()
        yesterday = timezone.localdate() - timedelta(days=1)
        tomorrow = timezone.localdate() + timedelta(days=1)

        response = self.client.post(
            reverse("trip-itinerary-list"),
            {
                "leadId": str(lead.id),
                "title": "Past trip",
                "startDate": yesterday.isoformat(),
                "endDate": tomorrow.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("startDate", response.data)

    def test_itinerary_stop_must_stay_inside_trip_dates(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date="2026-06-10",
            end_date="2026-06-20",
        )

        response = self.client.post(
            reverse("itinerary-stop-list"),
            {
                "itineraryId": str(itinerary.id),
                "sequenceNumber": 1,
                "city": "Lisbon",
                "arrivalDate": "2026-06-09",
                "departureDate": "2026-06-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("arrivalDate", response.data)

    def test_dated_stop_requires_trip_date_range(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Undated trip",
        )
        tomorrow = timezone.localdate() + timedelta(days=1)

        response = self.client.post(
            reverse("itinerary-stop-list"),
            {
                "itineraryId": str(itinerary.id),
                "sequenceNumber": 1,
                "city": "Lisbon",
                "arrivalDate": tomorrow.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("arrivalDate", response.data)

    def test_accommodation_must_stay_inside_stop_dates(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date="2026-06-10",
            end_date="2026-06-20",
        )
        stop = ItineraryStop.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            city="Lisbon",
            arrival_date="2026-06-10",
            departure_date="2026-06-14",
        )

        response = self.client.post(
            reverse("accommodation-block-list"),
            {
                "stopId": str(stop.id),
                "name": "Lisbon Hotel",
                "checkIn": "2026-06-10",
                "checkOut": "2026-06-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("checkOut", response.data)

    def test_dated_accommodation_requires_stop_date_range(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date=timezone.localdate() + timedelta(days=1),
            end_date=timezone.localdate() + timedelta(days=5),
        )
        stop = ItineraryStop.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            city="Lisbon",
        )

        response = self.client.post(
            reverse("accommodation-block-list"),
            {
                "stopId": str(stop.id),
                "name": "Lisbon Hotel",
                "checkIn": (timezone.localdate() + timedelta(days=2)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("checkIn", response.data)

    def test_transport_arrival_cannot_be_before_departure(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date="2026-06-10",
            end_date="2026-06-20",
        )

        response = self.client.post(
            reverse("transport-segment-list"),
            {
                "itineraryId": str(itinerary.id),
                "sequenceNumber": 1,
                "mode": "flight",
                "fromCity": "Lisbon",
                "toCity": "Porto",
                "departureAt": "2026-06-12T15:00:00Z",
                "arrivalAt": "2026-06-12T12:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("arrivalAt", response.data)

    def test_dated_transport_requires_trip_date_range(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Undated trip",
        )
        tomorrow = timezone.localdate() + timedelta(days=1)

        response = self.client.post(
            reverse("transport-segment-list"),
            {
                "itineraryId": str(itinerary.id),
                "sequenceNumber": 1,
                "mode": "flight",
                "fromCity": "Lisbon",
                "toCity": "Porto",
                "departureAt": f"{tomorrow.isoformat()}T15:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("departureAt", response.data)

    def test_itinerary_update_cannot_exclude_existing_stop_or_transport(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date="2026-06-10",
            end_date="2026-06-20",
        )
        stop = ItineraryStop.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            city="Lisbon",
            arrival_date="2026-06-10",
            departure_date="2026-06-14",
        )
        TransportSegment.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            mode="flight",
            from_city="Lisbon",
            to_city="Porto",
            departure_at="2026-06-12T10:00:00Z",
            arrival_at="2026-06-12T12:00:00Z",
        )

        response = self.client.patch(reverse("trip-itinerary-detail", args=[itinerary.id]), {"endDate": "2026-06-11"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("endDate", response.data)

    def test_stop_update_cannot_exclude_existing_accommodation(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date="2026-06-10",
            end_date="2026-06-20",
        )
        stop = ItineraryStop.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            city="Lisbon",
            arrival_date="2026-06-10",
            departure_date="2026-06-14",
        )
        AccommodationBlock.objects.create(
            stop=stop,
            name="Lisbon Hotel",
            check_in="2026-06-10",
            check_out="2026-06-14",
        )

        response = self.client.patch(reverse("itinerary-stop-detail", args=[stop.id]), {"departureDate": "2026-06-13"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("departureDate", response.data)

    def test_experience_dates_are_not_restricted_yet(self):
        lead = self.make_lead()
        itinerary = TripItinerary.objects.create(
            lead=lead,
            title="Portugal family trip",
            start_date="2026-06-10",
            end_date="2026-06-20",
        )
        stop = ItineraryStop.objects.create(
            itinerary=itinerary,
            sequence_number=1,
            city="Lisbon",
            arrival_date="2026-06-10",
            departure_date="2026-06-14",
        )

        response = self.client.post(
            reverse("experience-block-list"),
            {
                "stopId": str(stop.id),
                "title": "Fado dinner",
                "category": "Dining",
                "startAt": "2026-06-15T20:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
