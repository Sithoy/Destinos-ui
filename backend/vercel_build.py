"""Apply the schema and optionally provision the first production administrator."""
import os

import django
from django.core.management import call_command

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dpm_backend.settings")
django.setup()
call_command("migrate", interactive=False)

# Supply only a Django password hash, never a plaintext password, to the build.
# This can initialize a fresh database but cannot alter an existing account.
password_hash = os.getenv("DPM_BOOTSTRAP_ADMIN_PASSWORD_HASH")
if password_hash and os.getenv("VERCEL_ENV") == "production":
    from django.contrib.auth import get_user_model
    from django.contrib.auth.hashers import identify_hasher
    from django.db import transaction

    identify_hasher(password_hash)
    with transaction.atomic():
        User = get_user_model()
        if not User.objects.exists():
            User.objects.create(
                username=os.getenv("DPM_BOOTSTRAP_ADMIN_USERNAME", "dpm.admin"),
                password=password_hash,
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            print("Initial administrator created.")
