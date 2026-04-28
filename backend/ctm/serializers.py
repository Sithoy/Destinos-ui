from decimal import Decimal
from django.utils import timezone

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .bootstrap import ensure_default_ctm_context
from .models import CompanyAccount, CompanyUser, Traveler, TripApproval, TripBooking, TripDocument, TripInvoice, TripMessage, TripPayment, TripQuote, TripRequest, TripService, TripTask, TripTimelineEvent, TripTraveler


def format_portal_date(value):
    if not value:
        return ""
    return value.strftime("%d %b %Y")


def format_passport_status(value: str) -> str:
    return "OK" if value == Traveler.PassportStatus.OK else "Missing"


def format_visa_status(value: str) -> str:
    if value == Traveler.VisaStatus.OK:
        return "OK"
    if value == Traveler.VisaStatus.NOT_APPLICABLE:
        return "N/A"
    return "Required"


def format_role(value: str) -> str:
    role_map = {
        CompanyUser.Role.EMPLOYEE: "employee",
        CompanyUser.Role.TRAVEL_COORDINATOR: "travel_coordinator",
        CompanyUser.Role.MANAGER: "manager",
        CompanyUser.Role.FINANCE_APPROVER: "manager",
        CompanyUser.Role.COMPANY_ADMIN: "manager",
    }
    return role_map.get(value, "employee")


def get_ctm_membership(user: User) -> CompanyUser | None:
    membership = (
        CompanyUser.objects.select_related("company", "user")
        .filter(user=user, is_active=True, company__status=CompanyAccount.Status.ACTIVE)
        .order_by("created_at")
        .first()
    )
    if membership is None and user.is_active and (user.is_superuser or user.is_staff):
        _, membership = ensure_default_ctm_context(for_user=user)
    return membership


def can_access_ctm(user: User) -> bool:
    return bool(user and user.is_authenticated and user.is_active and get_ctm_membership(user))


def can_approve_ctm_stage(membership: CompanyUser, stage: str) -> bool:
    if stage == "Travel need":
        return membership.role in {
            CompanyUser.Role.TRAVEL_COORDINATOR,
            CompanyUser.Role.MANAGER,
            CompanyUser.Role.COMPANY_ADMIN,
        }
    return membership.role in {
        CompanyUser.Role.MANAGER,
        CompanyUser.Role.FINANCE_APPROVER,
        CompanyUser.Role.COMPANY_ADMIN,
    }


def can_manage_travelers(membership: CompanyUser) -> bool:
    return membership.role in {
        CompanyUser.Role.TRAVEL_COORDINATOR,
        CompanyUser.Role.MANAGER,
        CompanyUser.Role.COMPANY_ADMIN,
    }


def can_view_company_users(membership: CompanyUser) -> bool:
    return membership.role in {
        CompanyUser.Role.MANAGER,
        CompanyUser.Role.COMPANY_ADMIN,
    }


def can_manage_company_users(membership: CompanyUser) -> bool:
    return membership.role == CompanyUser.Role.COMPANY_ADMIN


def can_manage_trip_operations(user: User) -> bool:
    return bool(user and user.is_authenticated and user.is_active and (user.is_staff or user.is_superuser))


def can_manage_company_collaboration(membership: CompanyUser) -> bool:
    return membership.role in {
        CompanyUser.Role.TRAVEL_COORDINATOR,
        CompanyUser.Role.MANAGER,
        CompanyUser.Role.COMPANY_ADMIN,
    }


def format_trip_status(value: str) -> str:
    status_map = {
        TripRequest.Status.PENDING_APPROVAL: "Pending approval",
        TripRequest.Status.APPROVED: "Approved",
        TripRequest.Status.QUOTE_READY: "Quote ready",
        TripRequest.Status.FINAL_APPROVAL: "Final approval",
        TripRequest.Status.BOOKED: "Booked",
        TripRequest.Status.REJECTED: "Rejected",
        TripRequest.Status.NEEDS_DOCUMENTS: "Needs documents",
        TripRequest.Status.COMPLETED: "Completed",
        TripRequest.Status.DRAFT: "Pending approval",
    }
    return status_map.get(value, "Pending approval")


def parse_approval_stage(stage: str) -> str:
    return TripApproval.ApprovalType.TRAVEL_NEED if stage == "Travel need" else TripApproval.ApprovalType.FINAL_COST


def parse_budget_estimate(value: str) -> int:
    return {
        "lt1k": 800,
        "1k_5k": 3000,
        "gt5k": 7000,
    }.get(value, 3000)


class CorporatePortalCompanySerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    name = serializers.CharField()
    descriptor = serializers.SerializerMethodField()

    def get_descriptor(self, obj: CompanyAccount) -> str:
        return "Corporate Travel Platform"


class CorporatePortalUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    companyId = serializers.UUIDField(source="company.pk")

    def get_name(self, obj: CompanyUser) -> str:
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.job_title or obj.user.username

    def get_role(self, obj: CompanyUser) -> str:
        return format_role(obj.role)


class CorporateCompanyUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    username = serializers.CharField(source="user.username")
    email = serializers.EmailField(source="user.email")
    firstName = serializers.CharField(source="user.first_name")
    lastName = serializers.CharField(source="user.last_name")
    displayName = serializers.SerializerMethodField()
    role = serializers.CharField()
    department = serializers.CharField()
    jobTitle = serializers.CharField(source="job_title")
    phone = serializers.CharField()
    isActive = serializers.BooleanField(source="is_active")
    createdAt = serializers.DateTimeField(source="created_at")

    def get_displayName(self, obj: CompanyUser) -> str:
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.job_title or obj.user.username


class CorporatePortalContextSerializer(serializers.Serializer):
    company = CorporatePortalCompanySerializer()
    user = CorporatePortalUserSerializer()


class CorporateTravelerReadinessSerializer(serializers.Serializer):
    passport = serializers.SerializerMethodField()
    visa = serializers.SerializerMethodField()

    def get_passport(self, obj: Traveler) -> str:
        return format_passport_status(obj.passport_status)

    def get_visa(self, obj: Traveler) -> str:
        return format_visa_status(obj.visa_status)


class CorporateTravelerSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    name = serializers.CharField(source="full_name")
    department = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.CharField()
    readiness = CorporateTravelerReadinessSerializer(source="*")


class CorporateTravelerDirectorySerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    name = serializers.CharField(source="full_name")
    department = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.CharField()
    nationality = serializers.CharField()
    passportExpiry = serializers.SerializerMethodField()
    readiness = CorporateTravelerReadinessSerializer(source="*")
    tripCount = serializers.SerializerMethodField()
    nextTrip = serializers.SerializerMethodField()

    def get_passportExpiry(self, obj: Traveler) -> str:
        return format_portal_date(obj.passport_expiry)

    def get_tripCount(self, obj: Traveler) -> int:
        return obj.trip_requests.count()

    def get_nextTrip(self, obj: Traveler):
        trip = (
            obj.trip_requests.order_by("departure_date", "created_at")
            .filter(status__in=[TripRequest.Status.PENDING_APPROVAL, TripRequest.Status.APPROVED, TripRequest.Status.QUOTE_READY, TripRequest.Status.FINAL_APPROVAL, TripRequest.Status.BOOKED, TripRequest.Status.NEEDS_DOCUMENTS])
            .first()
        )
        if not trip:
            return None
        return {
            "id": trip.reference_code,
            "route": f"{trip.origin} -> {trip.destination}",
            "travelDate": format_portal_date(trip.departure_date),
            "status": format_trip_status(trip.status),
        }


class CorporateTravelerWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=180)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=80)
    department = serializers.CharField(required=False, allow_blank=True, max_length=120)
    nationality = serializers.CharField(required=False, allow_blank=True, max_length=120)
    passportNumber = serializers.CharField(required=False, allow_blank=True, max_length=80)
    passportExpiry = serializers.DateField(required=False, allow_null=True)
    passportStatus = serializers.ChoiceField(
        required=False,
        choices=[choice for choice, _ in Traveler.PassportStatus.choices],
    )
    visaStatus = serializers.ChoiceField(
        required=False,
        choices=[choice for choice, _ in Traveler.VisaStatus.choices],
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    isActive = serializers.BooleanField(required=False)

    def _membership(self) -> CompanyUser:
        membership = get_ctm_membership(self.context["request"].user)
        if membership is None:
            raise serializers.ValidationError("This account does not have CTM access.")
        if not can_manage_travelers(membership):
            raise serializers.ValidationError("You do not have permission to manage travelers.")
        return membership

    def create(self, validated_data):
        membership = self._membership()
        return Traveler.objects.create(
            company=membership.company,
            full_name=validated_data["name"],
            email=validated_data.get("email", ""),
            phone=validated_data.get("phone", ""),
            department=validated_data.get("department", ""),
            nationality=validated_data.get("nationality", ""),
            passport_number=validated_data.get("passportNumber", ""),
            passport_expiry=validated_data.get("passportExpiry"),
            passport_status=validated_data.get("passportStatus", Traveler.PassportStatus.MISSING),
            visa_status=validated_data.get("visaStatus", Traveler.VisaStatus.UNKNOWN),
            notes=validated_data.get("notes", ""),
            is_active=validated_data.get("isActive", True),
        )

    def update(self, instance: Traveler, validated_data):
        self._membership()
        field_map = {
            "name": "full_name",
            "email": "email",
            "phone": "phone",
            "department": "department",
            "nationality": "nationality",
            "passportNumber": "passport_number",
            "passportExpiry": "passport_expiry",
            "passportStatus": "passport_status",
            "visaStatus": "visa_status",
            "notes": "notes",
            "isActive": "is_active",
        }
        for key, field in field_map.items():
            if key in validated_data:
                setattr(instance, field, validated_data[key])
        instance.save()
        return instance


class CorporateCompanyUserWriteSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    firstName = serializers.CharField(max_length=150, required=False, allow_blank=True)
    lastName = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(required=False, write_only=True, allow_blank=False)
    role = serializers.ChoiceField(choices=[choice for choice, _ in CompanyUser.Role.choices], required=False)
    department = serializers.CharField(required=False, allow_blank=True, max_length=120)
    jobTitle = serializers.CharField(required=False, allow_blank=True, max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=80)
    isActive = serializers.BooleanField(required=False)

    def _membership(self) -> CompanyUser:
        membership = get_ctm_membership(self.context["request"].user)
        if membership is None:
            raise serializers.ValidationError("This account does not have CTM access.")
        if not can_manage_company_users(membership):
            raise serializers.ValidationError("You do not have permission to manage company users.")
        return membership

    def _validate_last_admin_guard(self, instance: CompanyUser, role: str, is_active: bool):
        if instance.role != CompanyUser.Role.COMPANY_ADMIN:
            return
        if role == CompanyUser.Role.COMPANY_ADMIN and is_active:
            return
        active_admins = CompanyUser.objects.filter(
            company=instance.company,
            role=CompanyUser.Role.COMPANY_ADMIN,
            is_active=True,
        ).exclude(pk=instance.pk)
        if not active_admins.exists():
            raise serializers.ValidationError("At least one active company admin must remain assigned to this company.")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if instance is None:
            username = attrs.get("username", "").strip()
            password = attrs.get("password")
            if not username:
                raise serializers.ValidationError({"username": "Username is required."})
            if not password:
                raise serializers.ValidationError({"password": "Password is required."})
            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError({"username": "This username is already in use."})
            email = attrs.get("email", "").strip()
            if email and User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "This email is already in use."})
            if "role" not in attrs:
                raise serializers.ValidationError({"role": "Role is required."})
            return attrs

        next_role = attrs.get("role", instance.role)
        next_active = attrs.get("isActive", instance.is_active)
        self._validate_last_admin_guard(instance, next_role, next_active)

        email = attrs.get("email")
        if email and User.objects.filter(email__iexact=email).exclude(pk=instance.user_id).exists():
            raise serializers.ValidationError({"email": "This email is already in use."})
        username = attrs.get("username")
        if username and User.objects.filter(username__iexact=username).exclude(pk=instance.user_id).exists():
            raise serializers.ValidationError({"username": "This username is already in use."})
        return attrs

    def create(self, validated_data):
        membership = self._membership()
        user = User.objects.create_user(
            username=validated_data["username"].strip(),
            email=validated_data.get("email", "").strip(),
            password=validated_data["password"],
            first_name=validated_data.get("firstName", "").strip(),
            last_name=validated_data.get("lastName", "").strip(),
            is_active=validated_data.get("isActive", True),
        )
        return CompanyUser.objects.create(
            company=membership.company,
            user=user,
            role=validated_data["role"],
            department=validated_data.get("department", ""),
            job_title=validated_data.get("jobTitle", ""),
            phone=validated_data.get("phone", ""),
            is_active=validated_data.get("isActive", True),
        )

    def update(self, instance: CompanyUser, validated_data):
        self._membership()
        user = instance.user
        if "username" in validated_data:
            user.username = validated_data["username"].strip()
        if "email" in validated_data:
            user.email = validated_data["email"].strip()
        if "firstName" in validated_data:
            user.first_name = validated_data["firstName"].strip()
        if "lastName" in validated_data:
            user.last_name = validated_data["lastName"].strip()
        if "isActive" in validated_data:
            user.is_active = validated_data["isActive"]
            instance.is_active = validated_data["isActive"]
        if "password" in validated_data:
            user.set_password(validated_data["password"])
        user.save()

        field_map = {
            "role": "role",
            "department": "department",
            "jobTitle": "job_title",
            "phone": "phone",
        }
        for key, field in field_map.items():
            if key in validated_data:
                setattr(instance, field, validated_data[key])
        instance.save()
        return instance


class CorporateApprovalSerializer(serializers.Serializer):
    stage = serializers.SerializerMethodField()
    approver = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    def get_stage(self, obj: TripApproval) -> str:
        return "Travel need" if obj.approval_type == TripApproval.ApprovalType.TRAVEL_NEED else "Final cost"

    def get_approver(self, obj: TripApproval) -> str:
        if obj.approver:
            full_name = f"{obj.approver.user.first_name} {obj.approver.user.last_name}".strip()
            return full_name or obj.approver.job_title or obj.approver.user.username
        if obj.decision_notes.startswith("Approval owner: "):
            return obj.decision_notes.replace("Approval owner: ", "")
        return "Approval owner"

    def get_status(self, obj: TripApproval) -> str:
        return obj.status.title()


class CorporateTimelineEventSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    title = serializers.CharField()
    meta = serializers.CharField(source="description")
    time = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    def get_time(self, obj: TripTimelineEvent) -> str:
        return obj.created_at.strftime("%H:%M")

    def get_type(self, obj: TripTimelineEvent) -> str:
        if obj.event_type in {TripTimelineEvent.EventType.APPROVED, TripTimelineEvent.EventType.BOOKED, TripTimelineEvent.EventType.COMPLETED, TripTimelineEvent.EventType.CREATED}:
            return "done"
        if obj.event_type in {TripTimelineEvent.EventType.REJECTED, TripTimelineEvent.EventType.DOCUMENTS_REQUESTED}:
            return "alert"
        return "pending"


class CorporateTripTaskSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    title = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    priority = serializers.CharField()
    visibility = serializers.CharField()
    dueDate = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    updatedAt = serializers.DateTimeField(source="updated_at")

    def get_dueDate(self, obj: TripTask) -> str:
        return format_portal_date(obj.due_date)

    def get_owner(self, obj: TripTask) -> str:
        if obj.owner_user:
            full_name = f"{obj.owner_user.first_name} {obj.owner_user.last_name}".strip()
            return full_name or obj.owner_user.username
        if obj.owner_company_user:
            full_name = f"{obj.owner_company_user.user.first_name} {obj.owner_company_user.user.last_name}".strip()
            return full_name or obj.owner_company_user.job_title or obj.owner_company_user.user.username
        return ""


class CorporateTripTaskWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[choice for choice, _ in TripTask.Status.choices], required=False)
    priority = serializers.ChoiceField(choices=[choice for choice, _ in TripTask.Priority.choices], required=False)
    visibility = serializers.ChoiceField(choices=[choice for choice, _ in TripTask.Visibility.choices], required=False)
    dueDate = serializers.DateField(required=False, allow_null=True)

    def create(self, validated_data):
        trip = self.context["trip_request"]
        request = self.context["request"]
        membership = get_ctm_membership(request.user)
        task = TripTask.objects.create(
            trip_request=trip,
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            status=validated_data.get("status", TripTask.Status.OPEN),
            priority=validated_data.get("priority", TripTask.Priority.MEDIUM),
            visibility=validated_data.get("visibility", TripTask.Visibility.SHARED),
            due_date=validated_data.get("dueDate"),
            owner_user=request.user if can_manage_trip_operations(request.user) else None,
            owner_company_user=membership if membership and can_manage_company_collaboration(membership) else None,
        )
        return task

    def update(self, instance: TripTask, validated_data):
        field_map = {
            "title": "title",
            "description": "description",
            "status": "status",
            "priority": "priority",
            "visibility": "visibility",
            "dueDate": "due_date",
        }
        for key, field in field_map.items():
            if key in validated_data:
                setattr(instance, field, validated_data[key])
        instance.save()
        return instance


class CorporateTripDocumentSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    title = serializers.CharField()
    documentType = serializers.CharField(source="document_type")
    status = serializers.CharField()
    visibility = serializers.CharField()
    fileUrl = serializers.CharField(source="file_url")
    notes = serializers.CharField()
    traveler = serializers.SerializerMethodField()
    updatedAt = serializers.DateTimeField(source="updated_at")

    def get_traveler(self, obj: TripDocument):
        if not obj.traveler:
            return None
        return {"id": str(obj.traveler.pk), "name": obj.traveler.full_name}


class CorporateTripDocumentWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180)
    documentType = serializers.ChoiceField(choices=[choice for choice, _ in TripDocument.DocumentType.choices], required=False)
    status = serializers.ChoiceField(choices=[choice for choice, _ in TripDocument.Status.choices], required=False)
    visibility = serializers.ChoiceField(choices=[choice for choice, _ in TripDocument.Visibility.choices], required=False)
    fileUrl = serializers.URLField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    travelerId = serializers.UUIDField(required=False, allow_null=True)

    def _resolve_traveler(self, trip: TripRequest, traveler_id):
        if traveler_id in (None, ""):
            return None
        return trip.company.travelers.get(pk=traveler_id)

    def create(self, validated_data):
        trip = self.context["trip_request"]
        request = self.context["request"]
        membership = get_ctm_membership(request.user)
        return TripDocument.objects.create(
            trip_request=trip,
            traveler=self._resolve_traveler(trip, validated_data.get("travelerId")),
            title=validated_data["title"],
            document_type=validated_data.get("documentType", TripDocument.DocumentType.OTHER),
            status=validated_data.get("status", TripDocument.Status.MISSING),
            visibility=validated_data.get("visibility", TripDocument.Visibility.SHARED),
            file_url=validated_data.get("fileUrl", ""),
            notes=validated_data.get("notes", ""),
            uploaded_by_user=request.user if can_manage_trip_operations(request.user) else None,
            uploaded_by_company_user=membership if membership and can_manage_company_collaboration(membership) else None,
        )

    def update(self, instance: TripDocument, validated_data):
        trip = instance.trip_request
        field_map = {
            "title": "title",
            "documentType": "document_type",
            "status": "status",
            "visibility": "visibility",
            "fileUrl": "file_url",
            "notes": "notes",
        }
        for key, field in field_map.items():
            if key in validated_data:
                setattr(instance, field, validated_data[key])
        if "travelerId" in validated_data:
            instance.traveler = self._resolve_traveler(trip, validated_data.get("travelerId"))
        instance.save()
        return instance


class CorporateTripMessageSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    senderType = serializers.CharField(source="sender_type")
    visibility = serializers.CharField()
    body = serializers.CharField()
    sender = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")

    def get_sender(self, obj: TripMessage) -> str:
        if obj.sender_user:
            full_name = f"{obj.sender_user.first_name} {obj.sender_user.last_name}".strip()
            return full_name or obj.sender_user.username
        if obj.sender_company_user:
            full_name = f"{obj.sender_company_user.user.first_name} {obj.sender_company_user.user.last_name}".strip()
            return full_name or obj.sender_company_user.job_title or obj.sender_company_user.user.username
        return "System"


class CorporateTripMessageWriteSerializer(serializers.Serializer):
    body = serializers.CharField()
    visibility = serializers.ChoiceField(choices=[choice for choice, _ in TripMessage.Visibility.choices], required=False)

    def create(self, validated_data):
        trip = self.context["trip_request"]
        request = self.context["request"]
        membership = get_ctm_membership(request.user)
        is_ops = can_manage_trip_operations(request.user)
        return TripMessage.objects.create(
            trip_request=trip,
            sender_type=TripMessage.SenderType.DPM if is_ops else TripMessage.SenderType.COMPANY,
            sender_user=request.user if is_ops else None,
            sender_company_user=membership if not is_ops else None,
            visibility=validated_data.get("visibility", TripMessage.Visibility.SHARED),
            body=validated_data["body"],
        )


class CorporateTripRequestSerializer(serializers.Serializer):
    id = serializers.CharField(source="reference_code")
    requestedBy = serializers.SerializerMethodField()
    requesterRole = serializers.SerializerMethodField()
    department = serializers.CharField()
    route = serializers.SerializerMethodField()
    origin = serializers.CharField()
    destination = serializers.CharField()
    travelDate = serializers.SerializerMethodField()
    travelers = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    purpose = serializers.CharField()
    budgetBand = serializers.CharField(source="budget_band")
    quotedCost = serializers.SerializerMethodField()
    finalCost = serializers.SerializerMethodField()
    quote = serializers.SerializerMethodField()
    booking = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()
    approvals = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    internalSummary = serializers.SerializerMethodField()

    def _can_view_internal(self) -> bool:
        request = self.context.get("request")
        return bool(request and can_manage_trip_operations(request.user))

    def get_requestedBy(self, obj: TripRequest) -> str:
        full_name = f"{obj.requested_by.user.first_name} {obj.requested_by.user.last_name}".strip()
        return full_name or obj.requested_by.job_title or obj.requested_by.user.username

    def get_requesterRole(self, obj: TripRequest) -> str:
        return format_role(obj.requested_by.role)

    def get_route(self, obj: TripRequest) -> str:
        return f"{obj.origin} -> {obj.destination}"

    def get_travelDate(self, obj: TripRequest) -> str:
        return format_portal_date(obj.departure_date)

    def get_travelers(self, obj: TripRequest):
        travelers = [assignment.traveler for assignment in obj.trip_travelers.select_related("traveler").all()]
        return CorporateTravelerSerializer(travelers, many=True).data

    def get_status(self, obj: TripRequest) -> str:
        return format_trip_status(obj.status)

    def get_services(self, obj: TripRequest):
        return list(obj.services.order_by("created_at").values_list("service_type", flat=True))

    def get_quotedCost(self, obj: TripRequest):
        return float(obj.quoted_cost) if obj.quoted_cost is not None else None

    def get_finalCost(self, obj: TripRequest):
        return float(obj.final_cost) if obj.final_cost is not None else None

    def get_quote(self, obj: TripRequest):
        quote = getattr(obj, "quote", None)
        if not quote:
            return None
        return CorporateTripQuoteSerializer(quote).data

    def get_booking(self, obj: TripRequest):
        booking = getattr(obj, "booking", None)
        if not booking:
            return None
        return CorporateTripBookingSerializer(booking).data

    def get_invoice(self, obj: TripRequest):
        invoice = getattr(obj, "invoice", None)
        if not invoice:
            return None
        return CorporateTripInvoiceSerializer(invoice).data

    def get_payments(self, obj: TripRequest):
        invoice = getattr(obj, "invoice", None)
        if not invoice:
            return []
        return CorporateTripPaymentSerializer(invoice.payments.order_by("-received_at", "-created_at")[:10], many=True).data

    def get_tasks(self, obj: TripRequest):
        queryset = obj.tasks.order_by("status", "due_date", "-updated_at")
        if not self._can_view_internal():
            queryset = queryset.filter(visibility=TripTask.Visibility.SHARED)
        return CorporateTripTaskSerializer(queryset[:8], many=True).data

    def get_documents(self, obj: TripRequest):
        queryset = obj.documents.order_by("-updated_at")
        if not self._can_view_internal():
            queryset = queryset.filter(visibility=TripDocument.Visibility.SHARED)
        return CorporateTripDocumentSerializer(queryset[:8], many=True).data

    def get_messages(self, obj: TripRequest):
        queryset = obj.messages.order_by("created_at")
        if not self._can_view_internal():
            queryset = queryset.filter(visibility=TripMessage.Visibility.SHARED)
        return CorporateTripMessageSerializer(queryset[:10], many=True).data

    def get_approvals(self, obj: TripRequest):
        return CorporateApprovalSerializer(obj.approvals.order_by("created_at"), many=True).data

    def get_timeline(self, obj: TripRequest):
        return CorporateTimelineEventSerializer(obj.timeline_events.order_by("-created_at")[:6], many=True).data

    def get_internalSummary(self, obj: TripRequest) -> str:
        return obj.internal_notes or obj.client_notes or "Corporate travel request tracked in the DPM workflow."


class CorporateItinerarySerializer(serializers.Serializer):
    id = serializers.CharField(source="reference_code")
    route = serializers.SerializerMethodField()
    travelWindow = serializers.SerializerMethodField()
    department = serializers.CharField()
    leadTraveler = serializers.SerializerMethodField()
    travelerCount = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    totalCost = serializers.SerializerMethodField()
    supportSummary = serializers.SerializerMethodField()
    latestSharedEvent = serializers.SerializerMethodField()

    def get_route(self, obj: TripRequest) -> str:
        return f"{obj.origin} -> {obj.destination}"

    def get_travelWindow(self, obj: TripRequest) -> str:
        if obj.return_date:
            return f"{format_portal_date(obj.departure_date)} - {format_portal_date(obj.return_date)}"
        return format_portal_date(obj.departure_date)

    def get_leadTraveler(self, obj: TripRequest) -> str:
        first_assignment = obj.trip_travelers.select_related("traveler").first()
        return first_assignment.traveler.full_name if first_assignment else "Traveler pending"

    def get_travelerCount(self, obj: TripRequest) -> int:
        return obj.trip_travelers.count()

    def get_services(self, obj: TripRequest):
        return list(obj.services.order_by("created_at").values_list("service_type", flat=True))

    def get_status(self, obj: TripRequest) -> str:
        return format_trip_status(obj.status)

    def get_totalCost(self, obj: TripRequest):
        value = obj.final_cost if obj.final_cost is not None else obj.quoted_cost
        return float(value) if value is not None else None

    def get_supportSummary(self, obj: TripRequest) -> str:
        return obj.internal_notes or obj.client_notes or "DPM itinerary support is active for this trip."

    def get_latestSharedEvent(self, obj: TripRequest):
        event = obj.timeline_events.filter(visibility=TripTimelineEvent.Visibility.SHARED).order_by("-created_at").first()
        if not event:
            return None
        return CorporateTimelineEventSerializer(event).data


class CorporateTripQuoteSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    tripRequestId = serializers.CharField(source="trip_request.reference_code")
    amount = serializers.SerializerMethodField()
    currency = serializers.CharField()
    validUntil = serializers.SerializerMethodField()
    notes = serializers.CharField()
    status = serializers.CharField()
    preparedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    def get_amount(self, obj: TripQuote):
        return float(obj.amount)

    def get_validUntil(self, obj: TripQuote) -> str:
        return format_portal_date(obj.valid_until)

    def get_preparedBy(self, obj: TripQuote) -> str:
        if not obj.prepared_by:
            return "DPM operations"
        full_name = f"{obj.prepared_by.first_name} {obj.prepared_by.last_name}".strip()
        return full_name or obj.prepared_by.username


class CorporateTripQuoteWriteSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=12, required=False, allow_blank=False)
    validUntil = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[choice for choice, _ in TripQuote.Status.choices], required=False)

    def create(self, validated_data):
        trip = self.context["trip_request"]
        request = self.context["request"]
        if hasattr(trip, "quote"):
            raise serializers.ValidationError("This trip request already has a quote.")
        quote = TripQuote.objects.create(
            trip_request=trip,
            prepared_by=request.user,
            amount=validated_data["amount"],
            currency=validated_data.get("currency") or trip.currency or "USD",
            valid_until=validated_data.get("validUntil"),
            notes=validated_data.get("notes", ""),
            status=validated_data.get("status", TripQuote.Status.DRAFT),
        )
        sync_trip_from_quote(trip, quote)
        return quote

    def update(self, instance: TripQuote, validated_data):
        if "amount" in validated_data:
            instance.amount = validated_data["amount"]
        if "currency" in validated_data:
            instance.currency = validated_data["currency"]
        if "validUntil" in validated_data:
            instance.valid_until = validated_data["validUntil"]
        if "notes" in validated_data:
            instance.notes = validated_data["notes"]
        if "status" in validated_data:
            instance.status = validated_data["status"]
        instance.save()
        sync_trip_from_quote(instance.trip_request, instance)
        return instance


class CorporateTripBookingSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    tripRequestId = serializers.CharField(source="trip_request.reference_code")
    bookingReference = serializers.CharField(source="booking_reference")
    supplierSummary = serializers.CharField(source="supplier_summary")
    totalCost = serializers.SerializerMethodField()
    currency = serializers.CharField()
    status = serializers.CharField()
    bookedAt = serializers.DateTimeField(source="booked_at", allow_null=True)
    bookedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    def get_totalCost(self, obj: TripBooking):
        return float(obj.total_cost) if obj.total_cost is not None else None

    def get_bookedBy(self, obj: TripBooking) -> str:
        if not obj.booked_by:
            return "DPM operations"
        full_name = f"{obj.booked_by.first_name} {obj.booked_by.last_name}".strip()
        return full_name or obj.booked_by.username


class CorporateTripBookingWriteSerializer(serializers.Serializer):
    bookingReference = serializers.CharField(max_length=80, required=False, allow_blank=True)
    supplierSummary = serializers.CharField(required=False, allow_blank=True)
    totalCost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    currency = serializers.CharField(max_length=12, required=False, allow_blank=False)
    status = serializers.ChoiceField(choices=[choice for choice, _ in TripBooking.Status.choices], required=False)
    bookedAt = serializers.DateTimeField(required=False, allow_null=True)

    def create(self, validated_data):
        trip = self.context["trip_request"]
        request = self.context["request"]
        if hasattr(trip, "booking"):
            raise serializers.ValidationError("This trip request already has a booking.")
        booking = TripBooking.objects.create(
            trip_request=trip,
            booked_by=request.user,
            booking_reference=validated_data.get("bookingReference", ""),
            supplier_summary=validated_data.get("supplierSummary", ""),
            total_cost=validated_data.get("totalCost"),
            currency=validated_data.get("currency") or trip.currency or "USD",
            status=validated_data.get("status", TripBooking.Status.PENDING),
            booked_at=validated_data.get("bookedAt"),
        )
        sync_trip_from_booking(trip, booking)
        return booking

    def update(self, instance: TripBooking, validated_data):
        if "bookingReference" in validated_data:
            instance.booking_reference = validated_data["bookingReference"]
        if "supplierSummary" in validated_data:
            instance.supplier_summary = validated_data["supplierSummary"]
        if "totalCost" in validated_data:
            instance.total_cost = validated_data["totalCost"]
        if "currency" in validated_data:
            instance.currency = validated_data["currency"]
        if "status" in validated_data:
            instance.status = validated_data["status"]
        if "bookedAt" in validated_data:
            instance.booked_at = validated_data["bookedAt"]
        instance.save()
        sync_trip_from_booking(instance.trip_request, instance)
        return instance


class CorporateTripInvoiceSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    tripRequestId = serializers.CharField(source="trip_request.reference_code")
    invoiceNumber = serializers.CharField(source="invoice_number")
    amount = serializers.SerializerMethodField()
    currency = serializers.CharField()
    status = serializers.CharField()
    issuedAt = serializers.DateTimeField(source="issued_at", allow_null=True)
    dueDate = serializers.SerializerMethodField()
    paidAt = serializers.DateTimeField(source="paid_at", allow_null=True)
    notes = serializers.CharField()
    issuedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    def get_amount(self, obj: TripInvoice):
        return float(obj.amount)

    def get_dueDate(self, obj: TripInvoice) -> str:
        return format_portal_date(obj.due_date)

    def get_issuedBy(self, obj: TripInvoice) -> str:
        if not obj.issued_by:
            return "DPM operations"
        full_name = f"{obj.issued_by.first_name} {obj.issued_by.last_name}".strip()
        return full_name or obj.issued_by.username


class CorporateTripInvoiceWriteSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=12, required=False, allow_blank=False)
    status = serializers.ChoiceField(choices=[choice for choice, _ in TripInvoice.Status.choices], required=False)
    issuedAt = serializers.DateTimeField(required=False, allow_null=True)
    dueDate = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        trip = self.context["trip_request"]
        request = self.context["request"]
        if hasattr(trip, "invoice"):
            raise serializers.ValidationError("This trip request already has an invoice.")
        invoice = TripInvoice.objects.create(
            trip_request=trip,
            issued_by=request.user,
            amount=validated_data["amount"],
            currency=validated_data.get("currency") or trip.currency or "USD",
            status=validated_data.get("status", TripInvoice.Status.DRAFT),
            issued_at=validated_data.get("issuedAt"),
            due_date=validated_data.get("dueDate"),
            notes=validated_data.get("notes", ""),
        )
        sync_trip_from_invoice(trip, invoice)
        sync_invoice_from_payments(invoice)
        return invoice

    def update(self, instance: TripInvoice, validated_data):
        if "amount" in validated_data:
            instance.amount = validated_data["amount"]
        if "currency" in validated_data:
            instance.currency = validated_data["currency"]
        if "status" in validated_data:
            instance.status = validated_data["status"]
        if "issuedAt" in validated_data:
            instance.issued_at = validated_data["issuedAt"]
        if "dueDate" in validated_data:
            instance.due_date = validated_data["dueDate"]
        if "notes" in validated_data:
            instance.notes = validated_data["notes"]
        instance.save()
        sync_trip_from_invoice(instance.trip_request, instance)
        sync_invoice_from_payments(instance)
        return instance


class CorporateTripPaymentSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="pk")
    invoiceId = serializers.UUIDField(source="invoice.pk")
    amount = serializers.SerializerMethodField()
    currency = serializers.CharField()
    paymentMethod = serializers.CharField(source="payment_method")
    status = serializers.CharField()
    reference = serializers.CharField()
    receivedAt = serializers.DateTimeField(source="received_at", allow_null=True)
    notes = serializers.CharField()
    recordedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    def get_amount(self, obj: TripPayment):
        return float(obj.amount)

    def get_recordedBy(self, obj: TripPayment) -> str:
        if not obj.recorded_by:
            return "DPM operations"
        full_name = f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}".strip()
        return full_name or obj.recorded_by.username


class CorporateTripPaymentWriteSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=12, required=False, allow_blank=False)
    paymentMethod = serializers.ChoiceField(choices=[choice for choice, _ in TripPayment.Method.choices], required=False)
    status = serializers.ChoiceField(choices=[choice for choice, _ in TripPayment.Status.choices], required=False)
    reference = serializers.CharField(max_length=80, required=False, allow_blank=True)
    receivedAt = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        invoice = self.context["invoice"]
        request = self.context["request"]
        payment = TripPayment.objects.create(
            invoice=invoice,
            amount=validated_data["amount"],
            currency=validated_data.get("currency") or invoice.currency or "USD",
            payment_method=validated_data.get("paymentMethod", TripPayment.Method.BANK_TRANSFER),
            status=validated_data.get("status", TripPayment.Status.PENDING),
            reference=validated_data.get("reference", ""),
            received_at=validated_data.get("receivedAt"),
            notes=validated_data.get("notes", ""),
            recorded_by=request.user,
        )
        sync_invoice_from_payments(invoice)
        return payment

    def update(self, instance: TripPayment, validated_data):
        if "amount" in validated_data:
            instance.amount = validated_data["amount"]
        if "currency" in validated_data:
            instance.currency = validated_data["currency"]
        if "paymentMethod" in validated_data:
            instance.payment_method = validated_data["paymentMethod"]
        if "status" in validated_data:
            instance.status = validated_data["status"]
        if "reference" in validated_data:
            instance.reference = validated_data["reference"]
        if "receivedAt" in validated_data:
            instance.received_at = validated_data["receivedAt"]
        if "notes" in validated_data:
            instance.notes = validated_data["notes"]
        instance.save()
        sync_invoice_from_payments(instance.invoice)
        return instance


class CorporateBillingSummarySerializer(serializers.Serializer):
    companyId = serializers.UUIDField()
    companyName = serializers.CharField()
    invoiceCount = serializers.IntegerField()
    sentCount = serializers.IntegerField()
    overdueCount = serializers.IntegerField()
    partiallyPaidCount = serializers.IntegerField()
    paidCount = serializers.IntegerField()
    totalInvoiced = serializers.FloatField()
    totalCollected = serializers.FloatField()
    outstandingBalance = serializers.FloatField()
    currency = serializers.CharField()


def sync_trip_from_quote(trip: TripRequest, quote: TripQuote):
    trip.quoted_cost = quote.amount
    trip.currency = quote.currency or trip.currency
    if quote.status in {TripQuote.Status.DRAFT, TripQuote.Status.SENT, TripQuote.Status.APPROVED}:
        trip.status = TripRequest.Status.QUOTE_READY
        trip.approval_stage = TripRequest.ApprovalStage.FINAL_COST
    trip.save(update_fields=["quoted_cost", "currency", "status", "approval_stage", "updated_at"])


def sync_trip_from_booking(trip: TripRequest, booking: TripBooking):
    trip.final_cost = booking.total_cost
    trip.currency = booking.currency or trip.currency
    if booking.status == TripBooking.Status.COMPLETED:
        trip.status = TripRequest.Status.COMPLETED
    elif booking.status in {TripBooking.Status.CONFIRMED, TripBooking.Status.TICKETED}:
        trip.status = TripRequest.Status.BOOKED
    if booking.status in {TripBooking.Status.CONFIRMED, TripBooking.Status.TICKETED, TripBooking.Status.COMPLETED} and booking.booked_at is None:
        booking.booked_at = timezone.now()
        booking.save(update_fields=["booked_at", "updated_at"])
    trip.save(update_fields=["final_cost", "currency", "status", "updated_at"])


def sync_trip_from_invoice(trip: TripRequest, invoice: TripInvoice):
    trip.final_cost = invoice.amount
    trip.currency = invoice.currency or trip.currency
    trip.save(update_fields=["final_cost", "currency", "updated_at"])


def sync_invoice_from_payments(invoice: TripInvoice):
    payments = list(invoice.payments.filter(status__in=[TripPayment.Status.RECEIVED, TripPayment.Status.RECONCILED]).order_by("-received_at", "-created_at"))
    total_paid = sum((payment.amount for payment in payments), Decimal("0.00"))

    update_fields = []
    if payments:
        latest_paid_at = next((payment.received_at for payment in payments if payment.received_at), None)
        if total_paid >= invoice.amount:
            if invoice.status != TripInvoice.Status.PAID:
                invoice.status = TripInvoice.Status.PAID
                update_fields.append("status")
            if latest_paid_at and invoice.paid_at != latest_paid_at:
                invoice.paid_at = latest_paid_at
                update_fields.append("paid_at")
        elif total_paid > 0:
            if invoice.status != TripInvoice.Status.PARTIALLY_PAID:
                invoice.status = TripInvoice.Status.PARTIALLY_PAID
                update_fields.append("status")
            if invoice.paid_at is not None:
                invoice.paid_at = None
                update_fields.append("paid_at")
    else:
        if invoice.status in {TripInvoice.Status.PARTIALLY_PAID, TripInvoice.Status.PAID}:
            invoice.status = TripInvoice.Status.SENT if invoice.issued_at else TripInvoice.Status.DRAFT
            update_fields.append("status")
        if invoice.paid_at is not None:
            invoice.paid_at = None
            update_fields.append("paid_at")

    if update_fields:
        update_fields.append("updated_at")
        invoice.save(update_fields=update_fields)


class CorporateTravelerCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    department = serializers.CharField()


class CorporateTripCreateSerializer(serializers.Serializer):
    department = serializers.CharField()
    origin = serializers.CharField()
    destination = serializers.CharField()
    departureDate = serializers.DateField()
    purpose = serializers.CharField()
    budgetBand = serializers.ChoiceField(choices=["lt1k", "1k_5k", "gt5k"])
    services = serializers.ListField(child=serializers.ChoiceField(choices=[choice for choice, _ in TripService.ServiceType.choices]), allow_empty=False)
    travelers = CorporateTravelerCreateSerializer(many=True, allow_empty=False)

    def create(self, validated_data):
        request = self.context["request"]
        company_user = get_ctm_membership(request.user)
        if company_user is None:
            raise serializers.ValidationError("This account does not have CTM access.")
        company = company_user.company
        budget_band = validated_data["budgetBand"]
        departure_date = validated_data["departureDate"]
        destination = validated_data["destination"]
        trip = TripRequest.objects.create(
            company=company,
            requested_by=company_user,
            department=validated_data["department"],
            origin=validated_data["origin"],
            destination=destination,
            departure_date=departure_date,
            purpose=validated_data["purpose"],
            budget_band=budget_band,
            request_type=TripRequest.RequestType.GROUP if len(validated_data["travelers"]) > 1 else TripRequest.RequestType.INDIVIDUAL,
            status=TripRequest.Status.PENDING_APPROVAL,
            approval_stage=TripRequest.ApprovalStage.TRAVEL_NEED,
            estimated_cost=Decimal(parse_budget_estimate(budget_band)),
            quoted_cost=Decimal(parse_budget_estimate(budget_band)) if budget_band == "lt1k" else None,
            internal_notes="New company request submitted to DPM. Waiting for the travel-need approval before quote validation moves forward.",
        )

        for traveler_payload in validated_data["travelers"]:
            traveler = Traveler.objects.create(
                company=company,
                full_name=traveler_payload["name"],
                email=traveler_payload["email"],
                department=traveler_payload["department"],
                passport_status=Traveler.PassportStatus.OK,
                visa_status=Traveler.VisaStatus.REQUIRED if destination.lower() == "dubai" else Traveler.VisaStatus.NOT_APPLICABLE,
            )
            TripTraveler.objects.create(
                trip_request=trip,
                traveler=traveler,
                document_status=TripTraveler.DocumentStatus.VISA_REQUIRED if traveler.visa_status == Traveler.VisaStatus.REQUIRED else TripTraveler.DocumentStatus.READY,
            )

        for service in validated_data["services"]:
            TripService.objects.create(trip_request=trip, service_type=service)

        travel_need_approver = f"{validated_data['department']} Manager"
        final_cost_approver = "Finance Controller" if budget_band == "gt5k" else "Travel Desk Manager"
        TripApproval.objects.create(
            trip_request=trip,
            approval_type=TripApproval.ApprovalType.TRAVEL_NEED,
            status=TripApproval.Status.PENDING,
            decision_notes=f"Approval owner: {travel_need_approver}",
        )
        TripApproval.objects.create(
            trip_request=trip,
            approval_type=TripApproval.ApprovalType.FINAL_COST,
            status=TripApproval.Status.APPROVED if budget_band == "lt1k" else TripApproval.Status.PENDING,
            decision_notes=f"Approval owner: {final_cost_approver}",
        )
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.COMPANY,
            actor_company_user=company_user,
            event_type=TripTimelineEvent.EventType.CREATED,
            title="Request submitted",
            description=f"{company_user.job_title or company_user.user.username} - {len(validated_data['travelers'])} traveler(s)",
        )
        TripTimelineEvent.objects.create(
            trip_request=trip,
            actor_type=TripTimelineEvent.ActorType.SYSTEM,
            event_type=TripTimelineEvent.EventType.UPDATED,
            title="Approval path opened",
            description=f"{travel_need_approver} notified",
        )
        return trip


class CorporateApprovalActionSerializer(serializers.Serializer):
    stage = serializers.ChoiceField(choices=["Travel need", "Final cost"])


class CtmLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs["username"]
        password = attrs["password"]
        user = authenticate(username=username, password=password)

        if user is None:
            try:
                matched_user = User.objects.get(email__iexact=username)
            except User.DoesNotExist:
                matched_user = None

            if matched_user is not None:
                user = authenticate(username=matched_user.username, password=password)

        if user is None:
            raise serializers.ValidationError("Invalid username/email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This CTM account is inactive.")

        membership = get_ctm_membership(user)
        if membership is None:
            raise serializers.ValidationError("This account does not have CTM access.")

        attrs["user"] = user
        attrs["membership"] = membership
        return attrs


class CtmSessionSerializer(serializers.Serializer):
    token = serializers.CharField()
    company = CorporatePortalCompanySerializer()
    user = CorporatePortalUserSerializer()


def build_context_payload(user: User):
    company_user = get_ctm_membership(user)
    if company_user is None:
        raise serializers.ValidationError("This account does not have CTM access.")
    return {"company": company_user.company, "user": company_user}
