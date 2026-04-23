# DPM CRM Backend MVP

This Django backend powers the first operational CRM stage.

## Local Setup

```bash
python -m pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver
```

Set the frontend API URL:

```bash
copy .env.example .env
```

Then keep `VITE_CRM_API_URL=http://localhost:8000` in `.env` and run the frontend with:

```bash
npm run dev
```

## API

- `POST /api/public/leads/` creates public website form leads.
- `POST /api/auth/login/` returns a CRM token.
- `POST /api/auth/logout/` revokes the CRM token.
- `GET /api/auth/me/` returns the signed-in user.
- `GET/POST/PATCH/DELETE /api/leads/` manages CRM leads for authenticated users.
- `GET/POST/PATCH/DELETE /api/clients/` manages registered CRM clients for authenticated CRM users.

## Roles

CRM access is allowed for:

- superusers
- staff users
- Django group members in `crm_admin`, `crm_manager`, `crm_agent`, or `crm_viewer`

Client registration/editing is allowed for:

- superusers
- staff users
- Django group members in `crm_admin`, `crm_manager`, or `crm_agent`

## Production Notes

Use PostgreSQL through `DATABASE_URL`, set a strong `DJANGO_SECRET_KEY`, configure `DJANGO_ALLOWED_HOSTS`, and set `DJANGO_CORS_ALLOWED_ORIGINS` to the production website domains.
