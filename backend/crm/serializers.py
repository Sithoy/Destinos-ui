from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from ctm.models import CompanyAccount

from .models import AccommodationBlock, Client, CommunicationRecord, ExperienceBlock, ItineraryStop, Lead, PaymentRecord, Quote, QuoteApproval, QuoteLine, TransportSegment, TripItinerary, WorkflowReminder


CRM_GROUP_ROLE_MAP = {
    "crm_admin": "admin",
    "crm_manager": "manager",
    "crm_team_manager": "team_manager",
    "crm_agent": "agent",
    "crm_consultant": "consultant",
    "crm_operations": "operations",
    "crm_finance": "finance",
    "crm_viewer": "viewer",
    "crm_auditor": "auditor",
    "client": "client",
}

CRM_ROLE_GROUP_MAP = {role: group for group, role in CRM_GROUP_ROLE_MAP.items()}

# Legacy role names kept for backward compatibility; the legacy "agent" role
# is treated as consultant-equivalent everywhere below.
CRM_ALLOWED_ROLES = {"admin", "manager", "agent", "viewer"}

# Responsibility-based role sets. Groups are combinable, so a user's
# effective responsibility set is the union of every CRM group they hold.
# Roles allowed to open the CRM at all (viewer/auditor are read-only).
CRM_ACCESS_ROLES = {"admin", "manager", "team_manager", "agent", "consultant", "operations", "finance", "viewer", "auditor"}
# Roles with read/write API access.
CRM_WRITE_ROLES = {"admin", "manager", "team_manager", "agent", "consultant", "operations", "finance"}
# Record scoping: these roles see every record; consultant/agent see only
# records they own plus unassigned records.
CRM_VIEW_ALL_ROLES = {"admin", "manager", "team_manager", "operations", "finance", "viewer", "auditor"}
# Financial visibility policy (remediation plan item 1.4): QuoteLine
# unit_cost/unit_sell/total_cost/margin and Quote subtotal_cost/margin are
# visible to roles that build, book, or control money; hidden from viewer
# and auditor.
CRM_FINANCIAL_VISIBILITY_ROLES = {"admin", "manager", "team_manager", "finance", "operations", "agent", "consultant"}
CRM_SEND_QUOTE_ROLES = {"admin", "manager", "team_manager", "agent", "consultant"}
CRM_CREATE_PAYMENT_ROLES = {"admin", "manager", "finance", "agent", "consultant"}
CRM_VERIFY_PAYMENT_ROLES = {"admin", "manager", "finance"}
CRM_EXPORT_ROLES = {"admin", "manager", "team_manager", "finance", "auditor"}
CRM_MANAGE_USER_ROLES = {"admin", "manager"}
CRM_MANAGE_CLIENT_ROLES = {"admin", "manager", "team_manager", "agent", "consultant"}


def get_user_responsibilities(user: User) -> set[str]:
    """Resolve the full set of CRM responsibilities for a user.

    Groups are combinable: a user may hold several crm_* groups at once.
    The legacy "agent" role implies consultant responsibilities.
    """
    if not user or not user.is_authenticated:
        return set()

    if user.is_superuser:
        return set(CRM_ACCESS_ROLES)

    group_names = set(user.groups.values_list("name", flat=True))
    roles = {role for group_name, role in CRM_GROUP_ROLE_MAP.items() if group_name in group_names}
    if "agent" in roles:
        roles.add("consultant")
    if user.is_staff:
        roles.add("manager")
    return roles


def get_user_role(user: User) -> str:
    """Primary role for display/backward compatibility (single value)."""
    responsibilities = get_user_responsibilities(user)
    for role in ("admin", "manager", "team_manager", "agent", "consultant", "operations", "finance", "viewer", "auditor", "client"):
        if role in responsibilities:
            return role
    return "none"


def _has_any(user: User, roles: set[str]) -> bool:
    return bool(get_user_responsibilities(user) & roles)


def can_access_crm(user: User) -> bool:
    return _has_any(user, CRM_ACCESS_ROLES)


def can_write_crm(user: User) -> bool:
    return _has_any(user, CRM_WRITE_ROLES)


def can_view_all_records(user: User) -> bool:
    return _has_any(user, CRM_VIEW_ALL_ROLES)


def can_view_financials(user: User) -> bool:
    return _has_any(user, CRM_FINANCIAL_VISIBILITY_ROLES)


def can_send_quotes(user: User) -> bool:
    return _has_any(user, CRM_SEND_QUOTE_ROLES)


def can_advance_workflow(user: User) -> bool:
    return can_write_crm(user)


def can_create_payments(user: User) -> bool:
    return _has_any(user, CRM_CREATE_PAYMENT_ROLES)


def can_verify_payments(user: User) -> bool:
    return _has_any(user, CRM_VERIFY_PAYMENT_ROLES)


def can_export_reports(user: User) -> bool:
    return _has_any(user, CRM_EXPORT_ROLES)


def can_manage_clients(user: User) -> bool:
    return _has_any(user, CRM_MANAGE_CLIENT_ROLES)


def can_manage_users(user: User) -> bool:
    return _has_any(user, CRM_MANAGE_USER_ROLES)


def get_user_capabilities(user: User) -> list[str]:
    responsibilities = get_user_responsibilities(user)
    capabilities = ["leads.view_all" if responsibilities & CRM_VIEW_ALL_ROLES else "leads.view_own"]
    if responsibilities & CRM_MANAGE_CLIENT_ROLES:
        capabilities.append("clients.manage")
    if responsibilities & CRM_SEND_QUOTE_ROLES:
        capabilities.append("quotes.send")
    if responsibilities & CRM_WRITE_ROLES:
        capabilities.append("workflow.advance")
    if responsibilities & CRM_CREATE_PAYMENT_ROLES:
        capabilities.append("payments.create")
    if responsibilities & CRM_VERIFY_PAYMENT_ROLES:
        capabilities.append("payments.verify")
    if responsibilities & CRM_FINANCIAL_VISIBILITY_ROLES:
        capabilities.append("financials.view")
    if responsibilities & CRM_EXPORT_ROLES:
        capabilities.append("reports.export")
    if responsibilities & CRM_MANAGE_USER_ROLES:
        capabilities.append("users.admin")
    return capabilities


def user_display_name(user: User) -> str:
    if not user:
        return ""
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username


def scope_records_for_user(queryset, user: User, owner_lookup: str = "owner"):
    """Restrict a queryset for scoped roles (consultant/agent).

    `owner_lookup` is the ORM path from the queryset model to the owner FK,
    e.g. "lead__owner" for quotes or "stop__itinerary__lead__owner" for
    accommodation blocks. Unscoped roles (CRM_VIEW_ALL_ROLES) see all
    records; scoped roles see their own records plus unassigned ones.
    """
    if can_view_all_records(user):
        return queryset
    return queryset.filter(Q(**{owner_lookup: user}) | Q(**{f"{owner_lookup}__isnull": True}))


def can_manage_user_target(actor: User, target: User) -> bool:
    actor_role = get_user_role(actor)
    target_role = get_user_role(target)

    if actor_role == "admin":
        return True
    if actor_role == "manager":
        return target_role in {"agent", "viewer", "consultant", "operations", "finance", "auditor", "client", "none"}
    return False


def can_assign_user_role(actor: User, role: str) -> bool:
    actor_role = get_user_role(actor)

    if actor_role == "admin":
        return role in {"admin", "manager", "team_manager", "agent", "consultant", "operations", "finance", "viewer", "auditor"}
    if actor_role == "manager":
        return role in {"agent", "viewer", "consultant", "operations", "finance", "auditor"}
    return False


def serializer_value(attrs, instance, field_name):
    if field_name in attrs:
        return attrs[field_name]
    if instance is None:
        return None
    return getattr(instance, field_name, None)


def datetime_date(value):
    if value is None:
        return None
    return value.date()


def add_past_date_error(errors, field_name, value, label):
    if value and value < timezone.localdate():
        errors[field_name] = f"{label} cannot be before the current date."


def assign_user_role(user: User, role: str) -> User:
    crm_groups = list(Group.objects.filter(name__in=CRM_GROUP_ROLE_MAP.keys()))
    if crm_groups:
        user.groups.remove(*crm_groups)

    group_name = CRM_ROLE_GROUP_MAP.get(role)
    if group_name:
        group, _ = Group.objects.get_or_create(name=group_name)
        user.groups.add(group)

    if role in {"admin", "manager", "team_manager"}:
        user.is_staff = True
    elif role in {"agent", "consultant", "operations", "finance", "viewer", "auditor", "client", "none"}:
        user.is_staff = False

    user.save()
    return user


class ClientSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    clientType = serializers.ChoiceField(source="client_type", choices=Client.ClientType.choices)
    companyName = serializers.CharField(source="company_name", required=False, allow_blank=True)
    preferredContact = serializers.CharField(source="preferred_contact", required=False, allow_blank=True)
    serviceLevel = serializers.CharField(source="service_level", required=False, allow_blank=True)
    # "owner" stays the legacy free-text label for backward compatibility;
    # ownerId/ownerName expose the real FK assignment.
    owner = serializers.CharField(source="owner_label", required=False, allow_blank=True)
    ownerId = serializers.PrimaryKeyRelatedField(source="owner", queryset=User.objects.all(), required=False, allow_null=True)
    ownerName = serializers.SerializerMethodField()
    lastRequestAt = serializers.SerializerMethodField()
    activeRequestCount = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "name",
            "clientType",
            "companyName",
            "email",
            "phone",
            "preferredContact",
            "serviceLevel",
            "owner",
            "ownerId",
            "ownerName",
            "notes",
            "lastRequestAt",
            "activeRequestCount",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "ownerName", "lastRequestAt", "activeRequestCount"]

    def get_ownerName(self, obj: Client) -> str:
        return user_display_name(obj.owner)

    def get_lastRequestAt(self, obj: Client) -> str | None:
        lead = obj.leads.order_by("-created_at").first()
        return lead.created_at if lead else None

    def get_activeRequestCount(self, obj: Client) -> int:
        return obj.leads.exclude(status__in=[Lead.Status.COMPLETED, Lead.Status.LOST]).count()

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        phone = (attrs.get("phone") or "").strip()
        client_type = attrs.get("client_type", getattr(self.instance, "client_type", Client.ClientType.PRIVATE))
        company_name = (attrs.get("company_name") or "").strip()

        queryset = Client.objects.all()
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        if email and queryset.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "A client with this email already exists."})

        if phone and queryset.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "A client with this phone or WhatsApp number already exists."})

        if client_type == Client.ClientType.CORPORATE and company_name and queryset.filter(company_name__iexact=company_name).exists():
            raise serializers.ValidationError({"companyName": "A corporate client with this company name already exists."})

        return attrs


class LeadSerializer(serializers.ModelSerializer):
    experienceSnapshot = serializers.JSONField(source='experience_snapshot', read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    serviceKey = serializers.ChoiceField(source="service_key", choices=Lead.ServiceKey.choices)
    preferredContact = serializers.CharField(source="preferred_contact", required=False, allow_blank=True)
    requestedServices = serializers.CharField(source="requested_services", required=False, allow_blank=True)
    tripType = serializers.CharField(source="trip_type", required=False, allow_blank=True)
    departureCity = serializers.CharField(source="departure_city", required=False, allow_blank=True)
    emailStatus = serializers.ChoiceField(source="email_status", choices=Lead.EmailStatus.choices, required=False)
    lifecycleStage = serializers.ChoiceField(source="lifecycle_stage", choices=Lead.LifecycleStage.choices, required=False)
    internalNotes = serializers.CharField(source="internal_notes", required=False, allow_blank=True)
    ctmRequestId = serializers.CharField(source="ctm_request_reference", required=False, allow_blank=True)
    companyAccountId = serializers.PrimaryKeyRelatedField(source="company_account", queryset=CompanyAccount.objects.all(), required=False, allow_null=True)
    companyAccountName = serializers.CharField(source="company_account.name", read_only=True)
    clientId = serializers.PrimaryKeyRelatedField(source="client", queryset=Client.objects.all(), required=False, allow_null=True)
    clientName = serializers.CharField(source="client.name", read_only=True)
    ownerId = serializers.PrimaryKeyRelatedField(source="owner", queryset=User.objects.all(), required=False, allow_null=True)
    ownerName = serializers.SerializerMethodField()
    workflowSummary = serializers.SerializerMethodField()

    def get_ownerName(self, obj) -> str:
        return user_display_name(obj.owner)

    def get_workflowSummary(self, obj):
        from .workflow import workflow_for_lead
        state = workflow_for_lead(obj)
        return {key: state[key] for key in ["canAdvance", "nextStage", "blockers"]}

    def validate(self, attrs):
        from copy import copy
        from .workflow import STATUS_BY_STAGE, _brief_checks, workflow_for_lead

        if self.instance is None:
            if attrs.get("status", Lead.Status.NEW) != Lead.Status.NEW or attrs.get("lifecycle_stage", Lead.LifecycleStage.NEW_REQUEST) != Lead.LifecycleStage.NEW_REQUEST:
                raise serializers.ValidationError("New requests must start at the intake stage.")
            return attrs
        stage = attrs.get("lifecycle_stage", self.instance.lifecycle_stage)
        new_status = attrs.get("status", self.instance.status)
        if stage == self.instance.lifecycle_stage and new_status == self.instance.status:
            return attrs
        if stage == Lead.LifecycleStage.CLOSED and new_status == Lead.Status.LOST:
            if not attrs.get("internal_notes", "").strip():
                raise serializers.ValidationError({"internalNotes": "Record the reason for closing this request."})
            return attrs
        if new_status != STATUS_BY_STAGE.get(stage):
            raise serializers.ValidationError({"status": "Status must match the workflow stage."})
        candidate = copy(self.instance)
        for key, value in attrs.items():
            if key not in {"status", "lifecycle_stage"}:
                setattr(candidate, key, value)
        state = workflow_for_lead(candidate)
        early_stages = {Lead.LifecycleStage.NEW_REQUEST, Lead.LifecycleStage.PENDING_INFORMATION}
        if self.instance.lifecycle_stage in early_stages and stage == Lead.LifecycleStage.VALIDATED:
            blockers = [item["detail"] for item in _brief_checks(candidate) if not item["ready"]]
            if blockers:
                raise serializers.ValidationError({"lifecycleStage": blockers})
        elif stage != state["nextStage"] or not state["canAdvance"]:
            raise serializers.ValidationError({"lifecycleStage": "Complete the current workflow requirements before advancing to the next stage."})
        return attrs

    class Meta:
        model = Lead
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "service",
            "serviceKey",
            "name",
            "contact",
            "email",
            "whatsapp",
            "preferredContact",
            "requestedServices",
            "tripType",
            "departureCity",
            "destination",
            "dates",
            "travelers",
            "budget",
            "urgency",
            "priority",
            "notes",
            "status",
            "lifecycleStage",
            "emailStatus",
            "internalNotes",
            "ctmRequestId",
            "companyAccountId",
            "companyAccountName",
            "clientId",
            "clientName",
            "ownerId",
            "ownerName",
            "workflowSummary",
            "experienceSnapshot",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "ownerName"]


class PublicLeadSerializer(LeadSerializer):
    submissionId = serializers.UUIDField(source="submission_id", required=False)
    experienceRevision = serializers.UUIDField(required=False, write_only=True)

    class Meta(LeadSerializer.Meta):
        fields = ["experienceRevision", "submissionId", "service", "serviceKey", "name", "contact", "email", "whatsapp",
                  "preferredContact", "requestedServices", "tripType", "departureCity", "destination",
                  "dates", "travelers", "budget", "urgency", "notes"]
        read_only_fields = []

    def validate(self, attrs):
        if not (attrs.get("email") or attrs.get("whatsapp")):
            raise serializers.ValidationError({"contact": "Provide an email or WhatsApp number."})
        return attrs


class WorkflowChecklistItemSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    ready = serializers.BooleanField()
    detail = serializers.CharField()
    # "blocker" gates advancement; "missing_info" and "advisory" are surfaced
    # in the payload without blocking.
    severity = serializers.ChoiceField(choices=["blocker", "missing_info", "advisory"])


class WorkflowStageSerializer(serializers.Serializer):
    stage = serializers.CharField()
    label = serializers.CharField()
    state = serializers.ChoiceField(choices=["done", "current", "upcoming"])


class WorkflowStateSerializer(serializers.Serializer):
    leadId = serializers.UUIDField()
    workflowType = serializers.ChoiceField(choices=["leisure", "corporate"])
    currentStage = serializers.CharField()
    currentStageLabel = serializers.CharField()
    nextStage = serializers.CharField(allow_null=True)
    nextStageLabel = serializers.CharField(allow_blank=True)
    canAdvance = serializers.BooleanField()
    responsibleOwner = serializers.CharField()
    responsibleOwnerId = serializers.IntegerField(allow_null=True)
    # Service-desk label derived from the service type; a queue hint only,
    # never an owner (owners are real users via responsibleOwner*).
    serviceDesk = serializers.CharField(allow_blank=True)
    checklist = WorkflowChecklistItemSerializer(many=True)
    blockers = WorkflowChecklistItemSerializer(many=True)
    stages = WorkflowStageSerializer(many=True)


class WorkflowAdvanceSerializer(serializers.Serializer):
    targetStage = serializers.CharField(required=False, allow_blank=True)


class WorkflowReminderSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    leadId = serializers.PrimaryKeyRelatedField(source="lead", queryset=Lead.objects.all())
    leadName = serializers.CharField(source="lead.name", read_only=True)
    communicationId = serializers.PrimaryKeyRelatedField(source="communication", queryset=CommunicationRecord.objects.all(), required=False, allow_null=True)
    reminderType = serializers.ChoiceField(source="reminder_type", choices=WorkflowReminder.ReminderType.choices, required=False)
    sourceStage = serializers.CharField(source="source_stage", required=False, allow_blank=True)
    dueAt = serializers.DateTimeField(source="due_at")
    # "assignedTo" stays the legacy free-text label (queue hint); the real
    # assignee FK is exposed via assignedToId/assignedToName.
    assignedTo = serializers.CharField(source="assigned_to_label", required=False, allow_blank=True)
    assignedToId = serializers.PrimaryKeyRelatedField(source="assigned_to", queryset=User.objects.all(), required=False, allow_null=True)
    assignedToName = serializers.SerializerMethodField()
    createdBy = serializers.PrimaryKeyRelatedField(source="created_by", queryset=User.objects.all(), required=False, allow_null=True)
    completedAt = serializers.DateTimeField(source="completed_at", required=False, allow_null=True)
    origin = serializers.ChoiceField(choices=WorkflowReminder.Origin.choices, required=False)
    completionCondition = serializers.ChoiceField(source="completion_condition", choices=WorkflowReminder.CompletionCondition.choices, required=False)
    waitingOn = serializers.ChoiceField(source="waiting_on", choices=WorkflowReminder.WaitingOn.choices, required=False, allow_null=True)
    followUpAt = serializers.DateTimeField(source="follow_up_at", required=False, allow_null=True)

    class Meta:
        model = WorkflowReminder
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "leadId",
            "leadName",
            "communicationId",
            "reminderType",
            "status",
            "origin",
            "completionCondition",
            "waitingOn",
            "followUpAt",
            "sourceStage",
            "title",
            "message",
            "dueAt",
            "assignedTo",
            "assignedToId",
            "assignedToName",
            "createdBy",
            "completedAt",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "leadName", "assignedToName"]

    def get_assignedToName(self, obj: WorkflowReminder) -> str:
        return user_display_name(obj.assigned_to)

    def validate(self, attrs):
        lead = attrs.get("lead", getattr(self.instance, "lead", None))
        communication = attrs.get("communication", getattr(self.instance, "communication", None))
        if lead and communication and communication.lead_id != lead.id:
            raise serializers.ValidationError({"communicationId": "Communication must belong to the selected lead."})
        return attrs


class FinancialFieldsMixin:
    """Hide financial fields from serialized output for roles without
    financial visibility (policy: CRM_FINANCIAL_VISIBILITY_ROLES).

    Fails closed: when no request/user is available in the serializer
    context, the fields are hidden.
    """

    financial_fields: tuple = ()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.financial_fields:
            return data
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not can_view_financials(user):
            for field_name in self.financial_fields:
                data.pop(field_name, None)
        return data


class QuoteLineSerializer(FinancialFieldsMixin, serializers.ModelSerializer):
    financial_fields = ("unitCost", "unitSell", "totalCost", "margin")

    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    quoteId = serializers.PrimaryKeyRelatedField(source="quote", queryset=Quote.objects.all())
    unitCost = serializers.DecimalField(source="unit_cost", max_digits=12, decimal_places=2, required=False)
    unitSell = serializers.DecimalField(source="unit_sell", max_digits=12, decimal_places=2, required=False)
    totalCost = serializers.DecimalField(source="total_cost", max_digits=14, decimal_places=2, read_only=True)
    totalSell = serializers.DecimalField(source="total_sell", max_digits=14, decimal_places=2, read_only=True)
    margin = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    confirmationReference = serializers.CharField(source="confirmation_reference", required=False, allow_blank=True)
    supplierDeadline = serializers.DateField(source="supplier_deadline", required=False, allow_null=True)
    # "bookingOwner" stays the legacy free-text label; the real assignee FK
    # is exposed via bookingOwnerId/bookingOwnerName.
    bookingOwner = serializers.CharField(source="booking_owner_label", required=False, allow_blank=True)
    bookingOwnerId = serializers.PrimaryKeyRelatedField(source="booking_owner", queryset=User.objects.all(), required=False, allow_null=True)
    bookingOwnerName = serializers.SerializerMethodField()
    bookingNotes = serializers.CharField(source="booking_notes", required=False, allow_blank=True)
    confirmedAt = serializers.DateTimeField(source="confirmed_at", required=False, allow_null=True)

    class Meta:
        model = QuoteLine
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "quoteId",
            "category",
            "supplier",
            "description",
            "quantity",
            "unitCost",
            "unitSell",
            "totalCost",
            "totalSell",
            "margin",
            "status",
            "confirmationReference",
            "supplierDeadline",
            "bookingOwner",
            "bookingOwnerId",
            "bookingOwnerName",
            "bookingNotes",
            "confirmedAt",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "totalCost", "totalSell", "margin", "bookingOwnerName"]

    def get_bookingOwnerName(self, obj: QuoteLine) -> str:
        return user_display_name(obj.booking_owner)


class PaymentRecordSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    leadId = serializers.PrimaryKeyRelatedField(source="lead", queryset=Lead.objects.all())
    leadName = serializers.CharField(source="lead.name", read_only=True)
    quoteId = serializers.PrimaryKeyRelatedField(source="quote", queryset=Quote.objects.all(), required=False, allow_null=True)
    quoteNumber = serializers.CharField(source="quote.quote_number", read_only=True)
    paymentType = serializers.ChoiceField(source="payment_type", choices=PaymentRecord.PaymentType.choices, required=False)
    amountExpected = serializers.DecimalField(source="amount_expected", max_digits=12, decimal_places=2, required=False)
    amountReceived = serializers.DecimalField(source="amount_received", max_digits=12, decimal_places=2, required=False)
    dueDate = serializers.DateField(source="due_date", required=False, allow_null=True)
    receivedAt = serializers.DateTimeField(source="received_at", required=False, allow_null=True)
    proofReceived = serializers.BooleanField(source="proof_received", required=False)
    proofReference = serializers.CharField(source="proof_reference", required=False, allow_blank=True)

    class Meta:
        model = PaymentRecord
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "leadId",
            "leadName",
            "quoteId",
            "quoteNumber",
            "paymentType",
            "status",
            "currency",
            "amountExpected",
            "amountReceived",
            "dueDate",
            "receivedAt",
            "proofReceived",
            "proofReference",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "leadName", "quoteNumber"]

    def validate(self, attrs):
        lead = attrs.get("lead", getattr(self.instance, "lead", None))
        quote = attrs.get("quote", getattr(self.instance, "quote", None))
        if lead and quote and quote.lead_id != lead.id:
            raise serializers.ValidationError({"quoteId": "Quote must belong to the selected lead."})
        return attrs


class CommunicationRecordSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    leadId = serializers.PrimaryKeyRelatedField(source="lead", queryset=Lead.objects.all())
    leadName = serializers.CharField(source="lead.name", read_only=True)
    quoteId = serializers.PrimaryKeyRelatedField(source="quote", queryset=Quote.objects.all(), required=False, allow_null=True)
    quoteNumber = serializers.CharField(source="quote.quote_number", read_only=True)
    sentBy = serializers.PrimaryKeyRelatedField(source="sent_by", queryset=User.objects.all(), required=False, allow_null=True)
    sentByName = serializers.SerializerMethodField()
    sentAt = serializers.DateTimeField(source="sent_at", required=False, allow_null=True)
    followUpDue = serializers.DateTimeField(source="follow_up_due", required=False, allow_null=True)
    responseStatus = serializers.ChoiceField(source="response_status", choices=CommunicationRecord.ResponseStatus.choices, required=False)

    class Meta:
        model = CommunicationRecord
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "leadId",
            "leadName",
            "quoteId",
            "quoteNumber",
            "kind",
            "channel",
            "status",
            "subject",
            "message",
            "sentBy",
            "sentByName",
            "sentAt",
            "followUpDue",
            "responseStatus",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "leadName", "quoteNumber", "sentByName"]

    def validate(self, attrs):
        lead = attrs.get("lead", getattr(self.instance, "lead", None))
        quote = attrs.get("quote", getattr(self.instance, "quote", None))
        if lead and quote and quote.lead_id != lead.id:
            raise serializers.ValidationError({"quoteId": "Quote must belong to the selected lead."})
        return attrs

    def get_sentByName(self, obj: CommunicationRecord) -> str:
        if not obj.sent_by:
            return ""
        full_name = f"{obj.sent_by.first_name} {obj.sent_by.last_name}".strip()
        return full_name or obj.sent_by.username


class QuoteApprovalSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    quoteId = serializers.PrimaryKeyRelatedField(source="quote", queryset=Quote.objects.all())
    approverName = serializers.CharField(source="approver_name")
    approverEmail = serializers.EmailField(source="approver_email", required=False, allow_blank=True)
    decisionAt = serializers.DateTimeField(source="decision_at", required=False, allow_null=True)

    class Meta:
        model = QuoteApproval
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "quoteId",
            "approverName",
            "approverEmail",
            "decision",
            "decisionAt",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]


class QuoteSerializer(FinancialFieldsMixin, serializers.ModelSerializer):
    financial_fields = ("subtotalCost", "margin")

    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    leadId = serializers.PrimaryKeyRelatedField(source="lead", queryset=Lead.objects.all())
    leadName = serializers.CharField(source="lead.name", read_only=True)
    quoteNumber = serializers.CharField(source="quote_number")
    validUntil = serializers.DateField(source="valid_until", required=False, allow_null=True)
    sentAt = serializers.DateTimeField(source="sent_at", required=False, allow_null=True)
    acceptedAt = serializers.DateTimeField(source="accepted_at", required=False, allow_null=True)
    subtotalCost = serializers.DecimalField(source="subtotal_cost", max_digits=14, decimal_places=2, read_only=True)
    subtotalSell = serializers.DecimalField(source="subtotal_sell", max_digits=14, decimal_places=2, read_only=True)
    margin = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    lines = QuoteLineSerializer(many=True, read_only=True)
    approvals = QuoteApprovalSerializer(many=True, read_only=True)

    class Meta:
        model = Quote
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "leadId",
            "leadName",
            "quoteNumber",
            "version",
            "status",
            "currency",
            "subtotalCost",
            "subtotalSell",
            "margin",
            "validUntil",
            "notes",
            "sentAt",
            "acceptedAt",
            "lines",
            "approvals",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "subtotalCost", "subtotalSell", "margin", "leadName", "lines", "approvals"]


class AccommodationBlockSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    stopId = serializers.PrimaryKeyRelatedField(source="stop", queryset=ItineraryStop.objects.all())
    accommodationType = serializers.ChoiceField(source="accommodation_type", choices=AccommodationBlock.AccommodationType.choices, required=False)
    roomType = serializers.CharField(source="room_type", required=False, allow_blank=True)
    boardBasis = serializers.CharField(source="board_basis", required=False, allow_blank=True)
    checkIn = serializers.DateField(source="check_in", required=False, allow_null=True)
    checkOut = serializers.DateField(source="check_out", required=False, allow_null=True)
    bookingStatus = serializers.ChoiceField(source="booking_status", choices=AccommodationBlock.BookingStatus.choices, required=False)
    confirmationReference = serializers.CharField(source="confirmation_reference", required=False, allow_blank=True)

    class Meta:
        model = AccommodationBlock
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "stopId",
            "name",
            "accommodationType",
            "roomType",
            "boardBasis",
            "checkIn",
            "checkOut",
            "rooms",
            "supplier",
            "bookingStatus",
            "confirmationReference",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        stop = serializer_value(attrs, self.instance, "stop")
        check_in = serializer_value(attrs, self.instance, "check_in")
        check_out = serializer_value(attrs, self.instance, "check_out")
        errors = {}

        add_past_date_error(errors, "checkIn", check_in, "Check-in date")
        add_past_date_error(errors, "checkOut", check_out, "Check-out date")
        if check_in and check_out and check_out < check_in:
            errors["checkOut"] = "Check-out date cannot be before check-in date."
        if stop and (check_in or check_out) and not (stop.arrival_date and stop.departure_date):
            errors["checkIn"] = "Set stop arrival and departure dates before adding stay dates."
        if stop and stop.arrival_date and check_in and check_in < stop.arrival_date:
            errors["checkIn"] = "Check-in date must be within the stop dates."
        if stop and stop.departure_date and check_out and check_out > stop.departure_date:
            errors["checkOut"] = "Check-out date must be within the stop dates."

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class ExperienceBlockSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    stopId = serializers.PrimaryKeyRelatedField(source="stop", queryset=ItineraryStop.objects.all())
    startAt = serializers.DateTimeField(source="start_at", required=False, allow_null=True)

    class Meta:
        model = ExperienceBlock
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "stopId",
            "title",
            "category",
            "startAt",
            "supplier",
            "status",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]


class ItineraryStopSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    itineraryId = serializers.PrimaryKeyRelatedField(source="itinerary", queryset=TripItinerary.objects.all())
    sequenceNumber = serializers.IntegerField(source="sequence_number")
    arrivalDate = serializers.DateField(source="arrival_date", required=False, allow_null=True)
    departureDate = serializers.DateField(source="departure_date", required=False, allow_null=True)
    accommodations = AccommodationBlockSerializer(many=True, read_only=True)
    experiences = ExperienceBlockSerializer(many=True, read_only=True)

    class Meta:
        model = ItineraryStop
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "itineraryId",
            "sequenceNumber",
            "city",
            "country",
            "arrivalDate",
            "departureDate",
            "nights",
            "purpose",
            "notes",
            "accommodations",
            "experiences",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "accommodations", "experiences"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        itinerary = serializer_value(attrs, self.instance, "itinerary")
        arrival_date = serializer_value(attrs, self.instance, "arrival_date")
        departure_date = serializer_value(attrs, self.instance, "departure_date")
        errors = {}

        add_past_date_error(errors, "arrivalDate", arrival_date, "Stop arrival date")
        add_past_date_error(errors, "departureDate", departure_date, "Stop departure date")
        if arrival_date and departure_date and departure_date < arrival_date:
            errors["departureDate"] = "Stop departure date cannot be before arrival date."
        if itinerary and (arrival_date or departure_date) and not (itinerary.start_date and itinerary.end_date):
            errors["arrivalDate"] = "Set trip departure and return dates before adding dated stops."
        if itinerary and itinerary.start_date and arrival_date and arrival_date < itinerary.start_date:
            errors["arrivalDate"] = "Stop arrival date must be within the trip dates."
        if itinerary and itinerary.end_date and departure_date and departure_date > itinerary.end_date:
            errors["departureDate"] = "Stop departure date must be within the trip dates."
        if self.instance:
            for accommodation in self.instance.accommodations.all():
                if arrival_date and accommodation.check_in and accommodation.check_in < arrival_date:
                    errors["arrivalDate"] = "Stop arrival date cannot move after existing accommodation check-in."
                    break
                if departure_date and accommodation.check_out and accommodation.check_out > departure_date:
                    errors["departureDate"] = "Stop departure date cannot move before existing accommodation check-out."
                    break

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class TransportSegmentSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    itineraryId = serializers.PrimaryKeyRelatedField(source="itinerary", queryset=TripItinerary.objects.all())
    sequenceNumber = serializers.IntegerField(source="sequence_number")
    fromCity = serializers.CharField(source="from_city")
    toCity = serializers.CharField(source="to_city")
    departureAt = serializers.DateTimeField(source="departure_at", required=False, allow_null=True)
    arrivalAt = serializers.DateTimeField(source="arrival_at", required=False, allow_null=True)
    bookingStatus = serializers.ChoiceField(source="booking_status", choices=TransportSegment.BookingStatus.choices, required=False)

    class Meta:
        model = TransportSegment
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "itineraryId",
            "sequenceNumber",
            "mode",
            "fromCity",
            "toCity",
            "departureAt",
            "arrivalAt",
            "supplier",
            "bookingStatus",
            "reference",
            "notes",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        itinerary = serializer_value(attrs, self.instance, "itinerary")
        departure_at = serializer_value(attrs, self.instance, "departure_at")
        arrival_at = serializer_value(attrs, self.instance, "arrival_at")
        departure_date = datetime_date(departure_at)
        arrival_date = datetime_date(arrival_at)
        errors = {}

        add_past_date_error(errors, "departureAt", departure_date, "Transport departure date")
        add_past_date_error(errors, "arrivalAt", arrival_date, "Transport arrival date")
        if departure_at and arrival_at and arrival_at < departure_at:
            errors["arrivalAt"] = "Transport arrival time cannot be before departure time."
        if itinerary and (departure_at or arrival_at) and not (itinerary.start_date and itinerary.end_date):
            errors["departureAt"] = "Set trip departure and return dates before adding dated movements."
        if itinerary and itinerary.start_date and departure_date and departure_date < itinerary.start_date:
            errors["departureAt"] = "Transport departure must be within the trip dates."
        if itinerary and itinerary.end_date and arrival_date and arrival_date > itinerary.end_date:
            errors["arrivalAt"] = "Transport arrival must be within the trip dates."

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class TripItinerarySerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    leadId = serializers.PrimaryKeyRelatedField(source="lead", queryset=Lead.objects.all())
    leadName = serializers.CharField(source="lead.name", read_only=True)
    startDate = serializers.DateField(source="start_date", required=False, allow_null=True)
    endDate = serializers.DateField(source="end_date", required=False, allow_null=True)
    stops = ItineraryStopSerializer(many=True, read_only=True)
    transports = TransportSegmentSerializer(many=True, read_only=True)

    class Meta:
        model = TripItinerary
        fields = [
            "id",
            "createdAt",
            "updatedAt",
            "leadId",
            "leadName",
            "title",
            "status",
            "startDate",
            "endDate",
            "notes",
            "stops",
            "transports",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "leadName", "stops", "transports"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start_date = serializer_value(attrs, self.instance, "start_date")
        end_date = serializer_value(attrs, self.instance, "end_date")
        errors = {}

        add_past_date_error(errors, "startDate", start_date, "Trip departure date")
        add_past_date_error(errors, "endDate", end_date, "Trip return date")
        if start_date and end_date and end_date < start_date:
            errors["endDate"] = "Return/end date cannot be before departure/start date."
        if self.instance:
            for stop in self.instance.stops.all():
                if start_date and stop.arrival_date and stop.arrival_date < start_date:
                    errors["startDate"] = "Trip start date cannot move after existing stop arrival dates."
                    break
                if end_date and stop.departure_date and stop.departure_date > end_date:
                    errors["endDate"] = "Trip end date cannot move before existing stop departure dates."
                    break
            for transport in self.instance.transports.all():
                departure_date = datetime_date(transport.departure_at)
                arrival_date = datetime_date(transport.arrival_at)
                if start_date and departure_date and departure_date < start_date:
                    errors["startDate"] = "Trip start date cannot move after existing transport departures."
                    break
                if end_date and arrival_date and arrival_date > end_date:
                    errors["endDate"] = "Trip end date cannot move before existing transport arrivals."
                    break

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs["username"]
        password = attrs["password"]
        user = authenticate(username=username, password=password)

        if user is None:
            matched_users = User.objects.filter(email__iexact=username, is_active=True)
            for matched_user in matched_users:
                candidate = authenticate(username=matched_user.username, password=password)
                if candidate is not None and can_access_crm(candidate):
                    user = candidate
                    break

        if user is None:
            raise serializers.ValidationError("Invalid username/email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This CRM account is inactive.")

        if not can_access_crm(user):
            raise serializers.ValidationError("This account does not have CRM access.")

        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    capabilities = serializers.SerializerMethodField()
    canAccessCrm = serializers.SerializerMethodField()
    canManageClients = serializers.SerializerMethodField()
    canManageUsers = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_staff", "role", "roles", "capabilities", "canAccessCrm", "canManageClients", "canManageUsers"]

    def get_role(self, obj: User) -> str:
        return get_user_role(obj)

    def get_roles(self, obj: User) -> list[str]:
        return sorted(get_user_responsibilities(obj))

    def get_capabilities(self, obj: User) -> list[str]:
        return get_user_capabilities(obj)

    def get_canAccessCrm(self, obj: User) -> bool:
        return can_access_crm(obj)

    def get_canManageClients(self, obj: User) -> bool:
        return can_manage_clients(obj)

    def get_canManageUsers(self, obj: User) -> bool:
        return can_manage_users(obj)


class UserManagementSerializer(UserSerializer):
    isActive = serializers.BooleanField(source="is_active", required=False)
    groups = serializers.SerializerMethodField()
    displayName = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["isActive", "groups", "displayName", "date_joined", "last_login", "password"]
        read_only_fields = ["id", "groups", "displayName", "date_joined", "last_login", "canAccessCrm", "canManageClients", "canManageUsers"]

    def validate_role(self, value: str) -> str:
        if value not in {"admin", "manager", "team_manager", "agent", "consultant", "operations", "finance", "viewer", "auditor"}:
            raise serializers.ValidationError("Choose a valid CRM role.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        next_role = attrs.get("role", get_user_role(self.instance) if self.instance else "viewer")

        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required for new users."})

        if actor and getattr(actor, "is_authenticated", False):
            if self.instance is not None and not can_manage_user_target(actor, self.instance):
                raise serializers.ValidationError("You do not have permission to modify this CRM user.")

            if not can_assign_user_role(actor, next_role):
                raise serializers.ValidationError({"role": "You do not have permission to assign this CRM role."})

        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role", "viewer")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        assign_user_role(user, role)
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        if role is not None:
            assign_user_role(instance, role)
        return instance

    def get_groups(self, obj: User):
        return list(obj.groups.order_by("name").values_list("name", flat=True))

    def get_displayName(self, obj: User) -> str:
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.username
