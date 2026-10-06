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


class ApproverAssignmentTests(APITestCase):
    def setUp(self):
        self.company = CompanyAccount.objects.create(name="Tenant A", account_code="TENANTA")
        self.approver_user = User.objects.create_user(username="dept-manager", password="pass", first_name="Dina", last_name="Manager", email="dina@example.com")
        self.approver = CompanyUser.objects.create(company=self.company, user=self.approver_user, role="manager", access_roles=["manager"], department="Operations")
        self.other_user = User.objects.create_user(username="other-manager", password="pass")
        self.other_member = CompanyUser.objects.create(company=self.company, user=self.other_user, role="manager", access_roles=["manager"], department="Finance")
        self.admin_user = User.objects.create_user(username="company-admin", password="pass")
        self.admin_member = CompanyUser.objects.create(company=self.company, user=self.admin_user, role="company_admin", access_roles=["company_admin"])
        self.requester_user = User.objects.create_user(username="requester", password="pass")
        self.requester = CompanyUser.objects.create(company=self.company, user=self.requester_user, role="employee", access_roles=["employee"])
        self.trip = TripRequest.objects.create(company=self.company, requested_by=self.requester, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30), department="Operations")
        self.approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.TRAVEL_NEED, approver=self.approver, status="pending")
        self.approve_url = reverse("ctm-trip-request-approve", args=[self.trip.reference_code])

    def approve_as(self, user):
        self.client.force_authenticate(user)
        return self.client.post(self.approve_url, {"stage": "Travel need"}, format="json")

    def test_wrong_member_cannot_approve_assigned_approval(self):
        response = self.approve_as(self.other_user)
        self.assertEqual(response.status_code, 403)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, "pending")

    def test_wrong_member_cannot_reject_assigned_approval(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.post(reverse("ctm-trip-request-reject", args=[self.trip.reference_code]), {"stage": "Travel need"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, "pending")

    def test_assigned_approver_can_approve(self):
        response = self.approve_as(self.approver_user)
        self.assertEqual(response.status_code, 200, response.data)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, "approved")

    def test_company_admin_can_act_for_assigned_approver(self):
        response = self.approve_as(self.admin_user)
        self.assertEqual(response.status_code, 200, response.data)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, "approved")

    def test_unassigned_approval_keeps_role_based_permission(self):
        self.approval.approver = None
        self.approval.save(update_fields=["approver", "updated_at"])
        response = self.approve_as(self.other_user)
        self.assertEqual(response.status_code, 200, response.data)

    def test_approver_identity_is_serialized(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(reverse("ctm-trip-request-detail", args=[self.trip.reference_code]))
        self.assertEqual(response.status_code, 200)
        approval_data = next(item for item in response.data["approvals"] if item["stage"] == "Travel need")
        self.assertEqual(approval_data["approver"], "Dina Manager")
        self.assertEqual(approval_data["approverIdentity"], {"id": str(self.approver.pk), "name": "Dina Manager", "email": "dina@example.com"})

    def test_unassigned_approval_serializes_null_identity(self):
        self.approval.approver = None
        self.approval.decision_notes = "Approval owner: Operations Manager"
        self.approval.save(update_fields=["approver", "decision_notes", "updated_at"])
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(reverse("ctm-trip-request-detail", args=[self.trip.reference_code]))
        approval_data = next(item for item in response.data["approvals"] if item["stage"] == "Travel need")
        self.assertEqual(approval_data["approver"], "Operations Manager")
        self.assertIsNone(approval_data["approverIdentity"])

    def test_trip_creation_resolves_approver_to_real_member(self):
        self.client.force_authenticate(self.requester_user)
        response = self.client.post(
            reverse("ctm-trip-request-list"),
            {"department": "Operations", "origin": "Maputo", "destination": "Lisbon", "departureDate": (timezone.localdate() + timedelta(days=30)).isoformat(), "purpose": "Meeting", "budgetBand": "gt5k", "services": ["Flight"], "travelers": [{"name": "New traveler", "email": "test@example.com", "department": "Operations"}]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        trip = TripRequest.objects.get(reference_code=response.data["id"])
        travel_need = trip.approvals.get(approval_type=TripApproval.ApprovalType.TRAVEL_NEED)
        self.assertEqual(travel_need.approver, self.approver)
        final_cost = trip.approvals.get(approval_type=TripApproval.ApprovalType.FINAL_COST)
        self.assertIsNotNone(final_cost.approver)
        self.assertIn(final_cost.approver, {self.approver, self.admin_member})


class StaffMembershipScopeTests(APITestCase):
    def setUp(self):
        self.company = CompanyAccount.objects.create(name="Tenant A", account_code="TENANTA")
        self.staff = User.objects.create_user(username="ops-user", password="pass", is_staff=True)
        self.client.force_authenticate(self.staff)

    def test_staff_company_code_does_not_create_membership(self):
        response = self.client.get(reverse("ctm-trip-request-list"), HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CompanyUser.objects.filter(user=self.staff, company=self.company).exists())

    def test_staff_ops_access_still_works_without_membership(self):
        requester_user = User.objects.create_user(username="requester", password="pass")
        requester = CompanyUser.objects.create(company=self.company, user=requester_user, role="employee", access_roles=["employee"])
        trip = TripRequest.objects.create(company=self.company, requested_by=requester, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30))
        response = self.client.get(reverse("ctm-trip-request-detail", args=[trip.reference_code]), HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], trip.reference_code)
        self.assertFalse(CompanyUser.objects.filter(user=self.staff).exists())

    def test_staff_unknown_company_code_fails_closed(self):
        response = self.client.get(reverse("ctm-trip-request-list"), HTTP_X_CTM_COMPANY_CODE="NOTREAL")
        self.assertEqual(response.status_code, 403)

    def test_staff_with_company_code_can_list_travelers_without_membership(self):
        Traveler.objects.create(company=self.company, full_name="Company Traveler", is_active=True)
        response = self.client.get(reverse("ctm-traveler-list"), HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["name"] for item in response.data], ["Company Traveler"])
        self.assertFalse(CompanyUser.objects.filter(user=self.staff).exists())

    def test_staff_with_company_code_can_list_itineraries_without_membership(self):
        requester_user = User.objects.create_user(username="requester", password="pass")
        requester = CompanyUser.objects.create(company=self.company, user=requester_user, role="employee", access_roles=["employee"])
        TripRequest.objects.create(company=self.company, requested_by=requester, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30), status="booked")
        response = self.client.get(reverse("ctm-itinerary-list"), HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertFalse(CompanyUser.objects.filter(user=self.staff).exists())

    def test_staff_with_company_code_can_read_billing_summary_without_membership(self):
        requester_user = User.objects.create_user(username="requester", password="pass")
        requester = CompanyUser.objects.create(company=self.company, user=requester_user, role="employee", access_roles=["employee"])
        trip = TripRequest.objects.create(company=self.company, requested_by=requester, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30))
        TripInvoice.objects.create(trip_request=trip, amount=Decimal("100"), currency="USD", status="sent")
        response = self.client.get("/api/ctm/reports/billing/summary/", HTTP_X_CTM_COMPANY_CODE="TENANTA")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["companyId"], str(self.company.pk))
        self.assertEqual(response.data["invoiceCount"], 1)
        self.assertFalse(CompanyUser.objects.filter(user=self.staff).exists())


class BootstrapDefaultContextTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username="ops-user", password="pass", is_staff=True)

    def test_bootstrap_membership_for_staff_is_not_admin(self):
        from .bootstrap import ensure_default_ctm_context
        _, membership = ensure_default_ctm_context(for_user=self.staff)
        self.assertEqual(membership.role, CompanyUser.Role.EMPLOYEE)
        self.assertNotIn(CompanyUser.Role.COMPANY_ADMIN, membership.access_roles)

    def test_bootstrapped_staff_cannot_approve_via_admin_override(self):
        from .bootstrap import ensure_default_ctm_context
        company, _ = ensure_default_ctm_context(for_user=self.staff)
        approver_user = User.objects.create_user(username="mozal-manager", password="pass")
        approver = CompanyUser.objects.create(company=company, user=approver_user, role="manager", access_roles=["manager"])
        requester_user = User.objects.create_user(username="mozal-requester", password="pass")
        requester = CompanyUser.objects.create(company=company, user=requester_user, role="employee", access_roles=["employee"])
        trip = TripRequest.objects.create(company=company, requested_by=requester, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30))
        approval = TripApproval.objects.create(trip_request=trip, approval_type=TripApproval.ApprovalType.TRAVEL_NEED, approver=approver, status="pending")

        self.client.force_authenticate(self.staff)
        response = self.client.post(reverse("ctm-trip-request-approve", args=[trip.reference_code]), {"stage": "Travel need"}, format="json")

        self.assertEqual(response.status_code, 403)
        approval.refresh_from_db()
        self.assertEqual(approval.status, "pending")

    def test_bootstrapped_staff_keeps_portal_context(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(reverse("ctm-auth-me"))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["company"]["name"], "Mozal Operations")
        self.assertEqual(response.data["user"]["role"], "employee")


class ApproverBackfillMigrationTests(APITestCase):
    def setUp(self):
        self.company = CompanyAccount.objects.create(name="Tenant A", account_code="TENANTA")
        self.manager_user = User.objects.create_user(username="ops-manager", password="pass")
        self.manager = CompanyUser.objects.create(company=self.company, user=self.manager_user, role="manager", access_roles=["manager"], department="Operations")
        self.finance_user = User.objects.create_user(username="finance", password="pass")
        self.finance = CompanyUser.objects.create(company=self.company, user=self.finance_user, role="finance_approver", access_roles=["finance_approver"], department="Finance")
        self.requester_user = User.objects.create_user(username="requester", password="pass")
        self.requester = CompanyUser.objects.create(company=self.company, user=self.requester_user, role="employee", access_roles=["employee"])
        self.trip = TripRequest.objects.create(company=self.company, requested_by=self.requester, origin="Maputo", destination="Lisbon", departure_date=timezone.localdate() + timedelta(days=30), department="Operations")

    def run_backfill(self):
        import importlib
        from django.apps import apps
        migration = importlib.import_module("ctm.migrations.0008_backfill_tripapproval_approver")
        migration.backfill_trip_approval_approvers(apps, None)

    def test_backfill_assigns_department_manager_for_travel_need(self):
        approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.TRAVEL_NEED, approver=None, status="pending")
        self.run_backfill()
        approval.refresh_from_db()
        self.assertEqual(approval.approver, self.manager)

    def test_backfill_prefers_finance_approver_for_final_cost(self):
        approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.FINAL_COST, approver=None, status="pending")
        self.run_backfill()
        approval.refresh_from_db()
        self.assertEqual(approval.approver, self.finance)

    def test_backfill_falls_back_to_manager_for_final_cost(self):
        approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.FINAL_COST, approver=None, status="pending")
        self.finance.is_active = False
        self.finance.save()
        self.run_backfill()
        approval.refresh_from_db()
        self.assertEqual(approval.approver, self.manager)

    def test_backfill_leaves_unresolvable_approvals_null(self):
        self.manager.is_active = False
        self.manager.save()
        self.finance.is_active = False
        self.finance.save()
        approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.TRAVEL_NEED, approver=None, status="pending")
        self.run_backfill()
        approval.refresh_from_db()
        self.assertIsNone(approval.approver)

    def test_backfill_ignores_decided_approvals(self):
        approval = TripApproval.objects.create(trip_request=self.trip, approval_type=TripApproval.ApprovalType.TRAVEL_NEED, approver=None, status="approved")
        self.run_backfill()
        approval.refresh_from_db()
        self.assertIsNone(approval.approver)
