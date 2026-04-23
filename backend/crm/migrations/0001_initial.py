# Generated for the DPM CRM MVP.

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Lead",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("service", models.CharField(max_length=160)),
                ("service_key", models.CharField(choices=[("classic", "Classic"), ("luxury", "Luxury"), ("corporate", "Corporate")], max_length=20)),
                ("name", models.CharField(max_length=180)),
                ("contact", models.CharField(blank=True, max_length=255)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("whatsapp", models.CharField(blank=True, max_length=80)),
                ("preferred_contact", models.CharField(blank=True, max_length=80)),
                ("requested_services", models.TextField(blank=True)),
                ("trip_type", models.CharField(blank=True, max_length=120)),
                ("departure_city", models.CharField(blank=True, max_length=120)),
                ("destination", models.CharField(blank=True, max_length=180)),
                ("dates", models.CharField(blank=True, max_length=140)),
                ("travelers", models.CharField(blank=True, max_length=120)),
                ("budget", models.CharField(blank=True, max_length=120)),
                ("urgency", models.CharField(blank=True, max_length=120)),
                ("priority", models.CharField(choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")], default="normal", max_length=20)),
                ("notes", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("new", "New"), ("contacted", "Qualification"), ("planning", "Trip Design"), ("proposal", "Proposal Sent"), ("won", "Confirmed"), ("execution", "Execution"), ("completed", "Completed"), ("lost", "Cancelled")], default="new", max_length=20)),
                ("email_status", models.CharField(choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed")], default="pending", max_length=20)),
                ("internal_notes", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(model_name="lead", index=models.Index(fields=["status", "priority"], name="crm_lead_status__eb26e9_idx")),
        migrations.AddIndex(model_name="lead", index=models.Index(fields=["service_key", "created_at"], name="crm_lead_service_07e1d6_idx")),
        migrations.AddIndex(model_name="lead", index=models.Index(fields=["destination"], name="crm_lead_destina_cbf7f8_idx")),
    ]
