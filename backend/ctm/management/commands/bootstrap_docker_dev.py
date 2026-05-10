import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from crm.serializers import assign_user_role
from ctm.models import CompanyAccount, CompanyUser, normalize_company_code


def option_or_env(options, option_name: str, env_name: str, default: str) -> str:
    value = options.get(option_name) or os.getenv(env_name) or default
    return str(value).strip()


def unique_django_username(base: str) -> str:
    clean_base = (base or "user").strip().lower()[:140]
    candidate = clean_base
    suffix = 2
    while User.objects.filter(username__iexact=candidate).exists():
        suffix_text = str(suffix)
        candidate = f"{clean_base[: max(1, 150 - len(suffix_text) - 1)]}-{suffix_text}"
        suffix += 1
    return candidate


class Command(BaseCommand):
    help = "Bootstrap local Docker development data for CRM and CTM."

    def add_arguments(self, parser):
        parser.add_argument("--admin-username", default=None)
        parser.add_argument("--admin-email", default=None)
        parser.add_argument("--admin-password", default=None)
        parser.add_argument("--company-name", default=None)
        parser.add_argument("--company-code", default=None)
        parser.add_argument("--ctm-username", default=None)
        parser.add_argument("--ctm-email", default=None)
        parser.add_argument("--ctm-password", default=None)

    def handle(self, *args, **options):
        admin_username = option_or_env(options, "admin_username", "DPM_BOOTSTRAP_ADMIN_USERNAME", "dpm.admin")
        admin_email = option_or_env(options, "admin_email", "DPM_BOOTSTRAP_ADMIN_EMAIL", "admin@dpmundo.local")
        admin_password = option_or_env(options, "admin_password", "DPM_BOOTSTRAP_ADMIN_PASSWORD", "admin12345")
        company_name = option_or_env(options, "company_name", "DPM_BOOTSTRAP_COMPANY_NAME", "Demo Corporate Account")
        company_code = normalize_company_code(option_or_env(options, "company_code", "DPM_BOOTSTRAP_COMPANY_CODE", "DEMO"))
        ctm_username = option_or_env(options, "ctm_username", "DPM_BOOTSTRAP_CTM_USERNAME", "travel.admin")
        ctm_email = option_or_env(options, "ctm_email", "DPM_BOOTSTRAP_CTM_EMAIL", "travel.admin@demo.local")
        ctm_password = option_or_env(options, "ctm_password", "DPM_BOOTSTRAP_CTM_PASSWORD", "ctm12345")

        admin_user, admin_created = User.objects.get_or_create(
            username=admin_username,
            defaults={
                "email": admin_email,
                "first_name": "DPM",
                "last_name": "Admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.email = admin_email
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password(admin_password)
        admin_user.save()
        assign_user_role(admin_user, "admin")

        company, company_created = CompanyAccount.objects.get_or_create(
            account_code=company_code,
            defaults={
                "name": company_name,
                "status": CompanyAccount.Status.ACTIVE,
                "service_level": CompanyAccount.ServiceLevel.CORPORATE,
                "default_currency": "USD",
                "notes": "Created by bootstrap_docker_dev for local Docker testing.",
            },
        )
        if not company_created:
            company.name = company_name
            company.status = CompanyAccount.Status.ACTIVE
            company.save()

        membership = CompanyUser.objects.filter(company=company, login_username__iexact=ctm_username).select_related("user").first()
        if membership:
            ctm_user = membership.user
            ctm_created = False
        else:
            ctm_user = User.objects.create_user(
                username=unique_django_username(f"{company.account_code.lower()}__{ctm_username}"),
                email=ctm_email,
                password=ctm_password,
                first_name="Travel",
                last_name="Admin",
            )
            membership = CompanyUser.objects.create(
                company=company,
                user=ctm_user,
                login_username=ctm_username,
                role=CompanyUser.Role.COMPANY_ADMIN,
                access_roles=[CompanyUser.Role.COMPANY_ADMIN],
                department="Travel Desk",
                job_title="Company Admin",
                is_active=True,
            )
            ctm_created = True

        ctm_user.email = ctm_email
        ctm_user.set_password(ctm_password)
        ctm_user.save()
        membership.role = CompanyUser.Role.COMPANY_ADMIN
        membership.access_roles = [CompanyUser.Role.COMPANY_ADMIN]
        membership.is_active = True
        membership.save()

        self.stdout.write(self.style.SUCCESS("Docker development data is ready."))
        self.stdout.write(f"DPM admin: {admin_username} / {admin_password} ({'created' if admin_created else 'updated'})")
        self.stdout.write(f"Company ID: {company.account_code} ({'created' if company_created else 'updated'})")
        self.stdout.write(f"CTM admin: {ctm_username} / {ctm_password} ({'created' if ctm_created else 'updated'})")
