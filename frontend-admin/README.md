# Frontend Admin

CamTraffic Super Administrator portal.

## Scope

- Phase 2: authentication/security integrations (Tasks 015–024)
- Phase 3: admin foundation and feature modules (Tasks 025–058)

## Source Structure

```text
frontend-admin/src/
├── app/          # App bootstrap + shared providers (Task 025)
├── routes/       # Route definitions (Task 026)
├── layouts/      # Admin layouts (Tasks 027–030)
├── components/   # Reusable admin components (Task 025)
├── lib/          # API/auth/helpers/constants (Task 025)
├── themes/       # Theme overrides (Task 008)
├── locales/      # Locale overrides (Task 009)
└── features/     # Domain features by task
```

## Commands

- `npm run dev --workspace=frontend-admin`
- `npm run build --workspace=frontend-admin`
