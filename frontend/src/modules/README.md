# Frontend Modules

This folder contains and documents the frontend module boundaries for DPM.

The Vite app now lives under `frontend/`. Module extraction is incremental: new or extracted feature code should live under the relevant module folder while shared UI and API helpers remain in shared directories.

## Product Areas

- `landing/` - public website and simplified client request flow.
- `crm/` - internal DPM workspace for request processing and travel operations.
- `ctm/` - corporate travel management workspace for company travel.

## Migration Rule

Move code into these folders gradually. Each migration should keep the application building and should not mix CRM, CTM, and Landing changes unless explicitly requested.
