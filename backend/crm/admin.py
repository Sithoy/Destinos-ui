from django.contrib import admin

from .models import AccommodationBlock, Client, ExperienceBlock, ItineraryStop, Lead, Quote, QuoteApproval, QuoteLine, TransportSegment, TripItinerary


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "client_type", "service_level", "owner", "email", "updated_at")
    list_filter = ("client_type", "service_level")
    search_fields = ("name", "company_name", "email", "phone", "notes", "owner")
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        ("Client", {"fields": ("id", "name", "client_type", "company_name", "service_level", "owner")}),
        ("Contact", {"fields": ("email", "phone", "preferred_contact")}),
        ("Notes", {"fields": ("notes",)}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "service_key", "destination", "status", "lifecycle_stage", "priority", "created_at")
    list_filter = ("service_key", "status", "lifecycle_stage", "priority", "email_status")
    search_fields = ("name", "email", "whatsapp", "destination", "notes", "internal_notes", "client__name", "client__company_name")
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        ("Client", {"fields": ("id", "name", "contact", "email", "whatsapp", "preferred_contact")}),
        ("Request", {"fields": ("client", "service", "service_key", "requested_services", "trip_type", "departure_city", "destination", "dates", "travelers", "budget", "urgency")}),
        ("Workflow", {"fields": ("status", "lifecycle_stage", "priority", "email_status", "notes", "internal_notes")}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )


class QuoteLineInline(admin.TabularInline):
    model = QuoteLine
    extra = 0
    fields = ("category", "supplier", "description", "quantity", "unit_cost", "unit_sell", "status")


class QuoteApprovalInline(admin.TabularInline):
    model = QuoteApproval
    extra = 0
    fields = ("approver_name", "approver_email", "decision", "decision_at", "notes")


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ("quote_number", "lead", "version", "status", "currency", "valid_until", "created_at")
    list_filter = ("status", "currency", "valid_until")
    search_fields = ("quote_number", "lead__name", "lead__email", "lead__destination", "notes")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [QuoteLineInline, QuoteApprovalInline]
    fieldsets = (
        ("Quote", {"fields": ("id", "lead", "quote_number", "version", "status", "currency", "valid_until")}),
        ("Workflow", {"fields": ("sent_at", "accepted_at", "notes")}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(QuoteLine)
class QuoteLineAdmin(admin.ModelAdmin):
    list_display = ("quote", "category", "supplier", "description", "quantity", "unit_cost", "unit_sell", "status")
    list_filter = ("category", "status")
    search_fields = ("quote__quote_number", "supplier", "description", "notes")


@admin.register(QuoteApproval)
class QuoteApprovalAdmin(admin.ModelAdmin):
    list_display = ("quote", "approver_name", "decision", "decision_at", "created_at")
    list_filter = ("decision",)
    search_fields = ("quote__quote_number", "approver_name", "approver_email", "notes")


class ItineraryStopInline(admin.TabularInline):
    model = ItineraryStop
    extra = 0
    fields = ("sequence_number", "city", "country", "arrival_date", "departure_date", "nights", "purpose")


class TransportSegmentInline(admin.TabularInline):
    model = TransportSegment
    extra = 0
    fields = ("sequence_number", "mode", "from_city", "to_city", "departure_at", "arrival_at", "booking_status")


@admin.register(TripItinerary)
class TripItineraryAdmin(admin.ModelAdmin):
    list_display = ("title", "lead", "status", "start_date", "end_date", "updated_at")
    list_filter = ("status", "start_date")
    search_fields = ("title", "lead__name", "lead__destination", "notes")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [ItineraryStopInline, TransportSegmentInline]
    fieldsets = (
        ("Itinerary", {"fields": ("id", "lead", "title", "status", "start_date", "end_date", "notes")}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )


class AccommodationBlockInline(admin.TabularInline):
    model = AccommodationBlock
    extra = 0
    fields = ("name", "accommodation_type", "room_type", "check_in", "check_out", "rooms", "booking_status")


class ExperienceBlockInline(admin.TabularInline):
    model = ExperienceBlock
    extra = 0
    fields = ("title", "category", "start_at", "supplier", "status")


@admin.register(ItineraryStop)
class ItineraryStopAdmin(admin.ModelAdmin):
    list_display = ("itinerary", "sequence_number", "city", "country", "arrival_date", "departure_date", "nights", "purpose")
    list_filter = ("purpose", "country")
    search_fields = ("city", "country", "notes", "itinerary__title", "itinerary__lead__name")
    inlines = [AccommodationBlockInline, ExperienceBlockInline]


@admin.register(AccommodationBlock)
class AccommodationBlockAdmin(admin.ModelAdmin):
    list_display = ("name", "stop", "accommodation_type", "room_type", "rooms", "booking_status")
    list_filter = ("accommodation_type", "booking_status")
    search_fields = ("name", "supplier", "room_type", "confirmation_reference", "notes")


@admin.register(TransportSegment)
class TransportSegmentAdmin(admin.ModelAdmin):
    list_display = ("itinerary", "sequence_number", "mode", "from_city", "to_city", "booking_status")
    list_filter = ("mode", "booking_status")
    search_fields = ("from_city", "to_city", "supplier", "reference", "notes")


@admin.register(ExperienceBlock)
class ExperienceBlockAdmin(admin.ModelAdmin):
    list_display = ("title", "stop", "category", "start_at", "supplier", "status")
    list_filter = ("status", "category")
    search_fields = ("title", "category", "supplier", "notes")
