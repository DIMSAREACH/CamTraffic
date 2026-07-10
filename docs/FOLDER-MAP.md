# CamTraffic Folder Map

Complete mapping of project folders to development tasks.

## Root

| Path | Purpose | Tasks |
|------|---------|-------|
| `docs/` | Central documentation hub | All |
| `scripts/` | Build and validation scripts | 001, 010 |
| `deploy/` | Docker, Nginx, CI/CD | 002, 121–128 |
| `tests/` | QA test suites | 113–120 |
| `packages/` | Shared TypeScript packages | 003, 106–112 |

## Frontend Admin (`frontend-admin/`)

```text
frontend-admin/
├── docs/FEATURES.md
└── src/
    ├── app/                    # 025–027
    ├── routes/                 # 026
    ├── layouts/                # 027–030
    ├── components/             # 025
    ├── lib/                    # 025
    ├── themes/                 # 008
    ├── locales/                # 009
    └── features/
        ├── auth/               # 015, 017–019
        ├── profile/            # 021–022
        ├── dashboard/          # 031–037
        ├── users/              # 038
        ├── roles/              # 039
        ├── permissions/        # 040
        ├── officers/           # 041
        ├── police-stations/    # 042
        ├── ai-models/          # 043–046
        ├── cameras/            # 047–049
        ├── traffic-signs/      # 050–051
        ├── reports/            # 052, 054
        ├── analytics/          # 053
        ├── audit-logs/         # 055, 023
        ├── notifications/      # 056
        ├── system-settings/    # 057
        └── backup/             # 058
```

## Frontend User (`frontend-user/`)

```text
frontend-user/
├── docs/FEATURES.md
└── src/
    ├── app/                    # 059
    ├── routes/                 # 060
    ├── layouts/
    │   ├── officer/            # 061
    │   └── driver/             # 062
    ├── components/             # 059
    ├── lib/                    # 059
    ├── themes/                 # 008
    ├── locales/                # 009
    └── features/
        ├── auth/               # 016–019
        ├── officer/
        │   ├── dashboard/      # 063
        │   ├── live-detection/ # 064
        │   ├── live-camera/    # 065
        │   ├── violations/     # 066–067
        │   ├── drivers/        # 068
        │   ├── vehicles/       # 069
        │   ├── evidence/       # 070
        │   ├── reports/        # 071
        │   ├── notifications/  # 072
        │   └── profile/        # 073
        └── driver/
            ├── dashboard/      # 074
            ├── profile/        # 075
            ├── vehicles/       # 076
            ├── violations/     # 077
            ├── fines/          # 078–079
            ├── appeals/        # 080
            ├── notifications/  # 081
            └── settings/       # 082
```

## Backend (`backend/`)

```text
backend/
├── config/                     # 004, 006, 007, 024
├── docs/
│   ├── API.md
│   └── database/               # 005
└── apps/
    ├── accounts/               # 011–012, 091
    ├── rbac/                   # 013–014
    ├── users/                  # 021–023, 092
    ├── officers/               # 041–042, 093
    ├── drivers/                # 068, 094
    ├── vehicles/               # 069, 095
    ├── cameras/                # 047–049, 096
    ├── traffic_signs/          # 050–051, 097
    ├── ai_models/              # 043–045
    ├── detections/             # 046, 087–089, 098
    ├── ocr/                    # 085, 099
    ├── violations/             # 066–067, 100
    ├── fines/                  # 078–079, 101
    ├── appeals/                # 080, 102
    ├── reports/                # 052–054, 103
    ├── notifications/          # 056–057, 104
    ├── dashboard/              # 032–037, 105
    ├── audit/                  # 055, 023
    └── system/                 # 057–058
```

## AI Service (`ai-service/`)

```text
ai-service/
├── docs/MODULES.md
├── models/                     # Trained weights
└── app/
    ├── detection/              # 083
    ├── processing/             # 084
    ├── ocr/                    # 085
    ├── pipeline/               # 086
    ├── storage/                # 087
    ├── metrics/                # 088
    ├── api/                    # 089
    └── health/                 # 090
```

## Shared Packages (`packages/`)

```text
packages/
├── docs/PACKAGES.md
├── ui/src/
│   ├── components/             # 106
│   ├── theme/                  # 111
│   └── locales/                # 112
├── api/src/
│   ├── endpoints/              # 107
│   └── interceptors/           # 107
├── hooks/src/                  # 108
├── types/src/
│   ├── entities/               # 109
│   └── api/                    # 109
└── utils/src/
    ├── format/                 # 110
    └── validation/             # 110
```

## Tests & Deploy

```text
tests/
├── backend/          # 113
├── frontend-admin/   # 114
├── frontend-user/    # 115
├── api/              # 116
├── integration/      # 117
├── e2e/              # 118
├── performance/      # 119
└── security/         # 120

deploy/
├── docker/           # 002, 121
├── nginx/            # 122
├── gunicorn/         # 123
├── celery/           # 124
├── cicd/             # 125
├── env/              # 126
└── ssl/              # 127
```

Each folder contains a `README.md` with task references, overview, and status checkboxes.
