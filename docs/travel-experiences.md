# Travel inspiration

Public routes: `/inspiracao` and `/inspiracao/<slug>`.

Manage content in Django admin → CRM → Travel experiences. Portuguese and English copy use ordinary text fields; enter itinerary days, inclusions, exclusions, highlights and optional experiences one per line. Use HTTPS photograph URLs. Gallery is a JSON list of URLs; styles is a JSON list using the displayed filter names.

The optional **Detail hero** field controls the wide experience-page image independently of the discovery-card **Hero** photograph. Leave it empty to use the card image. Use a wide composition with a mobile-safe central subject. Mobile discovery uses native region/style dropdowns; desktop retains the chips, with shared filter state.

- Save with **Published** unchecked to prepare a draft.
- **Published** makes the experience discoverable; **Featured** makes it eligible for the homepage.
- Keep published slugs stable because visitors may save their links.
- The homepage selects up to three distinct featured experiences, prioritising variety. Selection remains stable during navigation and changes on a full reload. A single experience uses a wider editorial presentation.
- Prices are editorial text. Specify currency, per-person basis, dates and conditions when publishing a verified indicative price; otherwise use “Sob consulta” / “On request”.
- Paris Essencial is a suggested five-night itinerary, seeded once by migration. Flights, admissions and extras are not represented as confirmed bookings.

Every published save creates an immutable revision. An enquiry references the version the visitor viewed. The backend resolves that version and stores a snapshot on the lead. Client changes remain in the request notes; the CRM request panel exposes the original inspiration separately. Django admin also displays the complete read-only snapshot. Retrying the same submission does not create a duplicate, even if content has since changed.

Unpublish to withdraw an experience. Historical revisions are retained for existing enquiries. Publishing additional destinations does not require a frontend deployment.

Verification: backend tests in `crm.test_travel_content`; selection tests in `frontend/tests/experiences.test.ts`; browser enquiry checks use the isolated local SQLite database, never production customer records.
