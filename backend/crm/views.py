import hashlib
import json
import uuid
from datetime import datetime, time, timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle

from .models import AccommodationBlock, Client, CommunicationRecord, ExperienceBlock, ItineraryStop, Lead, PaymentRecord, Quote, QuoteApproval, QuoteLine, TransportSegment, TripItinerary, WorkflowReminder
from .serializers import (
    AccommodationBlockSerializer,
    ClientSerializer,
    CommunicationRecordSerializer,
    ExperienceBlockSerializer,
    ItineraryStopSerializer,
    LeadSerializer,
    LoginSerializer,
    PaymentRecordSerializer,
    PublicLeadSerializer,
    QuoteApprovalSerializer,
    QuoteLineSerializer,
    QuoteSerializer,
    TransportSegmentSerializer,
    TripItinerarySerializer,
    UserManagementSerializer,
    UserSerializer,
    WorkflowAdvanceSerializer,
    WorkflowReminderSerializer,
    WorkflowStateSerializer,
    can_access_crm,
    can_advance_workflow,
    can_create_payments,
    can_manage_clients,
    can_manage_user_target,
    can_manage_users,
    can_send_quotes,
    can_verify_payments,
    can_view_all_records,
    can_write_crm,
    scope_records_for_user,
    user_display_name,
)
from .workflow import advance_workflow, completion_condition_status, workflow_for_lead
from .workflow_automation import generate_workflow_reminders


class HasCrmAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active
                    and can_access_crm(request.user)
                    and (request.method in permissions.SAFE_METHODS or can_write_crm(request.user)))


class CanManageClients(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_manage_clients(request.user))


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_manage_users(request.user))

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and can_manage_user_target(request.user, obj))


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("client", "company_account", "owner").prefetch_related("quotes__lines", "quotes__approvals", "payment_records", "itineraries", "communications")
    serializer_class = LeadSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "priority", "status", "lifecycle_stage"]
    ordering = ["-created_at"]
    # Record scoping: consultant/agent see own + unassigned leads only.
    owner_lookup = "owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        service_key = self.request.query_params.get("serviceKey")
        status_value = self.request.query_params.get("status")
        lifecycle_stage = self.request.query_params.get("lifecycleStage")
        priority = self.request.query_params.get("priority")
        search = self.request.query_params.get("search")
        assigned_to = self.request.query_params.get("assigned_to")
        unassigned = self.request.query_params.get("unassigned")

        if service_key:
            queryset = queryset.filter(service_key=service_key)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if lifecycle_stage:
            queryset = queryset.filter(lifecycle_stage=lifecycle_stage)
        if priority:
            queryset = queryset.filter(priority=priority)
        if assigned_to:
            try:
                owner_id = int(assigned_to)
            except (TypeError, ValueError):
                raise ValidationError({"assigned_to": "A numeric user id is expected."})
            queryset = queryset.filter(owner_id=owner_id)
        if unassigned in {"true", "1", "yes"}:
            queryset = queryset.filter(owner__isnull=True)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(whatsapp__icontains=search)
                | Q(destination__icontains=search)
                | Q(departure_city__icontains=search)
                | Q(notes__icontains=search)
                | Q(internal_notes__icontains=search)
            )

        return queryset

    @action(detail=True, methods=["get"], url_path="workflow")
    def workflow(self, request, pk=None):
        lead = self.get_object()
        serializer = WorkflowStateSerializer(workflow_for_lead(lead))
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="advance-workflow")
    def advance_workflow(self, request, pk=None):
        if not can_advance_workflow(request.user):
            raise PermissionDenied("You do not have permission to advance workflows.")
        lead = self.get_object()
        previous_stage = lead.lifecycle_stage
        serializer = WorkflowAdvanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_stage = serializer.validated_data.get("targetStage") or None
        updated_lead, state = advance_workflow(lead, target_stage=target_stage)
        response_serializer = WorkflowStateSerializer(state)

        if updated_lead.lifecycle_stage == previous_stage:
            return Response(response_serializer.data, status=status.HTTP_409_CONFLICT)

        return Response(response_serializer.data)


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.select_related("owner").all()
    serializer_class = ClientSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "updated_at", "created_at"]
    ordering = ["name"]
    # Record scoping: consultant/agent see own + unassigned clients only.
    owner_lookup = "owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        service_level = self.request.query_params.get("serviceLevel")
        client_type = self.request.query_params.get("clientType")
        search = self.request.query_params.get("search")

        if service_level:
            queryset = queryset.filter(service_level=service_level)
        if client_type:
            queryset = queryset.filter(client_type=client_type)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(company_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(notes__icontains=search)
                | Q(owner_label__icontains=search)
                | Q(owner__username__icontains=search)
                | Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
            )

        return queryset

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [HasCrmAccess(), CanManageClients()]
        return [HasCrmAccess()]


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.prefetch_related("lines", "approvals").select_related("lead")
    serializer_class = QuoteSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "status", "valid_until", "version"]
    ordering = ["-created_at"]
    owner_lookup = "lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        lead_id = self.request.query_params.get("leadId")
        status_value = self.request.query_params.get("status")
        quote_number = self.request.query_params.get("quoteNumber")

        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if quote_number:
            queryset = queryset.filter(quote_number__iexact=quote_number)

        return queryset

    def perform_create(self, serializer):
        # Any transition into the sent state requires the quotes.send
        # capability, including creating a quote already marked as sent.
        next_status = serializer.validated_data.get("status", Quote.Status.DRAFT)
        next_sent_at = serializer.validated_data.get("sent_at")
        if (next_status == Quote.Status.SENT or next_sent_at) and not can_send_quotes(self.request.user):
            raise PermissionDenied("You do not have permission to send quotes.")
        serializer.save()

    def perform_update(self, serializer):
        quote = self.get_object()
        next_status = serializer.validated_data.get("status", quote.status)
        next_sent_at = serializer.validated_data.get("sent_at", quote.sent_at)
        # quotes.send is required for any transition into OR out of the sent
        # state (status change or setting/clearing sentAt).
        transitions_sent = (
            (next_status == Quote.Status.SENT) != (quote.status == Quote.Status.SENT)
            or bool(next_sent_at) != bool(quote.sent_at)
        )
        if transitions_sent and not can_send_quotes(self.request.user):
            raise PermissionDenied("You do not have permission to send quotes.")
        serializer.save()


class QuoteLineViewSet(viewsets.ModelViewSet):
    queryset = QuoteLine.objects.select_related("quote", "quote__lead")
    serializer_class = QuoteLineSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "category", "status"]
    ordering = ["category", "created_at"]
    owner_lookup = "quote__lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        quote_id = self.request.query_params.get("quoteId")
        category = self.request.query_params.get("category")
        status_value = self.request.query_params.get("status")

        if quote_id:
            queryset = queryset.filter(quote_id=quote_id)
        if category:
            queryset = queryset.filter(category=category)
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset


class PaymentRecordViewSet(viewsets.ModelViewSet):
    queryset = PaymentRecord.objects.select_related("lead", "quote")
    serializer_class = PaymentRecordSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "due_date", "received_at", "status"]
    ordering = ["-created_at"]
    owner_lookup = "lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        lead_id = self.request.query_params.get("leadId")
        quote_id = self.request.query_params.get("quoteId")
        status_value = self.request.query_params.get("status")
        payment_type = self.request.query_params.get("paymentType")

        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if quote_id:
            queryset = queryset.filter(quote_id=quote_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)

        return queryset

    def perform_create(self, serializer):
        if not can_create_payments(self.request.user):
            raise PermissionDenied("You do not have permission to create payment records.")
        if can_verify_payments(self.request.user):
            serializer.save()
            return
        # Non-verifiers may only register expectations: verification fields
        # (status, proofReceived, amountReceived) are forced to safe defaults
        # and must later be set by a payments.verify role.
        serializer.save(
            status=PaymentRecord.Status.PENDING,
            proof_received=False,
            amount_received=0,
        )

    def perform_update(self, serializer):
        record = self.get_object()
        next_status = serializer.validated_data.get("status", record.status)
        next_proof = serializer.validated_data.get("proof_received", record.proof_received)
        next_amount = serializer.validated_data.get("amount_received", record.amount_received)
        verifying = (
            (next_status == PaymentRecord.Status.PAID and record.status != PaymentRecord.Status.PAID)
            or (next_proof and not record.proof_received)
            or next_amount != record.amount_received
        )
        if verifying and not can_verify_payments(self.request.user):
            raise PermissionDenied("You do not have permission to verify payments.")
        serializer.save()


class CommunicationRecordViewSet(viewsets.ModelViewSet):
    queryset = CommunicationRecord.objects.select_related("lead", "quote", "sent_by")
    serializer_class = CommunicationRecordSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "sent_at", "follow_up_due", "status"]
    ordering = ["-created_at"]
    owner_lookup = "lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        lead_id = self.request.query_params.get("leadId")
        quote_id = self.request.query_params.get("quoteId")
        kind = self.request.query_params.get("kind")
        channel = self.request.query_params.get("channel")
        status_value = self.request.query_params.get("status")
        response_status = self.request.query_params.get("responseStatus")

        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if quote_id:
            queryset = queryset.filter(quote_id=quote_id)
        if kind:
            queryset = queryset.filter(kind=kind)
        if channel:
            queryset = queryset.filter(channel=channel)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if response_status:
            queryset = queryset.filter(response_status=response_status)

        return queryset

    def perform_create(self, serializer):
        if serializer.validated_data.get("sent_by"):
            serializer.save()
        else:
            serializer.save(sent_by=self.request.user)


class CompletionConditionNotMet(APIException):
    status_code = 409
    default_detail = "The task completion condition is not met."
    default_code = "completion_condition_not_met"


class WorkflowReminderViewSet(viewsets.ModelViewSet):
    queryset = WorkflowReminder.objects.select_related("lead", "communication", "created_by", "assigned_to")
    serializer_class = WorkflowReminderSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "due_at", "status", "reminder_type"]
    ordering = ["status", "due_at"]
    owner_lookup = "lead__owner"

    def get_queryset(self):
        queryset = super().get_queryset()
        # Tasks assigned to the requesting user are always visible, even when
        # the linked lead belongs to someone else; other tasks follow lead
        # record scoping (own + unassigned leads for scoped roles).
        if not can_view_all_records(self.request.user):
            queryset = queryset.filter(
                Q(assigned_to=self.request.user)
                | Q(lead__owner=self.request.user)
                | Q(lead__owner__isnull=True)
            )
        lead_id = self.request.query_params.get("leadId")
        status_value = self.request.query_params.get("status")
        reminder_type = self.request.query_params.get("reminderType")
        due_before = self.request.query_params.get("dueBefore")
        due_after = self.request.query_params.get("dueAfter")

        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if reminder_type:
            queryset = queryset.filter(reminder_type=reminder_type)
        if due_before:
            queryset = queryset.filter(due_at__lte=due_before)
        if due_after:
            queryset = queryset.filter(due_at__gte=due_after)

        return queryset

    def perform_create(self, serializer):
        # Tasks created by a person through the API always get origin=manager;
        # the origin field is read-only on the serializer so API clients
        # cannot impersonate system/automation tasks.
        serializer.save(created_by=self.request.user, origin=WorkflowReminder.Origin.MANAGER)

    def perform_update(self, serializer):
        reminder = self.get_object()
        next_status = serializer.validated_data.get("status", reminder.status)
        extra = {}
        if next_status == WorkflowReminder.Status.COMPLETED and reminder.status != WorkflowReminder.Status.COMPLETED:
            self._ensure_completion_allowed(reminder)
            extra["completed_at"] = timezone.now()
        elif next_status != WorkflowReminder.Status.COMPLETED and reminder.status == WorkflowReminder.Status.COMPLETED:
            extra["completed_at"] = None
        serializer.save(**extra)

    @staticmethod
    def _ensure_completion_allowed(reminder):
        condition_met, explanation = completion_condition_status(reminder)
        if not condition_met:
            raise CompletionConditionNotMet(explanation)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        reminder = self.get_object()
        condition_met, explanation = completion_condition_status(reminder)
        if not condition_met:
            return Response(
                {"detail": explanation, "completionCondition": reminder.completion_condition},
                status=status.HTTP_409_CONFLICT,
            )
        reminder.status = WorkflowReminder.Status.COMPLETED
        reminder.completed_at = timezone.now()
        reminder.save(update_fields=["status", "completed_at", "updated_at"])
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reminder = self.get_object()
        reminder.status = WorkflowReminder.Status.CANCELLED
        reminder.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(reminder).data)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        lead_id = request.data.get("leadId") or request.query_params.get("leadId")
        if lead_id:
            lead_queryset = scope_records_for_user(Lead.objects.filter(id=lead_id), request.user, "owner")
            if not lead_queryset.exists():
                raise NotFound("Lead not found.")
            reminders = WorkflowReminder.objects.select_related("lead", "communication", "created_by").filter(
                lead_id=lead_id,
                status__in=WorkflowReminder.OPEN_STATUSES,
            )
        else:
            lead_queryset = scope_records_for_user(
                Lead.objects.exclude(status__in=[Lead.Status.COMPLETED, Lead.Status.LOST]),
                request.user,
                "owner",
            )
            reminders = None
        created = generate_workflow_reminders(lead_queryset=lead_queryset, created_by=request.user)
        if reminders is None:
            reminders = created
        serializer = self.get_serializer(reminders, many=True)
        return Response({"created": len(created), "reminders": serializer.data}, status=status.HTTP_201_CREATED)


class QuoteApprovalViewSet(viewsets.ModelViewSet):
    queryset = QuoteApproval.objects.select_related("quote", "quote__lead")
    serializer_class = QuoteApprovalSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "decision", "decision_at"]
    ordering = ["-created_at"]
    owner_lookup = "quote__lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        quote_id = self.request.query_params.get("quoteId")
        decision = self.request.query_params.get("decision")

        if quote_id:
            queryset = queryset.filter(quote_id=quote_id)
        if decision:
            queryset = queryset.filter(decision=decision)

        return queryset


class TripItineraryViewSet(viewsets.ModelViewSet):
    queryset = (
        TripItinerary.objects.select_related("lead")
        .prefetch_related("stops", "stops__accommodations", "stops__experiences", "transports")
    )
    serializer_class = TripItinerarySerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "start_date", "end_date", "status"]
    ordering = ["start_date", "created_at"]
    owner_lookup = "lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        lead_id = self.request.query_params.get("leadId")
        status_value = self.request.query_params.get("status")

        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset


class ItineraryStopViewSet(viewsets.ModelViewSet):
    queryset = ItineraryStop.objects.select_related("itinerary", "itinerary__lead").prefetch_related("accommodations", "experiences")
    serializer_class = ItineraryStopSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["sequence_number", "arrival_date", "departure_date", "city"]
    ordering = ["itinerary", "sequence_number"]
    owner_lookup = "itinerary__lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        itinerary_id = self.request.query_params.get("itineraryId")
        lead_id = self.request.query_params.get("leadId")

        if itinerary_id:
            queryset = queryset.filter(itinerary_id=itinerary_id)
        if lead_id:
            queryset = queryset.filter(itinerary__lead_id=lead_id)

        return queryset


class AccommodationBlockViewSet(viewsets.ModelViewSet):
    queryset = AccommodationBlock.objects.select_related("stop", "stop__itinerary", "stop__itinerary__lead")
    serializer_class = AccommodationBlockSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["check_in", "check_out", "booking_status", "name"]
    ordering = ["stop", "check_in", "name"]
    owner_lookup = "stop__itinerary__lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        stop_id = self.request.query_params.get("stopId")
        itinerary_id = self.request.query_params.get("itineraryId")
        lead_id = self.request.query_params.get("leadId")
        booking_status = self.request.query_params.get("bookingStatus")

        if stop_id:
            queryset = queryset.filter(stop_id=stop_id)
        if itinerary_id:
            queryset = queryset.filter(stop__itinerary_id=itinerary_id)
        if lead_id:
            queryset = queryset.filter(stop__itinerary__lead_id=lead_id)
        if booking_status:
            queryset = queryset.filter(booking_status=booking_status)

        return queryset


class TransportSegmentViewSet(viewsets.ModelViewSet):
    queryset = TransportSegment.objects.select_related("itinerary", "itinerary__lead")
    serializer_class = TransportSegmentSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["sequence_number", "departure_at", "arrival_at", "booking_status"]
    ordering = ["itinerary", "sequence_number"]
    owner_lookup = "itinerary__lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        itinerary_id = self.request.query_params.get("itineraryId")
        lead_id = self.request.query_params.get("leadId")
        booking_status = self.request.query_params.get("bookingStatus")

        if itinerary_id:
            queryset = queryset.filter(itinerary_id=itinerary_id)
        if lead_id:
            queryset = queryset.filter(itinerary__lead_id=lead_id)
        if booking_status:
            queryset = queryset.filter(booking_status=booking_status)

        return queryset


class ExperienceBlockViewSet(viewsets.ModelViewSet):
    queryset = ExperienceBlock.objects.select_related("stop", "stop__itinerary", "stop__itinerary__lead")
    serializer_class = ExperienceBlockSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["start_at", "status", "category", "title"]
    ordering = ["stop", "start_at", "title"]
    owner_lookup = "stop__itinerary__lead__owner"

    def get_queryset(self):
        queryset = scope_records_for_user(super().get_queryset(), self.request.user, self.owner_lookup)
        stop_id = self.request.query_params.get("stopId")
        itinerary_id = self.request.query_params.get("itineraryId")
        lead_id = self.request.query_params.get("leadId")
        status_value = self.request.query_params.get("status")

        if stop_id:
            queryset = queryset.filter(stop_id=stop_id)
        if itinerary_id:
            queryset = queryset.filter(stop__itinerary_id=itinerary_id)
        if lead_id:
            queryset = queryset.filter(stop__itinerary__lead_id=lead_id)
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().prefetch_related("groups")
    serializer_class = UserManagementSerializer
    permission_classes = [HasCrmAccess, CanManageUsers]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["date_joined", "last_login", "username", "first_name", "last_name"]
    ordering = ["username"]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        role = self.request.query_params.get("role")
        active = self.request.query_params.get("active")

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        if role == "admin":
            queryset = queryset.filter(Q(is_superuser=True) | Q(groups__name="crm_admin")).distinct()
        elif role == "manager":
            queryset = queryset.filter(Q(is_staff=True) | Q(groups__name="crm_manager")).distinct()
        elif role in {"agent", "viewer"}:
            queryset = queryset.filter(groups__name=f"crm_{role}").distinct()

        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")

        return queryset


class PublicLeadCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_inquiry"

    @staticmethod
    def _revision_summary_lines(content, revision_id):
        try:
            pt, en = content["pt"], content["en"]
            itinerary, included = pt["itinerary"], pt["included"]
            if not (
                isinstance(pt, dict)
                and isinstance(en, dict)
                and isinstance(itinerary, list)
                and isinstance(included, list)
            ):
                return None
            return [
                f"Experience: {pt['title']} / {en['title']}",
                f"Suggested nights: {content['nights']} | Revision: {revision_id}",
                "Original itinerary: " + " / ".join(itinerary),
                "Suggested inclusions: " + " / ".join(included),
            ]
        except (KeyError, TypeError):
            return None

    def post(self, request):
        serializer = PublicLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        submission_id = values.pop("submission_id", None) or uuid.uuid4()
        fingerprint = hashlib.sha256(json.dumps(values, sort_keys=True, default=str).encode()).hexdigest()
        revision_id = values.pop('experienceRevision', None)
        if revision_id:
            from .travel_models import TravelExperienceRevision
            revision = TravelExperienceRevision.objects.filter(pk=revision_id).first()
            if revision is None:
                return Response({'detail': 'Experience version not found.'}, status=400)
            summary = self._revision_summary_lines(revision.content, revision_id)
            if summary is not None:
                values['experience_snapshot'] = revision.content
                values['notes'] = '\n'.join(summary + ['Client preferences:', values.get('notes', '')])
        with transaction.atomic():
            lead, created = Lead.objects.get_or_create(
                submission_id=submission_id,
                defaults={**values, "submission_fingerprint": fingerprint},
            )
            if lead.submission_fingerprint != fingerprint:
                return Response({"detail": "Submission ID has already been used for another request."}, status=409)
        return Response({"id": str(lead.id), "received": True}, status=201 if created else 200)


class AuthLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class AuthLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AuthMeView(APIView):
    permission_classes = [HasCrmAccess]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class MyDayView(APIView):
    """GET /api/my-day/ — the sections the My Day page needs.

    Scoping: users with leads.view_all see their own + unassigned + team
    records; scoped users (consultant/agent) see own + unassigned only, and
    only tasks assigned to them or unassigned.
    """

    permission_classes = [HasCrmAccess]
    section_limit = 50
    inactive_lead_statuses = [Lead.Status.COMPLETED, Lead.Status.LOST]

    def get(self, request):
        user = request.user
        now = timezone.now()
        today = timezone.localdate()
        start_of_today = timezone.make_aware(datetime.combine(today, time.min))
        start_of_tomorrow = start_of_today + timedelta(days=1)
        supplier_horizon = today + timedelta(days=2)
        departure_horizon = today + timedelta(days=3)
        view_all = can_view_all_records(user)

        sections = {
            "waitingClients": self._waiting_clients(user, now),
            "expiringSupplierHolds": self._expiring_supplier_holds(user, supplier_horizon),
            "pendingApprovals": self._pending_approvals(user),
            "upcomingDepartures": self._upcoming_departures(user, today, departure_horizon),
            "overdueTasks": self._tasks(user, view_all, request, due_at__lt=start_of_today),
            "todayTasks": self._tasks(user, view_all, request, due_at__gte=start_of_today, due_at__lt=start_of_tomorrow),
        }
        return Response(
            {
                "generatedAt": now,
                "scope": "team" if view_all else "own",
                "counts": {key: len(items) for key, items in sections.items()},
                **sections,
            }
        )

    def _open_tasks(self, user, view_all):
        tasks = WorkflowReminder.objects.select_related("lead", "communication", "created_by", "assigned_to").filter(
            status__in=WorkflowReminder.OPEN_STATUSES
        ).exclude(lead__status__in=self.inactive_lead_statuses)
        if view_all:
            return tasks
        # Tasks assigned to the requesting user are visible regardless of lead
        # ownership; unassigned tasks follow lead scoping (own + unassigned).
        return tasks.filter(
            Q(assigned_to=user)
            | (Q(assigned_to__isnull=True) & (Q(lead__owner=user) | Q(lead__owner__isnull=True)))
        )

    def _tasks(self, user, view_all, request, **due_filters):
        tasks = self._open_tasks(user, view_all).filter(**due_filters).order_by("due_at")[: self.section_limit]
        return WorkflowReminderSerializer(tasks, many=True, context={"request": request}).data

    def _waiting_clients(self, user, now):
        records = (
            scope_records_for_user(CommunicationRecord.objects.select_related("lead", "lead__owner"), user, "lead__owner")
            .filter(
                follow_up_due__isnull=False,
                follow_up_due__lte=now,
                response_status__in=[
                    CommunicationRecord.ResponseStatus.AWAITING,
                    CommunicationRecord.ResponseStatus.ACTION_REQUIRED,
                ],
            )
            .exclude(status__in=[CommunicationRecord.Status.CANCELLED, CommunicationRecord.Status.FAILED])
            .exclude(lead__status__in=self.inactive_lead_statuses)
            .order_by("follow_up_due")[: self.section_limit]
        )
        return [
            {
                "communicationId": str(record.id),
                "leadId": str(record.lead_id),
                "leadName": record.lead.name,
                "kind": record.kind,
                "channel": record.channel,
                "subject": record.subject,
                "followUpDue": record.follow_up_due,
                "responseStatus": record.response_status,
                "ownerId": record.lead.owner_id,
                "ownerName": user_display_name(record.lead.owner),
            }
            for record in records
        ]

    def _expiring_supplier_holds(self, user, horizon):
        lines = (
            scope_records_for_user(
                QuoteLine.objects.select_related("quote", "quote__lead", "booking_owner"),
                user,
                "quote__lead__owner",
            )
            .filter(supplier_deadline__isnull=False, supplier_deadline__lte=horizon)
            .exclude(status=QuoteLine.Status.CONFIRMED)
            .exclude(quote__lead__status__in=self.inactive_lead_statuses)
            .order_by("supplier_deadline")[: self.section_limit]
        )
        return [
            {
                "quoteLineId": str(line.id),
                "quoteId": str(line.quote_id),
                "quoteNumber": line.quote.quote_number,
                "leadId": str(line.quote.lead_id),
                "leadName": line.quote.lead.name,
                "category": line.category,
                "description": line.description,
                "supplier": line.supplier,
                "status": line.status,
                "supplierDeadline": line.supplier_deadline,
                "bookingOwnerId": line.booking_owner_id,
                "bookingOwnerName": user_display_name(line.booking_owner),
            }
            for line in lines
        ]

    def _pending_approvals(self, user):
        approvals = (
            scope_records_for_user(QuoteApproval.objects.select_related("quote", "quote__lead"), user, "quote__lead__owner")
            .filter(decision=QuoteApproval.Decision.PENDING)
            .exclude(quote__lead__status__in=self.inactive_lead_statuses)
            .order_by("created_at")[: self.section_limit]
        )
        return [
            {
                "approvalId": str(approval.id),
                "quoteId": str(approval.quote_id),
                "quoteNumber": approval.quote.quote_number,
                "leadId": str(approval.quote.lead_id),
                "leadName": approval.quote.lead.name,
                "approverName": approval.approver_name,
                "approverEmail": approval.approver_email,
                "createdAt": approval.created_at,
            }
            for approval in approvals
        ]

    def _upcoming_departures(self, user, today, horizon):
        sent_packs = CommunicationRecord.objects.filter(
            lead=OuterRef("lead_id"),
            kind=CommunicationRecord.Kind.TRAVEL_PACK,
            status=CommunicationRecord.Status.SENT,
        )
        itineraries = (
            scope_records_for_user(TripItinerary.objects.select_related("lead", "lead__owner"), user, "lead__owner")
            .filter(start_date__isnull=False, start_date__gte=today, start_date__lte=horizon)
            .exclude(lead__status__in=self.inactive_lead_statuses)
            .exclude(status=TripItinerary.Status.COMPLETED)
            .annotate(has_sent_pack=Exists(sent_packs))
            .filter(has_sent_pack=False)
            .order_by("start_date")[: self.section_limit]
        )
        return [
            {
                "itineraryId": str(itinerary.id),
                "leadId": str(itinerary.lead_id),
                "leadName": itinerary.lead.name,
                "title": itinerary.title,
                "status": itinerary.status,
                "startDate": itinerary.start_date,
                "endDate": itinerary.end_date,
                "ownerId": itinerary.lead.owner_id,
                "ownerName": user_display_name(itinerary.lead.owner),
            }
            for itinerary in itineraries
        ]
