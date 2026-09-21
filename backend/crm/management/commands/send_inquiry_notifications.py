from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from crm.models import Lead


class Command(BaseCommand):
    help = "Send pending public inquiry notifications. Run a single worker periodically; failed messages remain retryable."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        recipient = getattr(settings, "DPM_INQUIRY_NOTIFICATION_EMAIL", "")
        if not recipient:
            raise CommandError("Configure DPM_INQUIRY_NOTIFICATION_EMAIL and the Django email backend first.")
        ids = list(Lead.objects.filter(submission_id__isnull=False, email_status__in=["pending", "failed"]).order_by("created_at").values_list("pk", flat=True)[:options["limit"]])
        sent = 0
        for lead_id in ids:
            with transaction.atomic():
                lead = Lead.objects.select_for_update().get(pk=lead_id)
                if lead.email_status == Lead.EmailStatus.SENT:
                    continue
                try:
                    count = send_mail(
                        f"DPM inquiry {lead.id}",
                        f"New {lead.service} inquiry from {lead.name}.\nDestination: {lead.destination}\nContact: {lead.email or lead.whatsapp}\nOpen CRM to review the full request.",
                        settings.DEFAULT_FROM_EMAIL, [recipient], fail_silently=False,
                    )
                    lead.email_status = Lead.EmailStatus.SENT if count else Lead.EmailStatus.FAILED
                    sent += bool(count)
                except Exception:
                    lead.email_status = Lead.EmailStatus.FAILED
                    self.stderr.write(f"Notification failed for inquiry {lead.id}; retained for retry.")
                lead.save(update_fields=["email_status", "updated_at"])
        self.stdout.write(f"Sent {sent} of {len(ids)} pending notifications.")
