from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.db.models import Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CorporateBillingSummarySerializer,
    CorporateCompanyUserSerializer,
    CorporateCompanyUserWriteSerializer,
    CorporateApprovalActionSerializer,
    CorporateTripBookingSerializer,
    CorporateTripBookingWriteSerializer,
    CorporateTripDocumentSerializer,
    CorporateTripDocumentWriteSerializer,
    CorporateItinerarySerializer,
    CorporateTripInvoiceSerializer,
    CorporateTripInvoiceWriteSerializer,
    CorporateTripMessageSerializer,
    CorporateTripMessageWriteSerializer,
    CorporateTripPaymentSerializer,
    CorporateTripPaymentWriteSerializer,
    CorporatePortalContextSerializer,
    CorporateTripQuoteSerializer,
    CorporateTripQuoteWriteSerializer,
    CorporateTripTaskSerializer,
    CorporateTripTaskWriteSerializer,
    CorporateTravelerDirectorySerializer,
    CorporateTravelerWriteSerializer,
    CorporateTripCreateSerializer,
    CorporateTripRequestSerializer,
    CtmLoginSerializer,
    CtmSessionSerializer,
    build_context_payload,
    can_access_ctm,
    can_approve_ctm_stage,
    can_manage_company_users,
    can_manage_company_collaboration,
    can_manage_trip_operations,
    can_manage_travelers,
    can_view_company_users,
    get_ctm_membership,
    parse_approval_stage,
)
from .models import CompanyUser, Traveler, TripApproval, TripBooking, TripDocument, TripInvoice, TripMessage, TripPayment, TripQuote, TripRequest, TripService, TripTask, TripTimelineEvent, TripTraveler


def ctm_trip_queryset():
    return (
        TripRequest.objects.select_related("company", "requested_by__user", "owner", "quote", "booking", "invoice")
        .prefetch_related(
            Prefetch("trip_travelers", queryset=TripTraveler.objects.select_related("traveler")),
            "approvals__approver__user",
            "timeline_events",
            Prefetch("services", queryset=TripService.objects.order_by("created_at")),
            Prefetch("invoice__payments", queryset=TripPayment.objects.select_related("recorded_by").order_by("-received_at", "-created_at")),
            "tasks__owner_user",
            "tasks__owner_company_user__user",
            "documents__traveler",
            "messages__sender_user",
            "messages__sender_company_user__user",
        )
        .order_by("-created_at")
    )


def ctm_traveler_queryset():
    return Traveler.objects.prefetch_related(
        Prefetch(
            "trip_assignments",
            queryset=TripTraveler.objects.select_related("trip_request").order_by("trip_request__departure_date", "created_at"),
        ),
        Prefetch(
            "trip_requests",
            queryset=TripRequest.objects.order_by("departure_date", "created_at"),
        ),
    ).order_by("full_name")


def ctm_company_user_queryset():
    return CompanyUser.objects.select_related("company", "user").order_by("user__first_name", "user__last_name", "user__username")


def ctm_invoice_queryset():
    return TripInvoice.objects.select_related("trip_request__company", "trip_request__requested_by__user", "issued_by").prefetch_related(
        Prefetch("payments", queryset=TripPayment.objects.select_related("recorded_by").order_by("-received_at", "-created_at"))
    ).order_by("-updated_at")


def ctm_payment_queryset():
    return TripPayment.objects.select_related("invoice__trip_request__company", "invoice__trip_request", "recorded_by").order_by("-received_at", "-created_at")


class HasCtmAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_access_ctm(request.user))


class CtmAuthLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = CtmLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        membership = serializer.validated_data["membership"]
        token, _ = Token.objects.get_or_create(user=user)
        session = {"token": token.key, "company": membership.company, "user": membership}
        return Response(CtmSessionSerializer(session).data)


class CtmAuthLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CtmAuthMeView(APIView):
    permission_classes = [HasCtmAccess]

    def get(self, request):
        payload = build_context_payload(request.user)
        return Response(CtmSessionSerializer({"token": "", **payload}).data)


class CorporatePortalContextView(APIView):
    permission_classes = [HasCtmAccess]

    def get(self, request):
        serializer = CorporatePortalContextSerializer(build_context_payload(request.user))
        return Response(serializer.data)


class BillingReportBaseView(APIView):
    permission_classes = [HasCtmAccess]

    def get_membership(self, request):
        return get_ctm_membership(request.user)

    def get_invoice_queryset(self, request):
        membership = self.get_membership(request)
        queryset = ctm_invoice_queryset().filter(trip_request__company=membership.company) if membership else TripInvoice.objects.none()

        status_filter = request.query_params.get("status")
        department = request.query_params.get("department")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        search = request.query_params.get("search")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if department:
            queryset = queryset.filter(trip_request__department__iexact=department)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search)
                | Q(trip_request__reference_code__icontains=search)
                | Q(trip_request__destination__icontains=search)
                | Q(trip_request__origin__icontains=search)
                | Q(trip_request__department__icontains=search)
            )
        return queryset

    def get_payment_queryset(self, request):
        membership = self.get_membership(request)
        queryset = ctm_payment_queryset().filter(invoice__trip_request__company=membership.company) if membership else TripPayment.objects.none()

        status_filter = request.query_params.get("status")
        method = request.query_params.get("payment_method")
        department = request.query_params.get("department")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        search = request.query_params.get("search")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if method:
            queryset = queryset.filter(payment_method=method)
        if department:
            queryset = queryset.filter(invoice__trip_request__department__iexact=department)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(invoice__invoice_number__icontains=search)
                | Q(invoice__trip_request__reference_code__icontains=search)
                | Q(invoice__trip_request__destination__icontains=search)
            )
        return queryset


class BillingSummaryReportView(BillingReportBaseView):
    def get(self, request):
        membership = self.get_membership(request)
        invoices = list(self.get_invoice_queryset(request))
        payments = list(self.get_payment_queryset(request).filter(status__in=[TripPayment.Status.RECEIVED, TripPayment.Status.RECONCILED]))

        total_invoiced = sum((invoice.amount for invoice in invoices), Decimal("0.00"))
        total_collected = sum((payment.amount for payment in payments), Decimal("0.00"))
        currency = membership.company.default_currency if membership else "USD"
        if invoices:
            currency = invoices[0].currency or currency

        payload = {
            "companyId": membership.company.pk if membership else None,
            "companyName": membership.company.name if membership else "",
            "invoiceCount": len(invoices),
            "sentCount": sum(1 for invoice in invoices if invoice.status == TripInvoice.Status.SENT),
            "overdueCount": sum(1 for invoice in invoices if invoice.status == TripInvoice.Status.OVERDUE),
            "partiallyPaidCount": sum(1 for invoice in invoices if invoice.status == TripInvoice.Status.PARTIALLY_PAID),
            "paidCount": sum(1 for invoice in invoices if invoice.status == TripInvoice.Status.PAID),
            "totalInvoiced": float(total_invoiced),
            "totalCollected": float(total_collected),
            "outstandingBalance": float(total_invoiced - total_collected),
            "currency": currency,
        }
        return Response(CorporateBillingSummarySerializer(payload).data)


class BillingInvoiceReportView(BillingReportBaseView):
    def get(self, request):
        queryset = self.get_invoice_queryset(request)
        return Response(CorporateTripInvoiceSerializer(queryset, many=True).data)


class BillingPaymentReportView(BillingReportBaseView):
    def get(self, request):
        queryset = self.get_payment_queryset(request)
        return Response(CorporateTripPaymentSerializer(queryset, many=True).data)


class CtmTripScopedView(APIView):
    permission_classes = [HasCtmAccess]

    def get_trip(self, request, reference_code: str) -> TripRequest:
        membership = get_ctm_membership(request.user)
        return get_object_or_404(ctm_trip_queryset(), company=membership.company, reference_code=reference_code)

    def ensure_ops_access(self, request):
        if not can_manage_trip_operations(request.user):
            return Response({"detail": "Only DPM operations users can manage quotes and bookings."}, status=status.HTTP_403_FORBIDDEN)
        return None

    def ensure_collaboration_access(self, request):
        membership = get_ctm_membership(request.user)
        if can_manage_trip_operations(request.user):
            return None
        if membership is None or not can_manage_company_collaboration(membership):
            return Response({"detail": "You do not have permission to manage trip collaboration items."}, status=status.HTTP_403_FORBIDDEN)
        return None

    def can_view_internal(self, request) -> bool:
        return can_manage_trip_operations(request.user)


class TripQuoteView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        quote = getattr(trip, "quote", None)
        if quote is None:
            return Response({"detail": "No quote exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CorporateTripQuoteSerializer(quote).data)

    def post(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        serializer = CorporateTripQuoteWriteSerializer(data=request.data, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM,
            actor_user=request.user,
            event_type=TripTimelineEvent.EventType.QUOTE_SENT if quote.status == TripQuote.Status.SENT else TripTimelineEvent.EventType.NOTE,
            visibility=TripTimelineEvent.Visibility.SHARED if quote.status == TripQuote.Status.SENT else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Quote prepared" if quote.status != TripQuote.Status.SENT else "Quote sent",
            description=f"{quote.amount} {quote.currency} prepared for {trip.reference_code}.",
        )
        return Response(CorporateTripQuoteSerializer(quote).data, status=status.HTTP_201_CREATED)

    def patch(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        quote = getattr(trip, "quote", None)
        if quote is None:
            return Response({"detail": "No quote exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        previous_status = quote.status
        serializer = CorporateTripQuoteWriteSerializer(quote, data=request.data, partial=True, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        if quote.status != previous_status:
            TripTimelineEvent.objects.create(
                trip_request=trip,
                actor_type=TripTimelineEvent.ActorType.DPM,
                actor_user=request.user,
                event_type=TripTimelineEvent.EventType.QUOTE_SENT if quote.status == TripQuote.Status.SENT else TripTimelineEvent.EventType.UPDATED,
                visibility=TripTimelineEvent.Visibility.SHARED if quote.status in {TripQuote.Status.SENT, TripQuote.Status.APPROVED, TripQuote.Status.REJECTED} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
                title=f"Quote status changed to {quote.status}",
                description=f"{trip.reference_code} quote updated to {quote.amount} {quote.currency}.",
            )
        return Response(CorporateTripQuoteSerializer(quote).data)


class TripBookingView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        booking = getattr(trip, "booking", None)
        if booking is None:
            return Response({"detail": "No booking exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CorporateTripBookingSerializer(booking).data)

    def post(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        serializer = CorporateTripBookingWriteSerializer(data=request.data, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM,
            actor_user=request.user,
            event_type=TripTimelineEvent.EventType.BOOKED if booking.status in {TripBooking.Status.CONFIRMED, TripBooking.Status.TICKETED, TripBooking.Status.COMPLETED} else TripTimelineEvent.EventType.NOTE,
            visibility=TripTimelineEvent.Visibility.SHARED if booking.status in {TripBooking.Status.CONFIRMED, TripBooking.Status.TICKETED, TripBooking.Status.COMPLETED} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Booking created",
            description=f"{booking.booking_reference or 'Reference pending'} for {trip.reference_code}.",
        )
        return Response(CorporateTripBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    def patch(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        booking = getattr(trip, "booking", None)
        if booking is None:
            return Response({"detail": "No booking exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        previous_status = booking.status
        serializer = CorporateTripBookingWriteSerializer(booking, data=request.data, partial=True, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        if booking.status != previous_status:
            event_type = TripTimelineEvent.EventType.COMPLETED if booking.status == TripBooking.Status.COMPLETED else TripTimelineEvent.EventType.BOOKED
            TripTimelineEvent.objects.create(
                trip_request=trip,
                actor_type=TripTimelineEvent.ActorType.DPM,
                actor_user=request.user,
                event_type=event_type,
                visibility=TripTimelineEvent.Visibility.SHARED if booking.status in {TripBooking.Status.CONFIRMED, TripBooking.Status.TICKETED, TripBooking.Status.COMPLETED} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
                title=f"Booking status changed to {booking.status}",
                description=f"{booking.booking_reference or 'Reference pending'} - {trip.reference_code}.",
            )
        return Response(CorporateTripBookingSerializer(booking).data)


class TripInvoiceView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        invoice = getattr(trip, "invoice", None)
        if invoice is None:
            return Response({"detail": "No invoice exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CorporateTripInvoiceSerializer(invoice).data)

    def post(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        serializer = CorporateTripInvoiceWriteSerializer(data=request.data, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM,
            actor_user=request.user,
            event_type=TripTimelineEvent.EventType.NOTE,
            visibility=TripTimelineEvent.Visibility.SHARED if invoice.status in {TripInvoice.Status.SENT, TripInvoice.Status.PARTIALLY_PAID, TripInvoice.Status.PAID} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Invoice created",
            description=f"{invoice.invoice_number} - {invoice.amount} {invoice.currency}.",
        )
        return Response(CorporateTripInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    def patch(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        invoice = getattr(trip, "invoice", None)
        if invoice is None:
            return Response({"detail": "No invoice exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        previous_status = invoice.status
        serializer = CorporateTripInvoiceWriteSerializer(invoice, data=request.data, partial=True, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        if invoice.status != previous_status:
            TripTimelineEvent.objects.create(
                trip_request=trip,
                actor_type=TripTimelineEvent.ActorType.DPM,
                actor_user=request.user,
                event_type=TripTimelineEvent.EventType.UPDATED,
                visibility=TripTimelineEvent.Visibility.SHARED if invoice.status in {TripInvoice.Status.SENT, TripInvoice.Status.PARTIALLY_PAID, TripInvoice.Status.PAID} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
                title=f"Invoice status changed to {invoice.status}",
                description=f"{invoice.invoice_number} for {trip.reference_code}.",
            )
        return Response(CorporateTripInvoiceSerializer(invoice).data)


class TripPaymentListView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        invoice = getattr(trip, "invoice", None)
        if invoice is None:
            return Response({"detail": "No invoice exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CorporateTripPaymentSerializer(invoice.payments.order_by("-received_at", "-created_at"), many=True).data)

    def post(self, request, reference_code: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        trip = self.get_trip(request, reference_code)
        invoice = getattr(trip, "invoice", None)
        if invoice is None:
            return Response({"detail": "No invoice exists for this trip request."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CorporateTripPaymentWriteSerializer(data=request.data, context={"invoice": invoice, "request": request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM,
            actor_user=request.user,
            event_type=TripTimelineEvent.EventType.UPDATED,
            visibility=TripTimelineEvent.Visibility.SHARED if payment.status in {TripPayment.Status.RECEIVED, TripPayment.Status.RECONCILED} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Payment recorded",
            description=f"{payment.amount} {payment.currency} - {payment.reference or invoice.invoice_number}.",
        )
        return Response(CorporateTripPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class TripPaymentDetailView(CtmTripScopedView):
    def patch(self, request, payment_id: str):
        denied = self.ensure_ops_access(request)
        if denied is not None:
            return denied
        membership = get_ctm_membership(request.user)
        payment = get_object_or_404(
            TripPayment.objects.select_related("invoice__trip_request", "recorded_by"),
            pk=payment_id,
            invoice__trip_request__company=membership.company,
        )
        previous_status = payment.status
        serializer = CorporateTripPaymentWriteSerializer(payment, data=request.data, partial=True, context={"invoice": payment.invoice, "request": request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        if payment.status != previous_status:
            TripTimelineEvent.objects.create(
                trip_request=payment.invoice.trip_request,
                actor_type=TripTimelineEvent.ActorType.DPM,
                actor_user=request.user,
                event_type=TripTimelineEvent.EventType.UPDATED,
                visibility=TripTimelineEvent.Visibility.SHARED if payment.status in {TripPayment.Status.RECEIVED, TripPayment.Status.RECONCILED} else TripTimelineEvent.Visibility.INTERNAL_ONLY,
                title=f"Payment status changed to {payment.status}",
                description=payment.reference or payment.invoice.invoice_number,
            )
        return Response(CorporateTripPaymentSerializer(payment).data)


class TripTaskListView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        queryset = trip.tasks.order_by("status", "due_date", "-updated_at")
        if not self.can_view_internal(request):
            queryset = queryset.filter(visibility=TripTask.Visibility.SHARED)
        return Response(CorporateTripTaskSerializer(queryset, many=True).data)

    def post(self, request, reference_code: str):
        denied = self.ensure_collaboration_access(request)
        if denied is not None:
            return denied
        if not self.can_view_internal(request) and request.data.get("visibility") == TripTask.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot create internal-only tasks."}, status=status.HTTP_403_FORBIDDEN)
        trip = self.get_trip(request, reference_code)
        serializer = CorporateTripTaskWriteSerializer(data=request.data, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM if can_manage_trip_operations(request.user) else TripTimelineEvent.ActorType.COMPANY,
            actor_user=request.user if can_manage_trip_operations(request.user) else None,
            actor_company_user=None if can_manage_trip_operations(request.user) else get_ctm_membership(request.user),
            event_type=TripTimelineEvent.EventType.NOTE,
            visibility=TripTimelineEvent.Visibility.SHARED if task.visibility == TripTask.Visibility.SHARED else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Task created",
            description=task.title,
        )
        return Response(CorporateTripTaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TripTaskDetailView(CtmTripScopedView):
    def patch(self, request, task_id: str):
        denied = self.ensure_collaboration_access(request)
        if denied is not None:
            return denied
        task = get_object_or_404(TripTask.objects.select_related("trip_request"), pk=task_id, trip_request__company=get_ctm_membership(request.user).company)
        if not self.can_view_internal(request) and task.visibility == TripTask.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot edit internal-only tasks."}, status=status.HTTP_403_FORBIDDEN)
        if not self.can_view_internal(request) and request.data.get("visibility") == TripTask.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot convert tasks to internal-only."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CorporateTripTaskWriteSerializer(task, data=request.data, partial=True, context={"trip_request": task.trip_request, "request": request})
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        return Response(CorporateTripTaskSerializer(task).data)


class TripDocumentListView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        queryset = trip.documents.order_by("-updated_at")
        if not self.can_view_internal(request):
            queryset = queryset.filter(visibility=TripDocument.Visibility.SHARED)
        return Response(CorporateTripDocumentSerializer(queryset, many=True).data)

    def post(self, request, reference_code: str):
        denied = self.ensure_collaboration_access(request)
        if denied is not None:
            return denied
        if not self.can_view_internal(request) and request.data.get("visibility") == TripDocument.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot create internal-only documents."}, status=status.HTTP_403_FORBIDDEN)
        trip = self.get_trip(request, reference_code)
        serializer = CorporateTripDocumentWriteSerializer(data=request.data, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM if can_manage_trip_operations(request.user) else TripTimelineEvent.ActorType.COMPANY,
            actor_user=request.user if can_manage_trip_operations(request.user) else None,
            actor_company_user=None if can_manage_trip_operations(request.user) else get_ctm_membership(request.user),
            event_type=TripTimelineEvent.EventType.DOCUMENTS_REQUESTED if document.status in {TripDocument.Status.MISSING, TripDocument.Status.REQUESTED} else TripTimelineEvent.EventType.UPDATED,
            visibility=TripTimelineEvent.Visibility.SHARED if document.visibility == TripDocument.Visibility.SHARED else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Document updated",
            description=document.title,
        )
        return Response(CorporateTripDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class TripDocumentDetailView(CtmTripScopedView):
    def patch(self, request, document_id: str):
        denied = self.ensure_collaboration_access(request)
        if denied is not None:
            return denied
        document = get_object_or_404(TripDocument.objects.select_related("trip_request", "traveler"), pk=document_id, trip_request__company=get_ctm_membership(request.user).company)
        if not self.can_view_internal(request) and document.visibility == TripDocument.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot edit internal-only documents."}, status=status.HTTP_403_FORBIDDEN)
        if not self.can_view_internal(request) and request.data.get("visibility") == TripDocument.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot convert documents to internal-only."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CorporateTripDocumentWriteSerializer(document, data=request.data, partial=True, context={"trip_request": document.trip_request, "request": request})
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        return Response(CorporateTripDocumentSerializer(document).data)


class TripMessageListView(CtmTripScopedView):
    def get(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        queryset = trip.messages.order_by("created_at")
        if not self.can_view_internal(request):
            queryset = queryset.filter(visibility=TripMessage.Visibility.SHARED)
        return Response(CorporateTripMessageSerializer(queryset, many=True).data)

    def post(self, request, reference_code: str):
        trip = self.get_trip(request, reference_code)
        is_ops = can_manage_trip_operations(request.user)
        membership = get_ctm_membership(request.user)
        if not is_ops and membership is None:
            return Response({"detail": "This account does not have CTM access."}, status=status.HTTP_403_FORBIDDEN)
        if not is_ops and request.data.get("visibility") == TripMessage.Visibility.INTERNAL_ONLY:
            return Response({"detail": "Company users cannot post internal-only messages."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CorporateTripMessageWriteSerializer(data=request.data, context={"trip_request": trip, "request": request})
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.DPM if is_ops else TripTimelineEvent.ActorType.COMPANY,
            actor_user=request.user if is_ops else None,
            actor_company_user=None if is_ops else membership,
            event_type=TripTimelineEvent.EventType.NOTE,
            visibility=TripTimelineEvent.Visibility.SHARED if message.visibility == TripMessage.Visibility.SHARED else TripTimelineEvent.Visibility.INTERNAL_ONLY,
            title="Message posted",
            description=message.body[:180],
        )
        return Response(CorporateTripMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class TripRequestViewSet(viewsets.ModelViewSet):
    queryset = ctm_trip_queryset()
    serializer_class = CorporateTripRequestSerializer
    permission_classes = [HasCtmAccess]
    lookup_field = "reference_code"

    def get_serializer_class(self):
        if self.action == "create":
            return CorporateTripCreateSerializer
        if self.action in {"approve", "reject"}:
            return CorporateApprovalActionSerializer
        return CorporateTripRequestSerializer

    def get_queryset(self):
        membership = get_ctm_membership(self.request.user)
        queryset = ctm_trip_queryset().filter(company=membership.company) if membership else TripRequest.objects.none()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(reference_code__icontains=search)
                | Q(destination__icontains=search)
                | Q(origin__icontains=search)
                | Q(department__icontains=search)
                | Q(trip_travelers__traveler__full_name__icontains=search)
                | Q(services__service_type__icontains=search)
            ).distinct()
        return queryset

    def list(self, request, *args, **kwargs):
        serializer = CorporateTripRequestSerializer(self.get_queryset(), many=True, context={"request": request})
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = CorporateTripRequestSerializer(self.get_object(), context={"request": request})
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()
        return Response(CorporateTripRequestSerializer(trip, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, reference_code=None):
        trip = self.get_object()
        serializer = CorporateApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = get_ctm_membership(request.user)
        if membership is None or not can_approve_ctm_stage(membership, serializer.validated_data["stage"]):
            return Response({"detail": "You do not have permission to approve this CTM stage."}, status=status.HTTP_403_FORBIDDEN)
        approval_type = parse_approval_stage(serializer.validated_data["stage"])
        approval = trip.approvals.filter(approval_type=approval_type, status=TripApproval.Status.PENDING).first()
        if approval is None:
            return Response({"detail": "No pending approval was found for this stage."}, status=status.HTTP_400_BAD_REQUEST)

        approval.status = TripApproval.Status.APPROVED
        approval.save(update_fields=["status", "updated_at"])

        remaining_pending = trip.approvals.filter(status=TripApproval.Status.PENDING).exists()
        trip.status = TripRequest.Status.FINAL_APPROVAL if remaining_pending else TripRequest.Status.APPROVED
        if trip.status == TripRequest.Status.APPROVED and trip.trip_travelers.filter(document_status__in=[TripTraveler.DocumentStatus.MISSING_PASSPORT, TripTraveler.DocumentStatus.VISA_REQUIRED, TripTraveler.DocumentStatus.PENDING_DOCS]).exists():
            trip.status = TripRequest.Status.NEEDS_DOCUMENTS
        trip.approval_stage = TripRequest.ApprovalStage.FINAL_COST if remaining_pending else TripRequest.ApprovalStage.NONE
        trip.internal_notes = "Company approval updated. DPM can continue the next operational step from this request."
        trip.save(update_fields=["status", "approval_stage", "internal_notes", "updated_at"])

        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.COMPANY,
            event_type=TripTimelineEvent.EventType.APPROVED,
            title=f"{serializer.validated_data['stage']} approved",
            description=f"{trip.requested_by.job_title or trip.requested_by.user.username} can move to the next workflow step.",
        )
        return Response(CorporateTripRequestSerializer(trip, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, reference_code=None):
        trip = self.get_object()
        serializer = CorporateApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = get_ctm_membership(request.user)
        if membership is None or not can_approve_ctm_stage(membership, serializer.validated_data["stage"]):
            return Response({"detail": "You do not have permission to reject this CTM stage."}, status=status.HTTP_403_FORBIDDEN)
        approval_type = parse_approval_stage(serializer.validated_data["stage"])
        approval = trip.approvals.filter(approval_type=approval_type, status=TripApproval.Status.PENDING).first()
        if approval is None:
            return Response({"detail": "No pending approval was found for this stage."}, status=status.HTTP_400_BAD_REQUEST)

        approval.status = TripApproval.Status.REJECTED
        approval.save(update_fields=["status", "updated_at"])

        trip.status = TripRequest.Status.REJECTED
        trip.internal_notes = "Request has been rejected in the company approval flow. DPM should hold movement until the request is revised."
        trip.save(update_fields=["status", "internal_notes", "updated_at"])

        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.COMPANY,
            event_type=TripTimelineEvent.EventType.REJECTED,
            title=f"{serializer.validated_data['stage']} rejected",
            description="Request returned for revision before DPM can continue.",
        )
        return Response(CorporateTripRequestSerializer(trip, context={"request": request}).data)


class TravelerViewSet(viewsets.ModelViewSet):
    permission_classes = [HasCtmAccess]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return CorporateTravelerWriteSerializer
        return CorporateTravelerDirectorySerializer

    def get_queryset(self):
        membership = get_ctm_membership(self.request.user)
        queryset = ctm_traveler_queryset().filter(company=membership.company) if membership else Traveler.objects.none()
        search = self.request.query_params.get("search")
        department = self.request.query_params.get("department")
        passport_status = self.request.query_params.get("passport_status")
        visa_status = self.request.query_params.get("visa_status")
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(nationality__icontains=search)
            )
        if department:
            queryset = queryset.filter(department__iexact=department)
        if passport_status:
            queryset = queryset.filter(passport_status=passport_status)
        if visa_status:
            queryset = queryset.filter(visa_status=visa_status)
        return queryset

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)

    def _ensure_manage_access(self, request):
        membership = get_ctm_membership(request.user)
        if membership is None or not can_manage_travelers(membership):
            return Response({"detail": "You do not have permission to manage travelers."}, status=status.HTTP_403_FORBIDDEN)
        return None

    def create(self, request, *args, **kwargs):
        denied = self._ensure_manage_access(request)
        if denied is not None:
            return denied
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        traveler = serializer.save()
        return Response(CorporateTravelerDirectorySerializer(traveler).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        denied = self._ensure_manage_access(request)
        if denied is not None:
            return denied
        traveler = self.get_object()
        serializer = self.get_serializer(traveler, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        traveler = serializer.save()
        return Response(CorporateTravelerDirectorySerializer(traveler).data)


class CompanyUserViewSet(viewsets.ModelViewSet):
    permission_classes = [HasCtmAccess]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return CorporateCompanyUserWriteSerializer
        return CorporateCompanyUserSerializer

    def get_queryset(self):
        membership = get_ctm_membership(self.request.user)
        if membership is None or not can_view_company_users(membership):
            return CompanyUser.objects.none()
        queryset = ctm_company_user_queryset().filter(company=membership.company)
        search = self.request.query_params.get("search")
        role = self.request.query_params.get("role")
        active = self.request.query_params.get("active")
        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(job_title__icontains=search)
                | Q(department__icontains=search)
            )
        if role:
            queryset = queryset.filter(role=role)
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=(active == "true"))
        return queryset

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)

    def _ensure_manage_access(self, request):
        membership = get_ctm_membership(request.user)
        if membership is None or not can_manage_company_users(membership):
            return Response({"detail": "You do not have permission to manage company users."}, status=status.HTTP_403_FORBIDDEN)
        return None

    def create(self, request, *args, **kwargs):
        denied = self._ensure_manage_access(request)
        if denied is not None:
            return denied
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        company_user = serializer.save()
        return Response(CorporateCompanyUserSerializer(company_user).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        denied = self._ensure_manage_access(request)
        if denied is not None:
            return denied
        company_user = self.get_object()
        serializer = self.get_serializer(company_user, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        company_user = serializer.save()
        return Response(CorporateCompanyUserSerializer(company_user).data)


class ItineraryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CorporateItinerarySerializer
    permission_classes = [HasCtmAccess]
    lookup_field = "reference_code"

    def get_queryset(self):
        membership = get_ctm_membership(self.request.user)
        queryset = ctm_trip_queryset().filter(company=membership.company, status__in=[TripRequest.Status.BOOKED, TripRequest.Status.COMPLETED]) if membership else TripRequest.objects.none()
        search = self.request.query_params.get("search")
        department = self.request.query_params.get("department")
        status_filter = self.request.query_params.get("status")
        if search:
            queryset = queryset.filter(
                Q(reference_code__icontains=search)
                | Q(destination__icontains=search)
                | Q(origin__icontains=search)
                | Q(trip_travelers__traveler__full_name__icontains=search)
            ).distinct()
        if department:
            queryset = queryset.filter(department__iexact=department)
        if status_filter in {TripRequest.Status.BOOKED, TripRequest.Status.COMPLETED}:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)
