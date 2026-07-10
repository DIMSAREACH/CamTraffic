# CamTraffic Scripts

Utility scripts for setup, validation, and scaffolding.

## Validation

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run validate` | `validate-structure.mjs` | Phase 1 folder/file structure (Task 010) |
| `npm run validate:env` | `validate-env.mjs` | Required environment variables (Task 006) |
| `npm run validate:locales` | `validate-locales.mjs` | en/km translation key parity (Task 009) |
| `npm run validate:all` | all of the above | Full Phase 1 validation suite |

## Setup

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run setup:env` | `setup-env.mjs` | Copy `.env.example` → `.env` |
| `npm run scaffold` | `scaffold-folders.mjs` | Create task-aligned README folders |

## Recommended CI check

```bash
npm run validate:all
npm run build
```
