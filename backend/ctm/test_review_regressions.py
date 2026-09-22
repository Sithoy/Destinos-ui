from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import CompanyAccount, CompanyUser, Traveler, TripApproval, TripBooking, TripInvoice, TripPayment, TripQuote, TripRequest


class ReviewRegressionTests(APITestCase):
    def setUp(self):
        self.company = CompanyAccount.objects.create(name="Tenant A", account_code="TENANTA")
        self.other = CompanyAccount.objects.create(name="Tenant B", account_code="TENANTB")
        self.user = User.objects.create_user(username="tenant-admin", password="pass")
        self.member = CompanyUser.objects.create(company=self.company, user=self.user, role="company_admin", access_roles=["company_admin"])
        self.client.force_authenticate(self.user)
        self.trip = TripRequest.objects.create(company=self.company, requested_by=self.member, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30))

    def test_unknown_or_other_company_context_fails_closed(self):
        for code in ["TENANTB", "NOTREAL"]:
            response = self.client.get(reverse("ctm-trip-request-list"), HTTP_X_CTM_COMPANY_CODE=code)
            self.assertEqual(response.status_code, 403)
        self.assertFalse(CompanyUser.objects.filter(user=self.user, company=self.other).exists())

    def test_trip_cannot_be_deleted(self):
        response = self.client.delete(reverse("ctm-trip-request-detail", args=[self.trip.reference_code]))
        self.assertEqual(response.status_code, 405)
        self.assertTrue(TripRequest.objects.filter(pk=self.trip.pk).exists())

    def test_company_user_destroy_requires_company_admin(self):
        target_user = User.objects.create_user(username="target-employee", password="pass")
        target = CompanyUser.objects.create(company=self.company, user=target_user, role="employee", access_roles=["employee"])
        url = reverse("ctm-company-user-detail", args=[target.pk])
        manager_user = User.objects.create_user(username="tenant-manager", password="pass")
        CompanyUser.objects.create(company=self.company, user=manager_user, role="manager", access_roles=["manager"])
        self.client.force_authenticate(manager_user)
        response = self.client.delete(url, HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 403)
        self.assertTrue(CompanyUser.objects.filter(pk=target.pk).exists())
        self.client.force_authenticate(self.user)
        response = self.client.delete(url, HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(CompanyUser.objects.filter(pk=target.pk).exists())

    def payload(self):
        return {"department": "Operations", "origin": "Maputo", "destination": "Lisbon", "departureDate": (timezone.localdate() + timedelta(days=30)).isoformat(), "purpose": "Meeting", "budgetBand": "lt1k", "services": ["Flight"], "travelers": [{"name": "New traveler", "email": "test@example.com", "department": "Operations"}]}

    def test_new_traveler_is_unverified_and_final_cost_is_pending(self):
        response = self.client.post(reverse("ctm-trip-request-list"), self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        trip = TripRequest.objects.get(reference_code=response.data["id"])
        traveler = trip.trip_travelers.get()
        self.assertEqual(traveler.traveler.passport_status, "missing")
        self.assertEqual(traveler.traveler.visa_status, "unknown")
        self.assertNotEqual(traveler.document_status, "ready")
        self.assertIsNone(trip.quoted_cost)
        self.assertEqual(trip.approvals.get(approval_type=TripApproval.ApprovalType.FINAL_COST).status, "pending")

    def test_saved_profile_is_reused_and_cross_company_profile_is_rejected(self):
        traveler = Traveler.objects.create(company=self.company, full_name="Saved", passport_status="expired", visa_status="pending")
        payload = self.payload()
        payload["travelers"][0]["profileId"] = str(traveler.pk)
        response = self.client.post(reverse("ctm-trip-request-list"), payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Traveler.objects.count(), 1)
        trip = TripRequest.objects.get(reference_code=response.data["id"])
        self.assertEqual(trip.trip_travelers.get().traveler_id, traveler.pk)
        foreign = Traveler.objects.create(company=self.other, full_name="Other")
        payload["travelers"][0]["profileId"] = str(foreign.pk)
        count = TripRequest.objects.count()
        self.assertEqual(self.client.post(reverse("ctm-trip-request-list"), payload, format="json").status_code, 400)
        self.assertEqual(TripRequest.objects.count(), count)

    def test_booking_confirmation_requires_approval_and_matching_cost(self):
        ops = User.objects.create_user(username="ops", is_staff=True)
        self.client.force_authenticate(ops)
        url = reverse("ctm-trip-booking", args=[self.trip.reference_code])
        payload = {"bookingReference": "TEST123", "totalCost": "100", "currency": "USD", "status": "confirmed"}
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        self.assertFalse(TripBooking.objects.exists())
        for stage in [TripApproval.ApprovalType.TRAVEL_NEED, TripApproval.ApprovalType.FINAL_COST]:
            TripApproval.objects.create(trip_request=self.trip, approval_type=stage, status="approved")
        TripQuote.objects.create(trip_request=self.trip, amount=100, currency="USD", status="sent", valid_until=timezone.localdate() + timedelta(days=10))
        payload["totalCost"] = "200"
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        payload["totalCost"] = "100"
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 201)

    def test_billing_keeps_currencies_separate_and_excludes_drafts(self):
        other_trip = TripRequest.objects.create(company=self.company, requested_by=self.member, origin="Maputo", destination="London", departure_date=timezone.localdate())
        invoice = TripInvoice.objects.create(trip_request=self.trip, amount=Decimal("100"), currency="USD", status="sent")
        TripInvoice.objects.create(trip_request=other_trip, amount=Decimal("200"), currency="EUR", status="sent")
        TripPayment.objects.create(invoice=invoice, amount=Decimal("25"), currency="USD", status="received")
        response = self.client.get('/api/ctm/reports/billing/summary/')
        self.assertEqual(response.status_code, 200, response.data)
        totals = {item["currency"]: item for item in response.data["totalsByCurrency"]}
        self.assertEqual(totals["USD"]["outstandingBalance"], 75)
        self.assertEqual(totals["EUR"]["outstandingBalance"], 200)
        invoice.status = "draft"
        invoice.save()
        response = self.client.get('/api/ctm/reports/billing/summary/')
        totals = {item["currency"]: item for item in response.data["totalsByCurrency"]}
        self.assertEqual(totals["USD"]["totalInvoiced"], 0)

    def test_payment_must_be_positive_and_match_invoice_currency(self):
        TripInvoice.objects.create(trip_request=self.trip, amount=100, currency="USD", status="sent")
        ops = User.objects.create_user(username="ops", is_staff=True)
        self.client.force_authenticate(ops)
        url = reverse("ctm-trip-payments", args=[self.trip.reference_code])
        for payload in [{"amount": "-1", "currency": "USD"}, {"amount": "10", "currency": "EUR"}]:
            self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        self.assertFalse(TripPayment.objects.exists())

    def test_quote_repricing_requires_new_final_approval(self):
        approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.FINAL_COST, status="approved")
        TripQuote.objects.create(trip_request=self.trip, amount=100, currency="USD", status="sent")
        ops = User.objects.create_user(username="quote-ops", is_staff=True)
        self.client.force_authenticate(ops)
        response = self.client.patch(reverse("ctm-trip-quote", args=[self.trip.reference_code]), {"amount": "200"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        approval.refresh_from_db()
        self.assertEqual(approval.status, "pending")

    def test_passport_cannot_be_marked_ok_without_evidence(self):
        response = self.client.post(reverse("ctm-traveler-list"), {"name": "Traveler", "passportStatus": "ok"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Traveler.objects.exists())

    def test_invoice_with_collections_cannot_change_currency_or_drop_below_paid_amount(self):
        from .serializers import CorporateTripInvoiceWriteSerializer
        invoice = TripInvoice.objects.create(trip_request=self.trip, amount=100, currency="USD", status="sent")
        TripPayment.objects.create(invoice=invoice, amount=50, currency="USD", status="received")
        for patch_data in [{"currency": "EUR"}, {"amount": "20"}]:
            serializer = CorporateTripInvoiceWriteSerializer(invoice, data=patch_data, partial=True)
            self.assertFalse(serializer.is_valid())
