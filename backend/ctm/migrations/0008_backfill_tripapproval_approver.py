from django.db import migrations


MANAGER_ROLES = {"manager", "company_admin"}


def member_roles(member) -> set:
    return set(member.access_roles or []) | {member.role}


def resolve_approver(members, approval_type: str, department: str):
    if approval_type == "final_cost":
        candidates = [member for member in members if "finance_approver" in member_roles(member)]
        if not candidates:
            candidates = [member for member in members if member_roles(member) & MANAGER_ROLES]
    else:
        candidates = [member for member in members if member_roles(member) & MANAGER_ROLES]
        department = (department or "").strip().lower()
        if department:
            department_matches = [member for member in candidates if (member.department or "").strip().lower() == department]
            if department_matches:
                candidates = department_matches
    return candidates[0] if candidates else None


def backfill_trip_approval_approvers(apps, schema_editor):
    TripApproval = apps.get_model("ctm", "TripApproval")
    CompanyUser = apps.get_model("ctm", "CompanyUser")

    approvals = (
        TripApproval.objects.filter(status="pending", approver__isnull=True)
        .select_related("trip_request")
        .order_by("created_at")
    )
    members_by_company = {}
    for approval in approvals:
        trip = approval.trip_request
        if trip.company_id not in members_by_company:
            members_by_company[trip.company_id] = list(
                CompanyUser.objects.filter(company_id=trip.company_id, is_active=True).order_by("created_at")
            )
        approver = resolve_approver(members_by_company[trip.company_id], approval.approval_type, trip.department)
        if approver is not None:
            approval.approver = approver
            approval.save(update_fields=["approver", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("ctm", "0007_alter_tripapproval_approval_type_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_trip_approval_approvers, migrations.RunPython.noop),
    ]
