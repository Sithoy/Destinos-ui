# Frontend Modules

This folder documents the intended frontend module boundaries for DPM.

The current Vite app still uses the existing `src/` structure. The module folders are being introduced first as a readability layer before any import-moving refactor.

## Product Areas

- `landing/` - public website and simplified client request flow.
- `crm/` - internal DPM workspace for request processing and travel operations.
- `ctm/` - corporate travel management workspace for company travel.

## Migration Rule

Move code into these folders gradually. Each migration should keep the application building and should not mix CRM, CTM, and Landing changes unless explicitly requested.
