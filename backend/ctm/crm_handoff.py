from crm.models import Lead

from .models import TripRequest


def _date_range_label(trip: TripRequest) -> str:
    if trip.return_date:
        return f"{trip.departure_date.isoformat()} - {trip.return_date.isoformat()}"
    return trip.departure_date.isoformat()


def _budget_label(trip: TripRequest) -> str:
    if trip.estimated_cost is not None:
        return f"{trip.currency} {trip.estimated_cost}"
    return trip.budget_band


def sync_crm_lead_from_ctm_trip(trip: TripRequest) -> Lead:
    services = ", ".join(trip.services.order_by("created_at").values_list("service_type", flat=True))
    traveler_count = trip.trip_travelers.count()
    requester = trip.requested_by
    requester_user = requester.user
    requester_name = requester_user.get_full_name() or requester_user.username

    lead, _ = Lead.objects.update_or_create(
        ctm_request_reference=trip.reference_code,
        defaults={
            "service": "Prestige Corporate CTM",
            "service_key": Lead.ServiceKey.CORPORATE,
            "name": trip.company.name,
            "contact": requester_name,
            "email": requester_user.email,
            "whatsapp": requester.phone,
            "preferred_contact": "CTM",
            "requested_services": services,
            "trip_type": trip.get_request_type_display(),
            "departure_city": trip.origin,
            "destination": trip.destination,
            "dates": _date_range_label(trip),
            "travelers": f"{traveler_count} traveler{'s' if traveler_count != 1 else ''}",
            "budget": _budget_label(trip),
            "urgency": "CTM company request",
            "notes": trip.purpose,
            "status": Lead.Status.NEW,
            "lifecycle_stage": Lead.LifecycleStage.NEW_REQUEST,
            "internal_notes": f"Created from CTM request {trip.reference_code}. Company: {trip.company.name}. Department: {trip.department or 'Not specified'}.",
            "company_account": trip.company,
            "client": trip.company.client,
        },
    )
    return lead
