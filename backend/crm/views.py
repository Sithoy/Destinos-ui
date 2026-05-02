from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import filters, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccommodationBlock, Client, ExperienceBlock, ItineraryStop, Lead, Quote, QuoteApproval, QuoteLine, TransportSegment, TripItinerary
from .serializers import (
    AccommodationBlockSerializer,
    ClientSerializer,
    ExperienceBlockSerializer,
    ItineraryStopSerializer,
    LeadSerializer,
    LoginSerializer,
    PublicLeadSerializer,
    QuoteApprovalSerializer,
    QuoteLineSerializer,
    QuoteSerializer,
    TransportSegmentSerializer,
    TripItinerarySerializer,
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


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.prefetch_related("lines", "approvals").select_related("lead")
    serializer_class = QuoteSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "status", "valid_until", "version"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
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


class QuoteLineViewSet(viewsets.ModelViewSet):
    queryset = QuoteLine.objects.select_related("quote", "quote__lead")
    serializer_class = QuoteLineSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "category", "status"]
    ordering = ["category", "created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
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


class QuoteApprovalViewSet(viewsets.ModelViewSet):
    queryset = QuoteApproval.objects.select_related("quote", "quote__lead")
    serializer_class = QuoteApprovalSerializer
    permission_classes = [HasCrmAccess]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at", "decision", "decision_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
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

    def get_queryset(self):
        queryset = super().get_queryset()
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

    def get_queryset(self):
        queryset = super().get_queryset()
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

    def get_queryset(self):
        queryset = super().get_queryset()
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

    def get_queryset(self):
        queryset = super().get_queryset()
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

    def get_queryset(self):
        queryset = super().get_queryset()
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
