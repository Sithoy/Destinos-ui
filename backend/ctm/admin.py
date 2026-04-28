from django.contrib import admin

from .models import CompanyAccount, CompanyUser, Traveler, TripApproval, TripBooking, TripDocument, TripInvoice, TripMessage, TripPayment, TripQuote, TripRequest, TripService, TripTask, TripTimelineEvent, TripTraveler


@admin.register(CompanyAccount)
class CompanyAccountAdmin(admin.ModelAdmin):
    list_display = ("name", "service_level", "status", "default_currency", "updated_at")
    list_filter = ("service_level", "status")
    search_fields = ("name", "legal_name", "billing_email")


@admin.register(CompanyUser)
class CompanyUserAdmin(admin.ModelAdmin):
    list_display = ("company", "user", "role", "department", "is_active", "updated_at")
    list_filter = ("role", "is_active", "company")
    search_fields = ("company__name", "user__username", "user__email", "department")


@admin.register(Traveler)
class TravelerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "company", "department", "passport_status", "visa_status", "is_active")
    list_filter = ("company", "passport_status", "visa_status", "is_active")
    search_fields = ("full_name", "email", "passport_number")


class TripTravelerInline(admin.TabularInline):
    model = TripTraveler
    extra = 0


class TripApprovalInline(admin.TabularInline):
    model = TripApproval
    extra = 0


class TripServiceInline(admin.TabularInline):
    model = TripService
    extra = 0


class TripTimelineEventInline(admin.TabularInline):
    model = TripTimelineEvent
    extra = 0


class TripTaskInline(admin.TabularInline):
    model = TripTask
    extra = 0


class TripDocumentInline(admin.TabularInline):
    model = TripDocument
    extra = 0


class TripMessageInline(admin.TabularInline):
    model = TripMessage
    extra = 0


class TripQuoteInline(admin.StackedInline):
    model = TripQuote
    extra = 0


class TripBookingInline(admin.StackedInline):
    model = TripBooking
    extra = 0


class TripInvoiceInline(admin.StackedInline):
    model = TripInvoice
    extra = 0


class TripPaymentInline(admin.TabularInline):
    model = TripPayment
    extra = 0


@admin.register(TripRequest)
class TripRequestAdmin(admin.ModelAdmin):
    list_display = ("reference_code", "company", "origin", "destination", "departure_date", "status", "approval_stage", "owner")
    list_filter = ("company", "status", "approval_stage", "request_type")
    search_fields = ("reference_code", "company__name", "origin", "destination", "requested_by__user__username")
    inlines = [TripTravelerInline, TripServiceInline, TripApprovalInline, TripQuoteInline, TripBookingInline, TripInvoiceInline, TripTaskInline, TripDocumentInline, TripMessageInline, TripTimelineEventInline]


@admin.register(TripTraveler)
class TripTravelerAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "traveler", "document_status", "created_at")
    list_filter = ("document_status",)
    search_fields = ("traveler__full_name", "trip_request__company__name", "trip_request__destination")


@admin.register(TripService)
class TripServiceAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "service_type", "created_at")
    list_filter = ("service_type",)
    search_fields = ("trip_request__reference_code", "trip_request__company__name")


@admin.register(TripApproval)
class TripApprovalAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "approval_type", "approver", "status", "decided_at")
    list_filter = ("approval_type", "status")
    search_fields = ("trip_request__company__name", "approver__user__username")


@admin.register(TripQuote)
class TripQuoteAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "amount", "currency", "status", "valid_until", "prepared_by")
    list_filter = ("status", "currency")
    search_fields = ("trip_request__reference_code", "trip_request__company__name", "prepared_by__username")


@admin.register(TripBooking)
class TripBookingAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "booking_reference", "status", "total_cost", "currency", "booked_by", "booked_at")
    list_filter = ("status", "currency")
    search_fields = ("trip_request__reference_code", "trip_request__company__name", "booking_reference")


@admin.register(TripInvoice)
class TripInvoiceAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "invoice_number", "status", "amount", "currency", "due_date", "paid_at")
    list_filter = ("status", "currency")
    search_fields = ("trip_request__reference_code", "trip_request__company__name", "invoice_number")
    inlines = [TripPaymentInline]


@admin.register(TripPayment)
class TripPaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "reference", "status", "amount", "currency", "payment_method", "received_at")
    list_filter = ("status", "currency", "payment_method")
    search_fields = ("invoice__invoice_number", "invoice__trip_request__reference_code", "reference")


@admin.register(TripTimelineEvent)
class TripTimelineEventAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "title", "event_type", "actor_type", "visibility", "created_at")
    list_filter = ("event_type", "actor_type", "visibility")
    search_fields = ("trip_request__company__name", "title", "description")


@admin.register(TripTask)
class TripTaskAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "title", "status", "priority", "visibility", "due_date")
    list_filter = ("status", "priority", "visibility")
    search_fields = ("trip_request__reference_code", "trip_request__company__name", "title", "description")


@admin.register(TripDocument)
class TripDocumentAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "title", "document_type", "status", "visibility", "traveler", "updated_at")
    list_filter = ("document_type", "status", "visibility")
    search_fields = ("trip_request__reference_code", "trip_request__company__name", "title", "traveler__full_name")


@admin.register(TripMessage)
class TripMessageAdmin(admin.ModelAdmin):
    list_display = ("trip_request", "sender_type", "visibility", "created_at")
    list_filter = ("sender_type", "visibility")
    search_fields = ("trip_request__reference_code", "trip_request__company__name", "body")
