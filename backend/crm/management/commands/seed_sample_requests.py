from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from crm.models import AccommodationBlock, Client, ExperienceBlock, ItineraryStop, Lead, Quote, QuoteApproval, QuoteLine, TransportSegment, TripItinerary


@dataclass(frozen=True)
class SampleLead:
    service: str
    service_key: str
    name: str
    contact: str
    email: str
    whatsapp: str
    preferred_contact: str
    requested_services: str
    trip_type: str
    departure_city: str
    destination: str
    dates: str
    travelers: str
    budget: str
    urgency: str
    priority: str
    status: str
    notes: str
    internal_notes: str
    client_type: str
    client_name: str
    company_name: str = ""
    owner: str = ""
    service_level: str = ""
    lifecycle_stage: str = ""


LEISURE_SAMPLES: list[SampleLead] = [
    SampleLead(
        service="Classic Beach Escape",
        service_key=Lead.ServiceKey.CLASSIC,
        name="Helena Matola",
        contact="Helena Matola",
        email="helena.matola.sample@dpm.test",
        whatsapp="+258840100001",
        preferred_contact="WhatsApp",
        requested_services="Flights, hotel, transfers, city tour",
        trip_type="Couple holiday",
        departure_city="Maputo",
        destination="Cape Town",
        dates="2026-06-18 to 2026-06-24",
        travelers="2 adults",
        budget="$4,000 - $5,500",
        urgency="Review this week",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.NEW,
        notes="Client wants a smooth first international holiday with easy pacing.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Nadia Cossa | Task: Validate brief and shape the first package",
        client_type=Client.ClientType.PRIVATE,
        client_name="Helena Matola",
        owner="Nadia Cossa",
        service_level="classic",
        lifecycle_stage=Lead.LifecycleStage.NEW_REQUEST,
    ),
    SampleLead(
        service="Luxury Anniversary Journey",
        service_key=Lead.ServiceKey.LUXURY,
        name="Jorge & Tania",
        contact="Jorge and Tania",
        email="jorge.tania.sample@dpm.test",
        whatsapp="+258840100002",
        preferred_contact="Email",
        requested_services="Business flights, 5-star hotel, private transfers, fine dining",
        trip_type="Anniversary celebration",
        departure_city="Johannesburg",
        destination="Mauritius",
        dates="2026-07-04 to 2026-07-10",
        travelers="2 adults",
        budget="$12,000 - $16,000",
        urgency="Need options within 48h",
        priority=Lead.Priority.HIGH,
        status=Lead.Status.CONTACTED,
        notes="Privacy and refined service matter more than activity volume.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Carlos Mavie | Task: Build a premium supplier shortlist",
        client_type=Client.ClientType.PRIVATE,
        client_name="Jorge & Tania",
        owner="Carlos Mavie",
        service_level="luxury",
        lifecycle_stage=Lead.LifecycleStage.PENDING_INFORMATION,
    ),
    SampleLead(
        service="Family Safari Plan",
        service_key=Lead.ServiceKey.CLASSIC,
        name="Paulo Sitoe Family",
        contact="Paulo Sitoe",
        email="paulo.sitoe.family.sample@dpm.test",
        whatsapp="+258840100003",
        preferred_contact="Phone",
        requested_services="Flights, lodge, transfers, game drives",
        trip_type="Family safari",
        departure_city="Maputo",
        destination="Kruger",
        dates="2026-08-02 to 2026-08-08",
        travelers="2 adults + 2 children",
        budget="$6,500 - $8,000",
        urgency="School holiday planning",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.PLANNING,
        notes="Need child-friendly pacing and easy road logistics.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Nadia Cossa | Task: Align lodge options with family comfort level",
        client_type=Client.ClientType.PRIVATE,
        client_name="Paulo Sitoe Family",
        owner="Nadia Cossa",
        service_level="classic",
        lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS,
    ),
    SampleLead(
        service="Romantic Island Proposal",
        service_key=Lead.ServiceKey.LUXURY,
        name="Mila and David",
        contact="Mila and David",
        email="mila.david.sample@dpm.test",
        whatsapp="+258840100004",
        preferred_contact="WhatsApp",
        requested_services="Flights, villa, private dinner, concierge",
        trip_type="Romantic getaway",
        departure_city="Lusaka",
        destination="Zanzibar",
        dates="2026-06-25 to 2026-06-30",
        travelers="2 adults",
        budget="$9,000 - $12,000",
        urgency="Client decision pending",
        priority=Lead.Priority.HIGH,
        status=Lead.Status.PROPOSAL,
        notes="Proposal already sent. Waiting on final package choice.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Marta Lopes | Task: Protect villa inventory and follow up decision",
        client_type=Client.ClientType.PRIVATE,
        client_name="Mila and David",
        owner="Marta Lopes",
        service_level="luxury",
        lifecycle_stage=Lead.LifecycleStage.AWAITING_APPROVAL,
    ),
    SampleLead(
        service="Southern Europe Honeymoon",
        service_key=Lead.ServiceKey.LUXURY,
        name="Celso & Marisa",
        contact="Celso and Marisa",
        email="celso.marisa.sample@dpm.test",
        whatsapp="+258840100005",
        preferred_contact="Email",
        requested_services="Flights, boutique hotels, rail, private experiences",
        trip_type="Honeymoon",
        departure_city="Maputo",
        destination="Italy + France",
        dates="2026-09-10 to 2026-09-22",
        travelers="2 adults",
        budget="$18,000 - $24,000",
        urgency="Deposit needed",
        priority=Lead.Priority.URGENT,
        status=Lead.Status.WON,
        notes="Client verbally approved. Deposit instructions shared.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Carlos Mavie | Task: Confirm payment and keep premium space held",
        client_type=Client.ClientType.PRIVATE,
        client_name="Celso & Marisa",
        owner="Carlos Mavie",
        service_level="luxury",
        lifecycle_stage=Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE,
    ),
    SampleLead(
        service="Classic Family Coastline",
        service_key=Lead.ServiceKey.CLASSIC,
        name="Mariana Cossa",
        contact="Mariana Cossa",
        email="mariana.cossa.sample@dpm.test",
        whatsapp="+258840100006",
        preferred_contact="WhatsApp",
        requested_services="Flights, hotel, transfers, insurance",
        trip_type="Family holiday",
        departure_city="Maputo",
        destination="Durban",
        dates="2026-07-14 to 2026-07-20",
        travelers="2 adults + 1 child",
        budget="$3,500 - $4,800",
        urgency="Travel pack preparation",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.EXECUTION,
        notes="Travel confirmed. Final support pack is being assembled.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Nadia Cossa | Task: Send final pack and lock support notes",
        client_type=Client.ClientType.PRIVATE,
        client_name="Mariana Cossa",
        owner="Nadia Cossa",
        service_level="classic",
        lifecycle_stage=Lead.LifecycleStage.TRAVEL_PACK_SENT,
    ),
    SampleLead(
        service="Luxury Desert Escape",
        service_key=Lead.ServiceKey.LUXURY,
        name="Beatriz Nhaca",
        contact="Beatriz Nhaca",
        email="beatriz.nhaca.sample@dpm.test",
        whatsapp="+258840100007",
        preferred_contact="Phone",
        requested_services="Flights, luxury camp, private guide, spa",
        trip_type="Private escape",
        departure_city="Harare",
        destination="Namibia",
        dates="2026-05-18 to 2026-05-24",
        travelers="2 adults",
        budget="$14,000 - $18,000",
        urgency="Already travelled",
        priority=Lead.Priority.LOW,
        status=Lead.Status.COMPLETED,
        notes="Trip delivered successfully. Feedback requested.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Marta Lopes | Task: Capture testimonial and repeat preferences",
        client_type=Client.ClientType.PRIVATE,
        client_name="Beatriz Nhaca",
        owner="Marta Lopes",
        service_level="luxury",
        lifecycle_stage=Lead.LifecycleStage.COMPLETED,
    ),
    SampleLead(
        service="Classic Weekend City Break",
        service_key=Lead.ServiceKey.CLASSIC,
        name="Tito Cuambe",
        contact="Tito Cuambe",
        email="tito.cuambe.sample@dpm.test",
        whatsapp="+258840100008",
        preferred_contact="WhatsApp",
        requested_services="Flights, hotel, transfers",
        trip_type="Weekend trip",
        departure_city="Maputo",
        destination="Johannesburg",
        dates="2026-05-22 to 2026-05-25",
        travelers="2 adults",
        budget="$2,000 - $2,800",
        urgency="Budget stopped the sale",
        priority=Lead.Priority.LOW,
        status=Lead.Status.LOST,
        notes="Client paused due to price sensitivity.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Nadia Cossa | Task: Record loss reason and park for nurture",
        client_type=Client.ClientType.PRIVATE,
        client_name="Tito Cuambe",
        owner="Nadia Cossa",
        service_level="classic",
        lifecycle_stage=Lead.LifecycleStage.CLOSED,
    ),
    SampleLead(
        service="Luxury City and Coast",
        service_key=Lead.ServiceKey.LUXURY,
        name="Sandra Mucavele",
        contact="Sandra Mucavele",
        email="sandra.mucavele.sample@dpm.test",
        whatsapp="+258840100009",
        preferred_contact="Email",
        requested_services="Flights, 5-star hotels, private transfers, experiences",
        trip_type="Prestige vacation",
        departure_city="Maputo",
        destination="Dubai + Seychelles",
        dates="2026-11-02 to 2026-11-12",
        travelers="2 adults",
        budget="$22,000+",
        urgency="Need refined options",
        priority=Lead.Priority.HIGH,
        status=Lead.Status.PLANNING,
        notes="Traveler wants a polished split itinerary with premium pace.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Carlos Mavie | Task: Shape signature package options and margin path",
        client_type=Client.ClientType.PRIVATE,
        client_name="Sandra Mucavele",
        owner="Carlos Mavie",
        service_level="luxury",
        lifecycle_stage=Lead.LifecycleStage.QUOTE_SENT,
    ),
    SampleLead(
        service="Classic Regional Explorer",
        service_key=Lead.ServiceKey.CLASSIC,
        name="Fernanda Uamusse",
        contact="Fernanda Uamusse",
        email="fernanda.uamusse.sample@dpm.test",
        whatsapp="+258840100010",
        preferred_contact="Phone",
        requested_services="Flights, hotel, transfers, excursions",
        trip_type="Friends trip",
        departure_city="Beira",
        destination="Livingstone",
        dates="2026-10-05 to 2026-10-10",
        travelers="3 adults",
        budget="$5,000 - $6,500",
        urgency="Awaiting first contact",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.CONTACTED,
        notes="Client asked for nature plus easy logistics.",
        internal_notes="[Seed] Leisure sample\n[Manager board] Owner: Nadia Cossa | Task: Clarify comfort level and excursion appetite",
        client_type=Client.ClientType.PRIVATE,
        client_name="Fernanda Uamusse",
        owner="Nadia Cossa",
        service_level="classic",
        lifecycle_stage=Lead.LifecycleStage.VALIDATED,
    ),
]


CORPORATE_SAMPLES: list[SampleLead] = [
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="Etios Holdings Mobility Desk",
        contact="Lucinda Pires",
        email="lucinda.pires.sample@etios.test",
        whatsapp="+258841200001",
        preferred_contact="Email",
        requested_services="Flights, hotel, transfers",
        trip_type="Executive movement",
        departure_city="Maputo",
        destination="Johannesburg",
        dates="2026-05-21 to 2026-05-23",
        travelers="2 executives",
        budget="$3,500 - $5,000",
        urgency="Same-week intake",
        priority=Lead.Priority.HIGH,
        status=Lead.Status.NEW,
        notes="Short-lead executive movement created from corporate desk.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Validate movement scope and assign account handling",
        client_type=Client.ClientType.CORPORATE,
        client_name="Etios Holdings Mobility Desk",
        company_name="Etios Holdings",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.NEW_REQUEST,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="MozBuild Projects",
        contact="Rui Carvalho",
        email="rui.carvalho.sample@mozbuild.test",
        whatsapp="+258841200002",
        preferred_contact="Phone",
        requested_services="Flights, hotel, visa support",
        trip_type="Project mobilization",
        departure_city="Maputo",
        destination="Luanda",
        dates="2026-06-03 to 2026-06-08",
        travelers="4 project staff",
        budget="$7,000 - $9,000",
        urgency="Approval prep",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.CONTACTED,
        notes="Need traveler file check before quote structure is final.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Confirm traveler list and missing visa data",
        client_type=Client.ClientType.CORPORATE,
        client_name="MozBuild Projects",
        company_name="MozBuild Projects",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.PENDING_INFORMATION,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="BlueWave Energy",
        contact="Sonia Vasco",
        email="sonia.vasco.sample@bluewave.test",
        whatsapp="+258841200003",
        preferred_contact="Email",
        requested_services="Flights, hotel, transfers, meeting support",
        trip_type="Regional leadership meeting",
        departure_city="Maputo",
        destination="Nairobi",
        dates="2026-07-07 to 2026-07-11",
        travelers="6 travelers",
        budget="$11,000 - $14,000",
        urgency="Planning phase",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.PLANNING,
        notes="Leadership movement with hotel and meeting alignment needs.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Shape quote around traveler rooming and transfer control",
        client_type=Client.ClientType.CORPORATE,
        client_name="BlueWave Energy",
        company_name="BlueWave Energy",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.QUOTE_IN_PROGRESS,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="Global Freight Africa",
        contact="Pedro Manuel",
        email="pedro.manuel.sample@globalfreight.test",
        whatsapp="+258841200004",
        preferred_contact="Email",
        requested_services="Flights, hotel, transfers",
        trip_type="Operations review trip",
        departure_city="Beira",
        destination="Dar es Salaam",
        dates="2026-06-14 to 2026-06-18",
        travelers="3 managers",
        budget="$5,500 - $7,200",
        urgency="Approval pending",
        priority=Lead.Priority.HIGH,
        status=Lead.Status.PROPOSAL,
        notes="Proposal sent to company coordinator. Approval not yet returned.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Chase internal approval and keep pricing valid",
        client_type=Client.ClientType.CORPORATE,
        client_name="Global Freight Africa",
        company_name="Global Freight Africa",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.AWAITING_APPROVAL,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="TechBridge Consulting",
        contact="Helder Panguene",
        email="helder.panguene.sample@techbridge.test",
        whatsapp="+258841200005",
        preferred_contact="Phone",
        requested_services="Flights, hotel, transfers",
        trip_type="Client implementation trip",
        departure_city="Maputo",
        destination="Lagos",
        dates="2026-06-26 to 2026-07-01",
        travelers="2 consultants",
        budget="$4,800 - $6,300",
        urgency="Finance clearance",
        priority=Lead.Priority.URGENT,
        status=Lead.Status.WON,
        notes="Travel approved but invoice clearance is still needed before release.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Hold booking until finance confirms release",
        client_type=Client.ClientType.CORPORATE,
        client_name="TechBridge Consulting",
        company_name="TechBridge Consulting",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="Prime Health Group",
        contact="Anabela Fumo",
        email="anabela.fumo.sample@primehealth.test",
        whatsapp="+258841200006",
        preferred_contact="Email",
        requested_services="Flights, hotel, transfers, visa support",
        trip_type="Medical congress attendance",
        departure_city="Maputo",
        destination="Lisbon",
        dates="2026-09-02 to 2026-09-08",
        travelers="5 delegates",
        budget="$13,000 - $16,000",
        urgency="Execution active",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.EXECUTION,
        notes="Booking released. Final documents and traveler movement support active.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Complete travel document pack and departure support",
        client_type=Client.ClientType.CORPORATE,
        client_name="Prime Health Group",
        company_name="Prime Health Group",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.BOOKING_IN_PROGRESS,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="Nacala Mining Services",
        contact="Rute Simango",
        email="rute.simango.sample@nacalamining.test",
        whatsapp="+258841200007",
        preferred_contact="Email",
        requested_services="Flights, hotel, transfers",
        trip_type="Completed site visit",
        departure_city="Tete",
        destination="Johannesburg",
        dates="2026-04-05 to 2026-04-09",
        travelers="3 staff",
        budget="$4,200 - $5,500",
        urgency="Post-trip review",
        priority=Lead.Priority.LOW,
        status=Lead.Status.COMPLETED,
        notes="Trip completed. Account feedback and repeat pattern capture pending.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Log account learning and repeat route notes",
        client_type=Client.ClientType.CORPORATE,
        client_name="Nacala Mining Services",
        company_name="Nacala Mining Services",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.COMPLETED,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="Atlas Telecom",
        contact="Moises Bala",
        email="moises.bala.sample@atlastelecom.test",
        whatsapp="+258841200008",
        preferred_contact="Phone",
        requested_services="Flights, hotel, transfers",
        trip_type="Vendor negotiation trip",
        departure_city="Maputo",
        destination="Dubai",
        dates="2026-08-12 to 2026-08-16",
        travelers="2 decision-makers",
        budget="$8,500 - $10,500",
        urgency="Cancelled by account",
        priority=Lead.Priority.LOW,
        status=Lead.Status.LOST,
        notes="Trip stopped by client budget freeze.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Capture loss reason and future reactivation signal",
        client_type=Client.ClientType.CORPORATE,
        client_name="Atlas Telecom",
        company_name="Atlas Telecom",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.CLOSED,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="GreenGrid Utilities",
        contact="Sabrina Jone",
        email="sabrina.jone.sample@greengrid.test",
        whatsapp="+258841200009",
        preferred_contact="Email",
        requested_services="Flights, hotel, transfers, insurance",
        trip_type="Training trip",
        departure_city="Maputo",
        destination="Cape Town",
        dates="2026-10-01 to 2026-10-05",
        travelers="8 trainees",
        budget="$9,500 - $12,000",
        urgency="High traveler coordination",
        priority=Lead.Priority.HIGH,
        status=Lead.Status.PLANNING,
        notes="Traveler rooming and grouping need careful control.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Align rooming, group flights, and training schedule",
        client_type=Client.ClientType.CORPORATE,
        client_name="GreenGrid Utilities",
        company_name="GreenGrid Utilities",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.VALIDATED,
    ),
    SampleLead(
        service="Corporate Travel Request",
        service_key=Lead.ServiceKey.CORPORATE,
        name="Indico Ports",
        contact="Vera Chissano",
        email="vera.chissano.sample@indicoports.test",
        whatsapp="+258841200010",
        preferred_contact="WhatsApp",
        requested_services="Flights, hotel, transfers, meeting support",
        trip_type="Board movement",
        departure_city="Maputo",
        destination="Doha",
        dates="2026-11-14 to 2026-11-18",
        travelers="4 board members",
        budget="$15,000 - $19,000",
        urgency="Ready for quote",
        priority=Lead.Priority.NORMAL,
        status=Lead.Status.CONTACTED,
        notes="Board-level trip needs polished handling but still corporate controls.",
        internal_notes="[Seed] Corporate sample\n[Manager board] Owner: Marta Lopes | Task: Finalize traveler brief and prep executive quote",
        client_type=Client.ClientType.CORPORATE,
        client_name="Indico Ports",
        company_name="Indico Ports",
        owner="Marta Lopes",
        service_level="corporate",
        lifecycle_stage=Lead.LifecycleStage.QUOTE_SENT,
    ),
]


QUOTE_STATUS_BY_STAGE = {
    Lead.LifecycleStage.NEW_REQUEST: Quote.Status.DRAFT,
    Lead.LifecycleStage.PENDING_INFORMATION: Quote.Status.DRAFT,
    Lead.LifecycleStage.VALIDATED: Quote.Status.DRAFT,
    Lead.LifecycleStage.QUOTE_IN_PROGRESS: Quote.Status.DRAFT,
    Lead.LifecycleStage.QUOTE_SENT: Quote.Status.SENT,
    Lead.LifecycleStage.AWAITING_APPROVAL: Quote.Status.SENT,
    Lead.LifecycleStage.APPROVED: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.AWAITING_PAYMENT_FINANCE: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.BOOKING_IN_PROGRESS: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.CONFIRMED: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.TRAVEL_PACK_SENT: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.IN_TRAVEL: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.COMPLETED: Quote.Status.ACCEPTED,
    Lead.LifecycleStage.CLOSED: Quote.Status.REJECTED,
}


APPROVAL_DECISION_BY_QUOTE_STATUS = {
    Quote.Status.DRAFT: QuoteApproval.Decision.PENDING,
    Quote.Status.SENT: QuoteApproval.Decision.PENDING,
    Quote.Status.ACCEPTED: QuoteApproval.Decision.APPROVED,
    Quote.Status.REVISION_REQUESTED: QuoteApproval.Decision.CHANGES_REQUESTED,
    Quote.Status.REJECTED: QuoteApproval.Decision.REJECTED,
    Quote.Status.EXPIRED: QuoteApproval.Decision.REJECTED,
}


def quote_number_for_lead(lead: Lead) -> str:
    return f"DPM-Q-{str(lead.id)[:8].upper()}"


def quote_lines_for_sample(sample: SampleLead):
    if sample.service_key == Lead.ServiceKey.CORPORATE:
        return [
            (QuoteLine.Category.FLIGHT, "Corporate fare desk", "Policy-aligned flight options", Decimal("1"), Decimal("2450.00"), Decimal("2980.00")),
            (QuoteLine.Category.HOTEL, "Preferred corporate hotel partner", "Hotel block with rooming control", Decimal("1"), Decimal("1850.00"), Decimal("2320.00")),
            (QuoteLine.Category.TRANSFER, "Ground operations partner", "Airport and meeting transfers", Decimal("1"), Decimal("420.00"), Decimal("680.00")),
            (QuoteLine.Category.SERVICE_FEE, "DPM Corporate Desk", "Corporate coordination and reporting fee", Decimal("1"), Decimal("0.00"), Decimal("450.00")),
        ]

    if sample.service_key == Lead.ServiceKey.LUXURY:
        return [
            (QuoteLine.Category.FLIGHT, "Premium fare partner", "Premium cabin or best-fit fare option", Decimal("1"), Decimal("4200.00"), Decimal("4900.00")),
            (QuoteLine.Category.HOTEL, "Luxury hotel partner", "Premium stay aligned to travel brief", Decimal("1"), Decimal("7200.00"), Decimal("8900.00")),
            (QuoteLine.Category.TRANSFER, "Private ground desk", "Private transfers and arrival handling", Decimal("1"), Decimal("650.00"), Decimal("950.00")),
            (QuoteLine.Category.ACTIVITY, "Concierge partner", "Curated experience layer", Decimal("1"), Decimal("900.00"), Decimal("1450.00")),
        ]

    return [
        (QuoteLine.Category.FLIGHT, "Regional fare partner", "Best-fit economy fare option", Decimal("1"), Decimal("1150.00"), Decimal("1420.00")),
        (QuoteLine.Category.HOTEL, "Selected leisure hotel", "Comfort hotel package", Decimal("1"), Decimal("1400.00"), Decimal("1780.00")),
        (QuoteLine.Category.TRANSFER, "Ground transport partner", "Return transfers", Decimal("1"), Decimal("180.00"), Decimal("320.00")),
        (QuoteLine.Category.ACTIVITY, "Destination operator", "Core excursion or activity", Decimal("1"), Decimal("260.00"), Decimal("460.00")),
    ]


def seed_quote_for_lead(lead: Lead, sample: SampleLead):
    lifecycle_stage = sample.lifecycle_stage or Lead.LifecycleStage.NEW_REQUEST
    quote_status = QUOTE_STATUS_BY_STAGE.get(lifecycle_stage, Quote.Status.DRAFT)
    now = timezone.now()
    sent_at = now - timedelta(days=1) if quote_status in {Quote.Status.SENT, Quote.Status.ACCEPTED, Quote.Status.REJECTED} else None
    accepted_at = now if quote_status == Quote.Status.ACCEPTED else None
    quote_number = quote_number_for_lead(lead)

    quote, created = Quote.objects.update_or_create(
        lead=lead,
        version=1,
        defaults={
            "quote_number": quote_number,
            "status": quote_status,
            "currency": "USD",
            "valid_until": (now + timedelta(days=14)).date(),
            "notes": f"Seeded quote for {sample.trip_type}.",
            "sent_at": sent_at,
            "accepted_at": accepted_at,
        },
    )

    line_status = QuoteLine.Status.QUOTED if quote_status in {Quote.Status.SENT, Quote.Status.ACCEPTED} else QuoteLine.Status.RESEARCH
    if quote_status == Quote.Status.ACCEPTED:
        line_status = QuoteLine.Status.HELD
    if quote_status == Quote.Status.REJECTED:
        line_status = QuoteLine.Status.UNAVAILABLE

    existing_descriptions = set(quote.lines.values_list("description", flat=True))
    for category, supplier, description, quantity, unit_cost, unit_sell in quote_lines_for_sample(sample):
        QuoteLine.objects.update_or_create(
            quote=quote,
            description=description,
            defaults={
                "category": category,
                "supplier": supplier,
                "quantity": quantity,
                "unit_cost": unit_cost,
                "unit_sell": unit_sell,
                "status": line_status,
                "notes": "Seeded quote line.",
            },
        )
        existing_descriptions.discard(description)

    if existing_descriptions:
        quote.lines.filter(description__in=existing_descriptions).delete()

    approver_name = sample.contact or sample.client_name
    approver_email = sample.email
    decision = APPROVAL_DECISION_BY_QUOTE_STATUS.get(quote_status, QuoteApproval.Decision.PENDING)
    QuoteApproval.objects.update_or_create(
        quote=quote,
        approver_email=approver_email,
        defaults={
            "approver_name": approver_name,
            "decision": decision,
            "decision_at": now if decision in {QuoteApproval.Decision.APPROVED, QuoteApproval.Decision.REJECTED} else None,
            "notes": "Seeded approval state aligned with quote status.",
        },
    )

    return quote, created


def itinerary_status_for_stage(stage: str) -> str:
    if stage in {Lead.LifecycleStage.COMPLETED, Lead.LifecycleStage.CLOSED}:
        return TripItinerary.Status.COMPLETED
    if stage == Lead.LifecycleStage.IN_TRAVEL:
        return TripItinerary.Status.IN_TRAVEL
    if stage in {
        Lead.LifecycleStage.BOOKING_IN_PROGRESS,
        Lead.LifecycleStage.CONFIRMED,
        Lead.LifecycleStage.TRAVEL_PACK_SENT,
    }:
        return TripItinerary.Status.CONFIRMED
    if stage in {Lead.LifecycleStage.QUOTE_SENT, Lead.LifecycleStage.AWAITING_APPROVAL, Lead.LifecycleStage.APPROVED}:
        return TripItinerary.Status.PROPOSED
    return TripItinerary.Status.DRAFT


def sample_stop_plan(sample: SampleLead):
    destination_parts = [part.strip() for part in sample.destination.replace("&", "+").split("+") if part.strip()]
    if not destination_parts:
        destination_parts = [sample.destination or "Destination"]

    if sample.service_key == Lead.ServiceKey.CORPORATE:
        primary = destination_parts[0]
        return [
            {
                "city": sample.departure_city or "Maputo",
                "country": "Departure hub",
                "nights": 0,
                "purpose": ItineraryStop.Purpose.TRANSIT,
                "hotel": "Airport coordination point",
                "room": "Day-use / traveler assembly",
                "experience": "Traveler readiness checkpoint",
            },
            {
                "city": primary,
                "country": "Corporate destination",
                "nights": 3,
                "purpose": ItineraryStop.Purpose.BUSINESS,
                "hotel": "Preferred corporate hotel block",
                "room": "Executive rooms with twin fallback",
                "experience": "Meeting transfer schedule",
            },
            {
                "city": f"{primary} overflow",
                "country": "Corporate destination",
                "nights": 1,
                "purpose": ItineraryStop.Purpose.EXTENSION,
                "hotel": "Overflow / late-change hotel",
                "room": "Flexible rooming allocation",
                "experience": "Departure buffer support",
            },
        ]

    if sample.service_key == Lead.ServiceKey.LUXURY:
        primary = destination_parts[0]
        secondary = destination_parts[1] if len(destination_parts) > 1 else f"{primary} coast"
        return [
            {
                "city": primary,
                "country": "Signature destination",
                "nights": 3,
                "purpose": ItineraryStop.Purpose.LEISURE,
                "hotel": "Premium city or resort stay",
                "room": "Suite / villa preference",
                "experience": "Private guided signature experience",
            },
            {
                "city": secondary,
                "country": "Signature destination",
                "nights": 3,
                "purpose": ItineraryStop.Purpose.LEISURE,
                "hotel": "Boutique luxury stay",
                "room": "High-floor or private-view room",
                "experience": "Wellness, sunset, or curated dining moment",
            },
        ]

    primary = destination_parts[0]
    secondary = destination_parts[1] if len(destination_parts) > 1 else f"{primary} highlights"
    return [
        {
            "city": primary,
            "country": "Leisure destination",
            "nights": 3,
            "purpose": ItineraryStop.Purpose.LEISURE,
            "hotel": "Comfort hotel base",
            "room": "Double or twin rooms",
            "experience": "Core city or destination tour",
        },
        {
            "city": secondary,
            "country": "Leisure destination",
            "nights": 2,
            "purpose": ItineraryStop.Purpose.LEISURE,
            "hotel": "Practical second stay",
            "room": "Best-fit room allocation",
            "experience": "Optional activity layer",
        },
    ]


def seed_itinerary_for_lead(lead: Lead, sample: SampleLead):
    lifecycle_stage = sample.lifecycle_stage or Lead.LifecycleStage.NEW_REQUEST
    status = itinerary_status_for_stage(lifecycle_stage)
    start_date = timezone.now().date() + timedelta(days=30 + (abs(hash(sample.email)) % 90))
    stop_plan = sample_stop_plan(sample)
    total_nights = sum(stop["nights"] for stop in stop_plan)
    end_date = start_date + timedelta(days=total_nights)

    itinerary, created = TripItinerary.objects.update_or_create(
        lead=lead,
        title=f"{sample.destination} itinerary",
        defaults={
            "status": status,
            "start_date": start_date,
            "end_date": end_date,
            "notes": f"Seeded multi-stop itinerary for {sample.trip_type}.",
        },
    )

    running_date = start_date
    kept_stop_ids = []
    for index, stop_data in enumerate(stop_plan, start=1):
        arrival_date = running_date
        departure_date = running_date + timedelta(days=stop_data["nights"])
        stop, _ = ItineraryStop.objects.update_or_create(
            itinerary=itinerary,
            sequence_number=index,
            defaults={
                "city": stop_data["city"],
                "country": stop_data["country"],
                "arrival_date": arrival_date,
                "departure_date": departure_date,
                "nights": stop_data["nights"],
                "purpose": stop_data["purpose"],
                "notes": "Seeded itinerary stop. Use this area to shape routing, hotel count, and room needs.",
            },
        )
        kept_stop_ids.append(stop.id)

        booking_status = AccommodationBlock.BookingStatus.CONFIRMED if status in {TripItinerary.Status.CONFIRMED, TripItinerary.Status.IN_TRAVEL, TripItinerary.Status.COMPLETED} else AccommodationBlock.BookingStatus.QUOTED
        if stop_data["nights"]:
            AccommodationBlock.objects.update_or_create(
                stop=stop,
                name=stop_data["hotel"],
                defaults={
                    "accommodation_type": AccommodationBlock.AccommodationType.HOTEL,
                    "room_type": stop_data["room"],
                    "board_basis": "Breakfast included",
                    "check_in": arrival_date,
                    "check_out": departure_date,
                    "rooms": max(1, min(4, travelerCount := int(next((part for part in sample.travelers.split() if part.isdigit()), "2")))),
                    "supplier": "Seed accommodation supplier",
                    "booking_status": booking_status,
                    "confirmation_reference": f"DPM-STAY-{str(lead.id)[:6].upper()}-{index}",
                    "notes": "Seeded accommodation block for CRM itinerary planning.",
                },
            )

        experience_status = ExperienceBlock.Status.CONFIRMED if status in {TripItinerary.Status.CONFIRMED, TripItinerary.Status.IN_TRAVEL, TripItinerary.Status.COMPLETED} else ExperienceBlock.Status.QUOTED
        ExperienceBlock.objects.update_or_create(
            stop=stop,
            title=stop_data["experience"],
            defaults={
                "category": "Business support" if sample.service_key == Lead.ServiceKey.CORPORATE else "Experience",
                "start_at": timezone.make_aware(timezone.datetime.combine(arrival_date + timedelta(days=1 if stop_data["nights"] else 0), timezone.datetime.min.time())),
                "supplier": "Seed experience partner",
                "status": experience_status,
                "notes": "Seeded experience or operational activity linked to this stop.",
            },
        )
        running_date = departure_date

    itinerary.stops.exclude(id__in=kept_stop_ids).delete()

    kept_transport_sequences = []
    route_points = [sample.departure_city or "Maputo", *[stop["city"] for stop in stop_plan], sample.departure_city or "Maputo"]
    for index, (from_city, to_city) in enumerate(zip(route_points, route_points[1:]), start=1):
        kept_transport_sequences.append(index)
        TransportSegment.objects.update_or_create(
            itinerary=itinerary,
            sequence_number=index,
            defaults={
                "mode": TransportSegment.Mode.FLIGHT if index in {1, len(route_points) - 1} else TransportSegment.Mode.TRANSFER,
                "from_city": from_city,
                "to_city": to_city,
                "departure_at": timezone.make_aware(timezone.datetime.combine(start_date + timedelta(days=index - 1), timezone.datetime.min.time())),
                "arrival_at": timezone.make_aware(timezone.datetime.combine(start_date + timedelta(days=index - 1), timezone.datetime.min.time())) + timedelta(hours=2),
                "supplier": "Seed transport supplier",
                "booking_status": TransportSegment.BookingStatus.CONFIRMED if status in {TripItinerary.Status.CONFIRMED, TripItinerary.Status.IN_TRAVEL, TripItinerary.Status.COMPLETED} else TransportSegment.BookingStatus.QUOTED,
                "reference": f"DPM-MOVE-{str(lead.id)[:6].upper()}-{index}",
                "notes": "Seeded transport segment connecting itinerary stops.",
            },
        )
    itinerary.transports.exclude(sequence_number__in=kept_transport_sequences).delete()

    return itinerary, created


class Command(BaseCommand):
    help = "Seed the CRM with sample leisure and corporate travel requests."

    @transaction.atomic
    def handle(self, *args, **options):
        created_clients = 0
        updated_clients = 0
        created_leads = 0
        updated_leads = 0
        created_quotes = 0
        updated_quotes = 0
        created_itineraries = 0
        updated_itineraries = 0

        for sample in [*LEISURE_SAMPLES, *CORPORATE_SAMPLES]:
            client_defaults = {
                "name": sample.client_name,
                "client_type": sample.client_type,
                "company_name": sample.company_name,
                "email": sample.email,
                "phone": sample.whatsapp,
                "preferred_contact": sample.preferred_contact,
                "service_level": sample.service_level or sample.service_key,
                "owner": sample.owner,
                "notes": "Seeded sample client record for local CRM review.",
            }

            if sample.client_type == Client.ClientType.CORPORATE:
                client_lookup = {"company_name": sample.company_name}
            else:
                client_lookup = {"email": sample.email}

            client, client_created = Client.objects.update_or_create(
                defaults=client_defaults,
                **client_lookup,
            )
            if client_created:
                created_clients += 1
            else:
                updated_clients += 1

            lead_defaults = {
                "service": sample.service,
                "service_key": sample.service_key,
                "name": sample.name,
                "contact": sample.contact,
                "whatsapp": sample.whatsapp,
                "preferred_contact": sample.preferred_contact,
                "requested_services": sample.requested_services,
                "trip_type": sample.trip_type,
                "departure_city": sample.departure_city,
                "destination": sample.destination,
                "dates": sample.dates,
                "travelers": sample.travelers,
                "budget": sample.budget,
                "urgency": sample.urgency,
                "priority": sample.priority,
                "notes": sample.notes,
                "status": sample.status,
                "lifecycle_stage": sample.lifecycle_stage or Lead.LifecycleStage.NEW_REQUEST,
                "email_status": Lead.EmailStatus.PENDING,
                "internal_notes": sample.internal_notes,
                "client": client,
            }
            lead, lead_created = Lead.objects.update_or_create(
                email=sample.email,
                defaults=lead_defaults,
            )
            if lead_created:
                created_leads += 1
            else:
                updated_leads += 1

            quote, quote_created = seed_quote_for_lead(lead, sample)
            if quote_created:
                created_quotes += 1
            else:
                updated_quotes += 1

            itinerary, itinerary_created = seed_itinerary_for_lead(lead, sample)
            if itinerary_created:
                created_itineraries += 1
            else:
                updated_itineraries += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded sample CRM data: {created_leads} leads created, {updated_leads} leads updated, "
                f"{created_clients} clients created, {updated_clients} clients updated, "
                f"{created_quotes} quotes created, {updated_quotes} quotes updated, "
                f"{created_itineraries} itineraries created, {updated_itineraries} itineraries updated."
            )
        )
