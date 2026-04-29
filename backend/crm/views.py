from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import filters, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Client, Lead
from .serializers import (
    ClientSerializer,
    LeadSerializer,
    LoginSerializer,
    PublicLeadSerializer,
    UserManagementSerializer,
    UserSerializer,
    can_access_crm,
    can_manage_clients,
    can_manage_user_target,
    can_manage_users,
)


class HasCrmAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_access_crm(request.user))


class CanManageClients(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_manage_clients(request.user))


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_manage_users(request.user))

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and can_manage_user_target(request.user, obj))


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "priority", "status", "lifecycle_stage"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        service_key = self.request.query_params.get("serviceKey")
        status_value = self.request.query_params.get("status")
        lifecycle_stage = self.request.query_params.get("lifecycleStage")
        priority = self.request.query_params.get("priority")
        search = self.request.query_params.get("search")

        if service_key:
            queryset = queryset.filter(service_key=service_key)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if lifecycle_stage:
            queryset = queryset.filter(lifecycle_stage=lifecycle_stage)
        if priority:
            queryset = queryset.filter(priority=priority)
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


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "updated_at", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
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
                | Q(owner__icontains=search)
            )

        return queryset

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [HasCrmAccess(), CanManageClients()]
        return [HasCrmAccess()]


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

    def post(self, request):
        serializer = PublicLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        return Response(LeadSerializer(lead).data, status=status.HTTP_201_CREATED)


class AuthLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

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
