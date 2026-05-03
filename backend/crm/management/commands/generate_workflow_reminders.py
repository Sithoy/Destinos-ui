from django.core.management.base import BaseCommand

from crm.workflow_automation import generate_workflow_reminders


class Command(BaseCommand):
    help = "Generate pending CRM workflow reminders from workflow blockers, follow-ups, payments, and supplier deadlines."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report candidate count without writing reminders.")

    def handle(self, *args, **options):
        if options["dry_run"]:
            from crm.models import Lead
            from crm.workflow_automation import reminder_candidates_for_lead

            count = 0
            for lead in Lead.objects.exclude(status__in=[Lead.Status.COMPLETED, Lead.Status.LOST]):
                count += len(reminder_candidates_for_lead(lead))
            self.stdout.write(self.style.WARNING(f"{count} reminder candidate(s) found."))
            return

        reminders = generate_workflow_reminders()
        self.stdout.write(self.style.SUCCESS(f"Created {len(reminders)} workflow reminder(s)."))
