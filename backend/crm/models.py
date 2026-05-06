import uuid

from django.conf import settings
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
    ctm_request_reference = models.CharField(max_length=24, blank=True, db_index=True)
    company_account = models.ForeignKey(
        "ctm.CompanyAccount",
        related_name="crm_leads",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    client = models.ForeignKey(Client, related_name="leads", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["lifecycle_stage", "service_key"]),
            models.Index(fields=["service_key", "created_at"]),
            models.Index(fields=["company_account", "service_key"]),
            models.Index(fields=["destination"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.destination or self.service}"


class Quote(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        ACCEPTED = "accepted", "Accepted"
        REVISION_REQUESTED = "revision_requested", "Revision Requested"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    lead = models.ForeignKey(Lead, related_name="quotes", on_delete=models.CASCADE)
    quote_number = models.CharField(max_length=40, unique=True)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    currency = models.CharField(max_length=3, default="USD")
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lead", "status"]),
            models.Index(fields=["quote_number"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["lead", "version"], name="unique_quote_version_per_lead"),
        ]

    @property
    def subtotal_cost(self):
        return sum(line.total_cost for line in self.lines.all())

    @property
    def subtotal_sell(self):
        return sum(line.total_sell for line in self.lines.all())

    @property
    def margin(self):
        return self.subtotal_sell - self.subtotal_cost

    def __str__(self) -> str:
        return f"{self.quote_number} v{self.version}"


class QuoteLine(models.Model):
    class Category(models.TextChoices):
        FLIGHT = "flight", "Flight"
        HOTEL = "hotel", "Hotel"
        TRANSFER = "transfer", "Transfer"
        VISA = "visa", "Visa"
        ACTIVITY = "activity", "Activity"
        INSURANCE = "insurance", "Insurance"
        SERVICE_FEE = "service_fee", "Service Fee"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        RESEARCH = "research", "Research"
        QUOTED = "quoted", "Quoted"
        HELD = "held", "Held"
        CONFIRMED = "confirmed", "Confirmed"
        UNAVAILABLE = "unavailable", "Unavailable"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    quote = models.ForeignKey(Quote, related_name="lines", on_delete=models.CASCADE)
    category = models.CharField(max_length=30, choices=Category.choices)
    supplier = models.CharField(max_length=180, blank=True)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_sell = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.RESEARCH)
    confirmation_reference = models.CharField(max_length=120, blank=True)
    supplier_deadline = models.DateField(null=True, blank=True)
    booking_owner = models.CharField(max_length=120, blank=True)
    booking_notes = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["category", "created_at"]
        indexes = [
            models.Index(fields=["quote", "category"]),
            models.Index(fields=["status"]),
        ]

    @property
    def total_cost(self):
        return self.quantity * self.unit_cost

    @property
    def total_sell(self):
        return self.quantity * self.unit_sell

    @property
    def margin(self):
        return self.total_sell - self.total_cost

    def __str__(self) -> str:
        return f"{self.get_category_display()} - {self.description}"


class PaymentRecord(models.Model):
    class PaymentType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        BALANCE = "balance", "Balance"
        FULL = "full", "Full Payment"
        REFUND = "refund", "Refund"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    lead = models.ForeignKey(Lead, related_name="payment_records", on_delete=models.CASCADE)
    quote = models.ForeignKey(Quote, related_name="payment_records", on_delete=models.SET_NULL, null=True, blank=True)
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices, default=PaymentType.DEPOSIT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    currency = models.CharField(max_length=3, default="USD")
    amount_expected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    proof_received = models.BooleanField(default=False)
    proof_reference = models.CharField(max_length=180, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lead", "status"]),
            models.Index(fields=["quote", "status"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.lead.name} - {self.get_payment_type_display()} - {self.get_status_display()}"


class CommunicationRecord(models.Model):
    class Kind(models.TextChoices):
        PROPOSAL = "proposal", "Proposal"
        PAYMENT = "payment", "Payment Request"
        TRAVEL_PACK = "travel_pack", "Travel Pack"
        FOLLOW_UP = "follow_up", "Follow-up"

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"
        PHONE = "phone", "Phone"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        READY = "ready", "Ready"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    class ResponseStatus(models.TextChoices):
        NONE = "none", "No Response Needed"
        AWAITING = "awaiting", "Awaiting Response"
        RESPONDED = "responded", "Responded"
        ACTION_REQUIRED = "action_required", "Action Required"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    lead = models.ForeignKey(Lead, related_name="communications", on_delete=models.CASCADE)
    quote = models.ForeignKey(Quote, related_name="communications", on_delete=models.SET_NULL, null=True, blank=True)
    kind = models.CharField(max_length=30, choices=Kind.choices)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.EMAIL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    subject = models.CharField(max_length=180, blank=True)
    message = models.TextField()
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="crm_communications", on_delete=models.SET_NULL, null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    follow_up_due = models.DateTimeField(null=True, blank=True)
    response_status = models.CharField(max_length=30, choices=ResponseStatus.choices, default=ResponseStatus.AWAITING)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lead", "kind"]),
            models.Index(fields=["status", "response_status"]),
            models.Index(fields=["follow_up_due"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_kind_display()} - {self.lead.name}"


class WorkflowReminder(models.Model):
    class ReminderType(models.TextChoices):
        BLOCKER = "blocker", "Workflow Blocker"
        FOLLOW_UP = "follow_up", "Follow-up"
        PAYMENT_DUE = "payment_due", "Payment Due"
        BOOKING_DEADLINE = "booking_deadline", "Booking Deadline"
        TRAVEL_PACK = "travel_pack", "Travel Pack"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        DONE = "done", "Done"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    lead = models.ForeignKey(Lead, related_name="workflow_reminders", on_delete=models.CASCADE)
    communication = models.ForeignKey(CommunicationRecord, related_name="workflow_reminders", on_delete=models.SET_NULL, null=True, blank=True)
    reminder_type = models.CharField(max_length=30, choices=ReminderType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    source_stage = models.CharField(max_length=40, blank=True)
    title = models.CharField(max_length=180)
    message = models.TextField(blank=True)
    due_at = models.DateTimeField()
    assigned_to = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="crm_workflow_reminders", on_delete=models.SET_NULL, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["status", "due_at", "-created_at"]
        indexes = [
            models.Index(fields=["lead", "status"]),
            models.Index(fields=["reminder_type", "status"]),
            models.Index(fields=["due_at"]),
            models.Index(fields=["source_stage"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_reminder_type_display()} - {self.lead.name}"


class QuoteApproval(models.Model):
    class Decision(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        CHANGES_REQUESTED = "changes_requested", "Changes Requested"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    quote = models.ForeignKey(Quote, related_name="approvals", on_delete=models.CASCADE)
    approver_name = models.CharField(max_length=180)
    approver_email = models.EmailField(blank=True)
    decision = models.CharField(max_length=30, choices=Decision.choices, default=Decision.PENDING)
    decision_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["quote", "decision"]),
        ]

    def __str__(self) -> str:
        return f"{self.approver_name} - {self.get_decision_display()}"


class TripItinerary(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PROPOSED = "proposed", "Proposed"
        CONFIRMED = "confirmed", "Confirmed"
        IN_TRAVEL = "in_travel", "In Travel"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    lead = models.ForeignKey(Lead, related_name="itineraries", on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["lead", "start_date", "created_at"]
        indexes = [
            models.Index(fields=["lead", "status"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return self.title


class ItineraryStop(models.Model):
    class Purpose(models.TextChoices):
        LEISURE = "leisure", "Leisure"
        BUSINESS = "business", "Business"
        TRANSIT = "transit", "Transit"
        EVENT = "event", "Event"
        EXTENSION = "extension", "Extension"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    itinerary = models.ForeignKey(TripItinerary, related_name="stops", on_delete=models.CASCADE)
    sequence_number = models.PositiveIntegerField()
    city = models.CharField(max_length=140)
    country = models.CharField(max_length=140, blank=True)
    arrival_date = models.DateField(null=True, blank=True)
    departure_date = models.DateField(null=True, blank=True)
    nights = models.PositiveIntegerField(default=0)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.LEISURE)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["itinerary", "sequence_number"]
        indexes = [
            models.Index(fields=["itinerary", "sequence_number"]),
            models.Index(fields=["city", "country"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["itinerary", "sequence_number"], name="unique_stop_sequence_per_itinerary"),
        ]

    def __str__(self) -> str:
        return f"{self.sequence_number}. {self.city}"


class AccommodationBlock(models.Model):
    class AccommodationType(models.TextChoices):
        HOTEL = "hotel", "Hotel"
        RESORT = "resort", "Resort"
        LODGE = "lodge", "Lodge"
        VILLA = "villa", "Villa"
        APARTMENT = "apartment", "Apartment"
        CAMP = "camp", "Camp"
        CRUISE = "cruise", "Cruise"
        OTHER = "other", "Other"

    class BookingStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUOTED = "quoted", "Quoted"
        HELD = "held", "Held"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    stop = models.ForeignKey(ItineraryStop, related_name="accommodations", on_delete=models.CASCADE)
    name = models.CharField(max_length=180)
    accommodation_type = models.CharField(max_length=20, choices=AccommodationType.choices, default=AccommodationType.HOTEL)
    room_type = models.CharField(max_length=160, blank=True)
    board_basis = models.CharField(max_length=120, blank=True)
    check_in = models.DateField(null=True, blank=True)
    check_out = models.DateField(null=True, blank=True)
    rooms = models.PositiveIntegerField(default=1)
    supplier = models.CharField(max_length=180, blank=True)
    booking_status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.DRAFT)
    confirmation_reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["stop", "check_in", "name"]
        indexes = [
            models.Index(fields=["stop", "booking_status"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self) -> str:
        return self.name


class TransportSegment(models.Model):
    class Mode(models.TextChoices):
        FLIGHT = "flight", "Flight"
        TRAIN = "train", "Train"
        CAR = "car", "Car"
        FERRY = "ferry", "Ferry"
        TRANSFER = "transfer", "Transfer"
        OTHER = "other", "Other"

    class BookingStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUOTED = "quoted", "Quoted"
        HELD = "held", "Held"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    itinerary = models.ForeignKey(TripItinerary, related_name="transports", on_delete=models.CASCADE)
    sequence_number = models.PositiveIntegerField()
    mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.FLIGHT)
    from_city = models.CharField(max_length=140)
    to_city = models.CharField(max_length=140)
    departure_at = models.DateTimeField(null=True, blank=True)
    arrival_at = models.DateTimeField(null=True, blank=True)
    supplier = models.CharField(max_length=180, blank=True)
    booking_status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.DRAFT)
    reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["itinerary", "sequence_number"]
        indexes = [
            models.Index(fields=["itinerary", "sequence_number"]),
            models.Index(fields=["booking_status"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["itinerary", "sequence_number"], name="unique_transport_sequence_per_itinerary"),
        ]

    def __str__(self) -> str:
        return f"{self.get_mode_display()}: {self.from_city} to {self.to_city}"


class ExperienceBlock(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUOTED = "quoted", "Quoted"
        HELD = "held", "Held"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    stop = models.ForeignKey(ItineraryStop, related_name="experiences", on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=120, blank=True)
    start_at = models.DateTimeField(null=True, blank=True)
    supplier = models.CharField(max_length=180, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["stop", "start_at", "title"]
        indexes = [
            models.Index(fields=["stop", "status"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self) -> str:
        return self.title
