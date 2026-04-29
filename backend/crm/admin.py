from django.contrib import admin

from .models import Client, Lead


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
