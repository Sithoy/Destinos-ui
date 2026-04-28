import uuid

from django.contrib.auth.models import User
from django.db import models

from crm.models import Client


class CompanyAccount(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PROSPECT = "prospect", "Prospect"

    class ServiceLevel(models.TextChoices):
        CLASSIC = "classic", "Classic"
        CORPORATE = "corporate", "Corporate"
        PRESTIGE_CORPORATE = "prestige_corporate", "Prestige Corporate"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.OneToOneField(
        Client,
        related_name="company_account",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=180)
    legal_name = models.CharField(max_length=220, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=120, blank=True)
    billing_email = models.EmailField(blank=True)
    default_currency = models.CharField(max_length=12, default="USD")
    service_level = models.CharField(
        max_length=32,
        choices=ServiceLevel.choices,
        default=ServiceLevel.CORPORATE,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["status", "service_level"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self) -> str:
        return self.name


class CompanyUser(models.Model):
    class Role(models.TextChoices):
        EMPLOYEE = "employee", "Employee"
        TRAVEL_COORDINATOR = "travel_coordinator", "Travel Coordinator"
        MANAGER = "manager", "Manager"
        FINANCE_APPROVER = "finance_approver", "Finance Approver"
        COMPANY_ADMIN = "company_admin", "Company Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(CompanyAccount, related_name="company_users", on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name="company_memberships", on_delete=models.CASCADE)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.EMPLOYEE)
    department = models.CharField(max_length=120, blank=True)
    job_title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company__name", "user__username"]
        constraints = [
            models.UniqueConstraint(fields=["company", "user"], name="unique_company_user_membership"),
        ]
        indexes = [
            models.Index(fields=["company", "role"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.company.name} - {self.user.username}"


class Traveler(models.Model):
    class PassportStatus(models.TextChoices):
        OK = "ok", "OK"
        MISSING = "missing", "Missing"
        EXPIRED = "expired", "Expired"

    class VisaStatus(models.TextChoices):
        OK = "ok", "OK"
        REQUIRED = "required", "Required"
        PENDING = "pending", "Pending"
        NOT_APPLICABLE = "n_a", "Not applicable"
        UNKNOWN = "unknown", "Unknown"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(CompanyAccount, related_name="travelers", on_delete=models.CASCADE)
    full_name = models.CharField(max_length=180)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=80, blank=True)
    department = models.CharField(max_length=120, blank=True)
    nationality = models.CharField(max_length=120, blank=True)
    passport_number = models.CharField(max_length=80, blank=True)
    passport_expiry = models.DateField(null=True, blank=True)
    passport_status = models.CharField(max_length=20, choices=PassportStatus.choices, default=PassportStatus.MISSING)
    visa_status = models.CharField(max_length=20, choices=VisaStatus.choices, default=VisaStatus.UNKNOWN)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company__name", "full_name"]
        indexes = [
            models.Index(fields=["company", "department"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["passport_status", "visa_status"]),
        ]

    def __str__(self) -> str:
        return self.full_name


class TripRequest(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending approval"
        APPROVED = "approved", "Approved"
        QUOTE_READY = "quote_ready", "Quote ready"
        FINAL_APPROVAL = "final_approval", "Final approval"
        BOOKED = "booked", "Booked"
        NEEDS_DOCUMENTS = "needs_documents", "Needs documents"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"

    class RequestType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        GROUP = "group", "Group"

    class ApprovalStage(models.TextChoices):
        NONE = "none", "None"
        TRAVEL_NEED = "travel_need", "Travel need"
        FINAL_COST = "final_cost", "Final cost"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_code = models.CharField(max_length=24, unique=True, blank=True)
    company = models.ForeignKey(CompanyAccount, related_name="trip_requests", on_delete=models.CASCADE)
    requested_by = models.ForeignKey(CompanyUser, related_name="trip_requests", on_delete=models.PROTECT)
    owner = models.ForeignKey(
        User,
        related_name="assigned_trip_requests",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    travelers = models.ManyToManyField(Traveler, through="TripTraveler", related_name="trip_requests", blank=True)
    department = models.CharField(max_length=120, blank=True)
    cost_center = models.CharField(max_length=120, blank=True)
    origin = models.CharField(max_length=120)
    destination = models.CharField(max_length=180)
    departure_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    purpose = models.TextField(blank=True)
    budget_band = models.CharField(max_length=80, blank=True)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quoted_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    final_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=12, default="USD")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    request_type = models.CharField(max_length=20, choices=RequestType.choices, default=RequestType.INDIVIDUAL)
    approval_stage = models.CharField(max_length=20, choices=ApprovalStage.choices, default=ApprovalStage.NONE)
    client_notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["reference_code"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "departure_date"]),
            models.Index(fields=["requested_by", "status"]),
        ]

    def __str__(self) -> str:
        return self.reference_code or f"{self.company.name} - {self.origin} to {self.destination}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            last_code = (
                TripRequest.objects.exclude(reference_code="")
                .order_by("-created_at")
                .values_list("reference_code", flat=True)
                .first()
            )
            next_number = 2401
            if last_code and last_code.startswith("DPM-"):
                try:
                    next_number = int(last_code.replace("DPM-", "")) + 1
                except ValueError:
                    next_number = 2401
            self.reference_code = f"DPM-{next_number}"
        super().save(*args, **kwargs)


class TripTraveler(models.Model):
    class DocumentStatus(models.TextChoices):
        READY = "ready", "Ready"
        MISSING_PASSPORT = "missing_passport", "Missing passport"
        VISA_REQUIRED = "visa_required", "Visa required"
        PENDING_DOCS = "pending_docs", "Pending documents"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="trip_travelers", on_delete=models.CASCADE)
    traveler = models.ForeignKey(Traveler, related_name="trip_assignments", on_delete=models.CASCADE)
    document_status = models.CharField(max_length=24, choices=DocumentStatus.choices, default=DocumentStatus.READY)
    special_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["trip_request", "traveler"], name="unique_trip_request_traveler"),
        ]
        indexes = [
            models.Index(fields=["trip_request", "document_status"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} - {self.traveler.full_name}"


class TripService(models.Model):
    class ServiceType(models.TextChoices):
        FLIGHT = "Flight", "Flight"
        HOTEL = "Hotel", "Hotel"
        TRANSFER = "Transfer", "Transfer"
        VISA_SUPPORT = "Visa support", "Visa support"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="services", on_delete=models.CASCADE)
    service_type = models.CharField(max_length=32, choices=ServiceType.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["trip_request", "service_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} - {self.service_type}"


class TripApproval(models.Model):
    class ApprovalType(models.TextChoices):
        TRAVEL_NEED = "travel_need", "Travel need"
        FINAL_COST = "final_cost", "Final cost"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        RETURNED = "returned", "Returned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="approvals", on_delete=models.CASCADE)
    approval_type = models.CharField(max_length=20, choices=ApprovalType.choices)
    approver = models.ForeignKey(
        CompanyUser,
        related_name="trip_approvals",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    decision_notes = models.TextField(blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["trip_request", "status"]),
            models.Index(fields=["approval_type", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} - {self.approval_type}"


class TripQuote(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.OneToOneField(TripRequest, related_name="quote", on_delete=models.CASCADE)
    prepared_by = models.ForeignKey(
        User,
        related_name="prepared_trip_quotes",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=12, default="USD")
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["status", "updated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} quote"


class TripBooking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        TICKETED = "ticketed", "Ticketed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.OneToOneField(TripRequest, related_name="booking", on_delete=models.CASCADE)
    booked_by = models.ForeignKey(
        User,
        related_name="managed_trip_bookings",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    booking_reference = models.CharField(max_length=80, blank=True)
    supplier_summary = models.TextField(blank=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=12, default="USD")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    booked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["status", "updated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} booking"


class TripInvoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        PARTIALLY_PAID = "partially_paid", "Partially paid"
        PAID = "paid", "Paid"
        VOID = "void", "Void"
        OVERDUE = "overdue", "Overdue"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.OneToOneField(TripRequest, related_name="invoice", on_delete=models.CASCADE)
    invoice_number = models.CharField(max_length=80, unique=True, blank=True)
    issued_by = models.ForeignKey(
        User,
        related_name="issued_trip_invoices",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=12, default="USD")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    issued_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["status", "updated_at"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self) -> str:
        return self.invoice_number or f"{self.trip_request.reference_code} invoice"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last_number = (
                TripInvoice.objects.exclude(invoice_number="")
                .order_by("-created_at")
                .values_list("invoice_number", flat=True)
                .first()
            )
            next_number = 1001
            if last_number and last_number.startswith("INV-"):
                try:
                    next_number = int(last_number.replace("INV-", "")) + 1
                except ValueError:
                    next_number = 1001
            self.invoice_number = f"INV-{next_number}"
        super().save(*args, **kwargs)


class TripPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RECEIVED = "received", "Received"
        RECONCILED = "reconciled", "Reconciled"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class Method(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Bank transfer"
        CARD = "card", "Card"
        CASH = "cash", "Cash"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(TripInvoice, related_name="payments", on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=12, default="USD")
    payment_method = models.CharField(max_length=20, choices=Method.choices, default=Method.BANK_TRANSFER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reference = models.CharField(max_length=80, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User,
        related_name="recorded_trip_payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-received_at", "-created_at"]
        indexes = [
            models.Index(fields=["invoice", "status"]),
            models.Index(fields=["payment_method", "status"]),
            models.Index(fields=["reference"]),
        ]

    def __str__(self) -> str:
        return self.reference or f"{self.invoice.invoice_number} payment"


class TripTask(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"
        BLOCKED = "blocked", "Blocked"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Visibility(models.TextChoices):
        SHARED = "shared", "Shared"
        INTERNAL_ONLY = "internal_only", "Internal only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="tasks", on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.MEDIUM)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.SHARED)
    due_date = models.DateField(null=True, blank=True)
    owner_user = models.ForeignKey(
        User,
        related_name="trip_tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    owner_company_user = models.ForeignKey(
        CompanyUser,
        related_name="assigned_trip_tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "due_date", "-updated_at"]
        indexes = [
            models.Index(fields=["trip_request", "status"]),
            models.Index(fields=["visibility", "priority"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} - {self.title}"


class TripDocument(models.Model):
    class DocumentType(models.TextChoices):
        PASSPORT = "passport", "Passport"
        VISA = "visa", "Visa"
        ITINERARY = "itinerary", "Itinerary"
        APPROVAL = "approval", "Approval"
        INVOICE = "invoice", "Invoice"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        MISSING = "missing", "Missing"
        REQUESTED = "requested", "Requested"
        RECEIVED = "received", "Received"
        VERIFIED = "verified", "Verified"
        ISSUED = "issued", "Issued"

    class Visibility(models.TextChoices):
        SHARED = "shared", "Shared"
        INTERNAL_ONLY = "internal_only", "Internal only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="documents", on_delete=models.CASCADE)
    traveler = models.ForeignKey(
        Traveler,
        related_name="trip_documents",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=180)
    document_type = models.CharField(max_length=20, choices=DocumentType.choices, default=DocumentType.OTHER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.MISSING)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.SHARED)
    file_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    uploaded_by_user = models.ForeignKey(
        User,
        related_name="uploaded_trip_documents",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    uploaded_by_company_user = models.ForeignKey(
        CompanyUser,
        related_name="uploaded_trip_documents",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["trip_request", "status"]),
            models.Index(fields=["document_type", "visibility"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} - {self.title}"


class TripMessage(models.Model):
    class SenderType(models.TextChoices):
        DPM = "dpm", "DPM"
        COMPANY = "company", "Company"
        SYSTEM = "system", "System"

    class Visibility(models.TextChoices):
        SHARED = "shared", "Shared"
        INTERNAL_ONLY = "internal_only", "Internal only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="messages", on_delete=models.CASCADE)
    sender_type = models.CharField(max_length=20, choices=SenderType.choices, default=SenderType.COMPANY)
    sender_user = models.ForeignKey(
        User,
        related_name="trip_messages",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    sender_company_user = models.ForeignKey(
        CompanyUser,
        related_name="trip_messages",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.SHARED)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["trip_request", "created_at"]),
            models.Index(fields=["visibility", "sender_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} message"


class TripTimelineEvent(models.Model):
    class ActorType(models.TextChoices):
        DPM = "dpm", "DPM"
        COMPANY = "company", "Company"
        SYSTEM = "system", "System"

    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        RETURNED = "returned", "Returned"
        QUOTE_SENT = "quote_sent", "Quote sent"
        DOCUMENTS_REQUESTED = "documents_requested", "Documents requested"
        BOOKED = "booked", "Booked"
        COMPLETED = "completed", "Completed"
        NOTE = "note", "Note"

    class Visibility(models.TextChoices):
        SHARED = "shared", "Shared"
        INTERNAL_ONLY = "internal_only", "Internal only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_request = models.ForeignKey(TripRequest, related_name="timeline_events", on_delete=models.CASCADE)
    actor_type = models.CharField(max_length=20, choices=ActorType.choices, default=ActorType.SYSTEM)
    actor_user = models.ForeignKey(
        User,
        related_name="trip_timeline_events",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    actor_company_user = models.ForeignKey(
        CompanyUser,
        related_name="timeline_events",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices, default=EventType.NOTE)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.SHARED)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["trip_request", "created_at"]),
            models.Index(fields=["event_type", "visibility"]),
        ]

    def __str__(self) -> str:
        return f"{self.trip_request.reference_code} - {self.title}"
