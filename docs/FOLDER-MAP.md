# CamTraffic — Repository Folder Map

**Version:** 1.0 · **Date:** July 2026

```
CamTraffic/
├── README.md                 # Project overview & quick start
├── package.json              # Root workspace scripts
├── turbo.json                # Turborepo pipeline
├── tsconfig.base.json        # Shared TypeScript strict config
├── docker-compose.yml        # Postgres, Redis, backend, Celery, SPAs (+ optional AI)
├── docs/                     # PRD, SRS, DECISIONS, MASTER-BUILD-STATUS, …
├── scripts/                  # validate, setup-env, dataset tools
├── packages/                 # Shared npm packages (@camtraffic/*)
│   ├── types/ store/ query/ …
│   └── ui/                   # Theme tokens
├── src/
│   ├── backend/              # Django REST API + embedded AI pipeline
│   │   ├── camtraffic/       # settings, urls, celery, wsgi
│   │   ├── authentication/ users/ rbac/
│   │   ├── ai_detection/     # YOLO + OCR (primary runtime)
│   │   ├── violations/ fines/ appeals/
│   │   ├── traffic_signs/ vehicles/ infrastructure/
│   │   ├── dashboard/ notifications/ audit/
│   │   └── manage.py
│   ├── web/
│   │   ├── admin/            # Admin portal (Vite :5174) → /admin/*
│   │   ├── user/             # Officer + driver (Vite :5173)
│   │   └── citizen/          # Optional Next.js citizen PWA
│   └── services/             # Optional microservices (thesis/experiments)
├── ai/                       # weights/, dataset_10/, training/, runs/
├── infra/docker/             # Local Dockerfiles (backend, celery, SPAs, …)
└── infrastructure/deploy/    # Production Compose + nginx + env
```

## Notes

- Master-prompt paths `backend/` / `frontend-*` map to `src/backend/` / `src/web/*` — see [`DECISIONS.md`](DECISIONS.md) D1.
- **Shared UI** lives in each portal’s `shared/` (kept in sync). `packages/ui` = tokens.
- **Primary AI** is Django `ai_detection/`. Optional Compose AI containers are not required for portal loops.

## Related

- `docs/ARCHITECTURE.md` — logical architecture
- `docs/DECISIONS.md` — layout/stack judgment calls vs Master Build Prompt
- `docs/MASTER-BUILD-STATUS.md` — phase/acceptance tracker
- `scripts/scaffold-folders.mjs` — create runtime directories
