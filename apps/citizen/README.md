# CamTraffic Citizen — Next.js PWA

Mobile-first citizen portal for drivers: fines, violations, appeals, and vehicles.

## Quick start

```bash
cd apps/citizen
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

Login with a **driver** account from your Django backend.

## Environment

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## Pages

| Route | Feature |
|-------|---------|
| `/login` | Driver sign-in |
| `/dashboard` | Overview KPIs |
| `/fines` | Fine list |
| `/fines/[id]` | Pay fine / appeal |
| `/violations` | Violation history |
| `/appeals` | Submit & track appeals |
| `/vehicles` | Registered plates |

## PWA

`public/manifest.json` enables add-to-home-screen. Add `icon-192.png` and `icon-512.png` to `public/` for production.

## Stack

- Next.js 15 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- Django REST API (same backend as `frontend-user` driver portal)

## Production note

**Not used in production Docker/Nginx.** Live citizen UI is `frontend-user` at `/citizen/*` on `app.*`.  
This Next.js app is an optional mobile prototype for demos/R&D only.

## Related

- Production citizen UI: `frontend-user/` (`/citizen/*`)
- Production runbook: `docs/PRODUCTION-RUNBOOK.md`
- Enterprise roadmap: `docs/enterprise/IMPLEMENTATION-ROADMAP.md`
