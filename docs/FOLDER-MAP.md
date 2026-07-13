# CamTraffic — Repository Folder Map

**Version:** 1.0 · **Date:** July 2026

```
CamTraffic/
├── README.md                 # Project overview & quick start
├── package.json              # Root workspace scripts
├── turbo.json                # Turborepo pipeline
├── tsconfig.base.json        # Shared TypeScript strict config
├── docker-compose.yml        # Postgres, Redis, backend, Celery
├── docs/                     # PRD, SRS, architecture, checklist
├── scripts/                  # validate, setup-env, dataset tools
├── packages/                 # Shared npm packages (@camtraffic/*)
│   ├── types/                # User, Auth, API types
│   ├── utils/                # cn(), formatters
│   ├── api/                  # createApiClient(), unwrap()
│   ├── hooks/                # useMediaQuery, useDebouncedValue
│   └── ui/                   # Theme tokens (colors, fonts)
├── backend/                  # Django REST API
│   ├── camtraffic/           # settings, urls, celery, wsgi
│   ├── config/               # logging.py, monitoring.py
│   ├── core/                 # middleware, backup, permissions, SystemSetting
│   ├── authentication/       # JWT, OAuth, password reset
│   ├── users/                # User model (admin/police/driver)
│   ├── ai_detection/         # YOLO + OCR pipeline API
│   ├── violations/ fines/ appeals/
│   ├── traffic_signs/ vehicles/ infrastructure/
│   ├── dashboard/ notifications/ audit/ rbac/
│   ├── tests/                # Automated tests
│   ├── media/ logs/ backups/ # Runtime (gitignored)
│   └── manage.py
├── frontend-admin/           # Admin portal (Vite + React)
│   ├── admin/                # Admin layout, dashboard, users
│   ├── shared/               # Pages, API client, styles, i18n
│   ├── routes.tsx
│   └── dist/                 # Production build output
├── frontend-user/            # User portal — police + driver
│   ├── user/                 # User layout, sidebar
│   ├── shared/               # Synced copy of shared modules
│   └── routes.tsx
├── ai/                       # ML assets (not a separate FastAPI service)
│   ├── weights/              # best.pt (gitignored)
│   ├── dataset/              # 236-class YOLO signs (gitignored)
│   ├── dataset_10/           # 10-class YOLO dataset
│   ├── datasets/             # Phase 7 manifests + raw/processed layout
│   ├── scripts/              # collection_tracker, dedup, validate
│   ├── runs/                 # Training outputs
│   ├── requirements.txt
│   └── README.md
└── deploy/
    ├── env/BACKUP.md
    ├── env/DATASET_BACKUP.md
    ├── gunicorn/gunicorn.conf.py
    └── docker/docker-compose.prod.yml
```

## Notes

- **Shared UI code** lives in `frontend-*/shared/` (duplicated between portals). Packages under `packages/ui` provide **tokens only**; full components remain in `shared/`.
- **API client** used at runtime: `frontend-*/shared/services/api.ts`. `@camtraffic/api` is the canonical factory for new code.
- **AI inference** runs inside Django (`backend/ai_detection/`), not a separate `ai-service/` container.

## Related

- `docs/ARCHITECTURE.md` — logical architecture
- `scripts/scaffold-folders.mjs` — create runtime directories
