from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
from rest_framework import serializers

from .models import Client, Lead


CRM_GROUP_ROLE_MAP = {
    "crm_admin": "admin",
    "crm_manager": "manager",
    "crm_agent": "agent",
    "crm_viewer": "viewer",
    "client": "client",
}

CRM_ROLE_GROUP_MAP = {role: group for group, role in CRM_GROUP_ROLE_MAP.items()}
CRM_ALLOWED_ROLES = {"admin", "manager", "agent", "viewer"}


def get_user_role(user: User) -> str:
    if user.is_superuser:
        return "admin"

    group_names = set(user.groups.values_list("name", flat=True))
    for group_name, role in CRM_GROUP_ROLE_MAP.items():
        if group_name in group_names:
            return role

    if user.is_staff:
        return "manager"

    return "none"


def can_access_crm(user: User) -> bool:
    return get_user_role(user) in CRM_ALLOWED_ROLES


def can_manage_clients(user: User) -> bool:
    return get_user_role(user) in {"admin", "manager", "agent"}


def can_manage_users(user: User) -> bool:
    return get_user_role(user) in {"admin", "manager"}


def can_manage_user_target(actor: User, target: User) -> bool:
    actor_role = get_user_role(actor)
    target_role = get_user_role(target)

    if actor_role == "admin":
        return True
    if actor_role == "manager":
        return target_role in {"agent", "viewer", "client", "none"}
    return False


def can_assign_user_role(actor: User, role: str) -> bool:
    actor_role = get_user_role(actor)

    if actor_role == "admin":
        return role in {"admin", "manager", "agent", "viewer"}
    if actor_role == "manager":
        return role in {"agent", "viewer"}
    return False


def assign_user_role(user: User, role: str) -> User:
    crm_groups = list(Group.objects.filter(name__in=CRM_GROUP_ROLE_MAP.keys()))
    if crm_groups:
        user.groups.remove(*crm_groups)

    group_name = CRM_ROLE_GROUP_MAP.get(role)
    if group_name:
        group, _ = Group.objects.get_or_create(name=group_name)
        user.groups.add(group)

    if role in {"admin", "manager"}:
        user.is_staff = True
    elif role in {"agent", "viewer", "client", "none"}:
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
            "notes",
            "lastRequestAt",
            "activeRequestCount",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt", "lastRequestAt", "activeRequestCount"]

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
    clientId = serializers.PrimaryKeyRelatedField(source="client", queryset=Client.objects.all(), required=False, allow_null=True)
    clientName = serializers.CharField(source="client.name", read_only=True)

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
            "clientId",
            "clientName",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]


class PublicLeadSerializer(LeadSerializer):
    class Meta(LeadSerializer.Meta):
        read_only_fields = ["id", "createdAt", "updatedAt", "status", "lifecycleStage", "internalNotes"]


class LoginSerializer(serializers.Serializer):
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
            raise serializers.ValidationError("This CRM account is inactive.")

        if not can_access_crm(user):
            raise serializers.ValidationError("This account does not have CRM access.")

        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    canAccessCrm = serializers.SerializerMethodField()
    canManageClients = serializers.SerializerMethodField()
    canManageUsers = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_staff", "role", "canAccessCrm", "canManageClients", "canManageUsers"]

    def get_role(self, obj: User) -> str:
        return get_user_role(obj)

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
        if value not in {"admin", "manager", "agent", "viewer"}:
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
