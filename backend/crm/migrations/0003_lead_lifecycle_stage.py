# Generated for DPM CRM value-chain lifecycle.

from django.db import migrations, models


STATUS_TO_LIFECYCLE = {
    "new": "new_request",
    "contacted": "pending_information",
    "planning": "quote_in_progress",
    "proposal": "quote_sent",
    "won": "awaiting_payment_finance",
    "execution": "booking_in_progress",
    "completed": "completed",
    "lost": "closed",
}


def populate_lifecycle_stage(apps, schema_editor):
    Lead = apps.get_model("crm", "Lead")
    for status, lifecycle_stage in STATUS_TO_LIFECYCLE.items():
        Lead.objects.filter(status=status).update(lifecycle_stage=lifecycle_stage)


def reset_lifecycle_stage(apps, schema_editor):
    Lead = apps.get_model("crm", "Lead")
    Lead.objects.update(lifecycle_stage="new_request")


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0002_client_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="lifecycle_stage",
            field=models.CharField(
                choices=[
                    ("new_request", "New Request"),
                    ("pending_information", "Pending Information"),
                    ("validated", "Validated"),
                    ("quote_in_progress", "Quote in Progress"),
                    ("quote_sent", "Quote Sent"),
                    ("awaiting_approval", "Awaiting Approval"),
                    ("approved", "Approved"),
                    ("awaiting_payment_finance", "Awaiting Payment / Finance"),
                    ("booking_in_progress", "Booking in Progress"),
                    ("confirmed", "Confirmed"),
                    ("travel_pack_sent", "Travel Pack Sent"),
                    ("in_travel", "In Travel"),
                    ("completed", "Completed"),
                    ("closed", "Closed"),
                ],
                default="new_request",
                max_length=40,
            ),
        ),
        migrations.RunPython(populate_lifecycle_stage, reset_lifecycle_stage),
        migrations.AddIndex(
            model_name="lead",
            index=models.Index(fields=["lifecycle_stage", "service_key"], name="crm_lead_lifecyc_54c43d_idx"),
        ),
    ]
