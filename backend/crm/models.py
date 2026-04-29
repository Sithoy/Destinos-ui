import uuid

from django.db import models


class Client(models.Model):
    class ClientType(models.TextChoices):
        PRIVATE = "private", "Private"
        CORPORATE = "corporate", "Corporate"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    name = models.CharField(max_length=180)
    client_type = models.CharField(max_length=20, choices=ClientType.choices, default=ClientType.PRIVATE)
    company_name = models.CharField(max_length=180, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=80, blank=True)
    preferred_contact = models.CharField(max_length=80, blank=True)
    service_level = models.CharField(max_length=20, blank=True)
    owner = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name", "-updated_at"]
        indexes = [
            models.Index(fields=["client_type", "service_level"]),
            models.Index(fields=["name"]),
            models.Index(fields=["company_name"]),
        ]

    def __str__(self) -> str:
        return self.company_name or self.name


class Lead(models.Model):
    class ServiceKey(models.TextChoices):
        CLASSIC = "classic", "Classic"
        LUXURY = "luxury", "Luxury"
        CORPORATE = "corporate", "Corporate"

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Qualification"
        PLANNING = "planning", "Trip Design"
        PROPOSAL = "proposal", "Proposal Sent"
        WON = "won", "Confirmed"
        EXECUTION = "execution", "Execution"
        COMPLETED = "completed", "Completed"
        LOST = "lost", "Cancelled"

    class LifecycleStage(models.TextChoices):
        NEW_REQUEST = "new_request", "New Request"
        PENDING_INFORMATION = "pending_information", "Pending Information"
        VALIDATED = "validated", "Validated"
        QUOTE_IN_PROGRESS = "quote_in_progress", "Quote in Progress"
        QUOTE_SENT = "quote_sent", "Quote Sent"
        AWAITING_APPROVAL = "awaiting_approval", "Awaiting Approval"
        APPROVED = "approved", "Approved"
        AWAITING_PAYMENT_FINANCE = "awaiting_payment_finance", "Awaiting Payment / Finance"
        BOOKING_IN_PROGRESS = "booking_in_progress", "Booking in Progress"
        CONFIRMED = "confirmed", "Confirmed"
        TRAVEL_PACK_SENT = "travel_pack_sent", "Travel Pack Sent"
        IN_TRAVEL = "in_travel", "In Travel"
        COMPLETED = "completed", "Completed"
        CLOSED = "closed", "Closed"

    class EmailStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    service = models.CharField(max_length=160)
    service_key = models.CharField(max_length=20, choices=ServiceKey.choices)
    name = models.CharField(max_length=180)
    contact = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    whatsapp = models.CharField(max_length=80, blank=True)
    preferred_contact = models.CharField(max_length=80, blank=True)
    requested_services = models.TextField(blank=True)
    trip_type = models.CharField(max_length=120, blank=True)
    departure_city = models.CharField(max_length=120, blank=True)
    destination = models.CharField(max_length=180, blank=True)
    dates = models.CharField(max_length=140, blank=True)
    travelers = models.CharField(max_length=120, blank=True)
    budget = models.CharField(max_length=120, blank=True)
    urgency = models.CharField(max_length=120, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    lifecycle_stage = models.CharField(max_length=40, choices=LifecycleStage.choices, default=LifecycleStage.NEW_REQUEST)
    email_status = models.CharField(max_length=20, choices=EmailStatus.choices, default=EmailStatus.PENDING)
    internal_notes = models.TextField(blank=True)
    client = models.ForeignKey(Client, related_name="leads", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["lifecycle_stage", "service_key"]),
            models.Index(fields=["service_key", "created_at"]),
            models.Index(fields=["destination"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.destination or self.service}"
