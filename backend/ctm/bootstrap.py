from django.contrib.auth.models import User

from .models import CompanyAccount, CompanyUser


def ensure_default_ctm_context(for_user: User | None = None) -> tuple[CompanyAccount, CompanyUser]:
    company, _ = CompanyAccount.objects.get_or_create(
        name="Mozal Operations",
        defaults={
            "legal_name": "Mozal Operations",
            "country": "Mozambique",
            "service_level": CompanyAccount.ServiceLevel.CORPORATE,
            "status": CompanyAccount.Status.ACTIVE,
            "default_currency": "USD",
        },
    )

    user = for_user
    if user is None:
        user, created = User.objects.get_or_create(
            username="ctm_travel_desk",
            defaults={
                "first_name": "Travel",
                "last_name": "Desk",
                "email": "travel.desk@dpm.local",
                "is_active": False,
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])

    company_user, _ = CompanyUser.objects.get_or_create(
        company=company,
        user=user,
        defaults={
            "role": CompanyUser.Role.COMPANY_ADMIN if user.is_superuser or user.is_staff else CompanyUser.Role.TRAVEL_COORDINATOR,
            "department": "Operations",
            "job_title": "Travel Desk",
            "is_active": True,
        },
    )
    return company, company_user
