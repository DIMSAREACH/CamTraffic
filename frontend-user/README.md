# Frontend User

CamTraffic Traffic Officer & Driver portal.

## Scope

- Phase 2: authentication/security integrations (Tasks 016–024)
- Phase 4: user foundation and feature modules (Tasks 059–082)

## Source Structure

```text
frontend-user/src/
├── app/          # App bootstrap + shared providers (Task 059)
├── routes/       # Route definitions (Task 060)
├── layouts/      # Officer and driver layouts (Tasks 061–062)
├── components/   # Reusable user portal components (Task 059)
├── lib/          # API/auth/helpers/constants (Task 059)
├── themes/       # Theme overrides (Task 008)
├── locales/      # Locale overrides (Task 009)
└── features/     # Officer and driver domain features
```

## Commands

- `npm run dev --workspace=frontend-user`
- `npm run build --workspace=frontend-user`
