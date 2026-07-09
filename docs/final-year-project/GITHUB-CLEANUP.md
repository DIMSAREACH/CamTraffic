# GitHub Repository Cleanup

**Task 158 — Final Year Project**
**Date**: 2026-07

---

## 1. Cleanup Checklist

### 1.1 Repository Structure

- [x] All source code in correct monorepo folders (no files in root that belong in subfolders)
- [x] All documentation in `docs/` or service-specific `docs/` subfolders
- [x] No `.DS_Store`, `Thumbs.db`, or editor temp files committed
- [x] All `__pycache__/` and `.pyc` files excluded by `.gitignore`
- [x] All `node_modules/` excluded by `.gitignore`
- [x] All `*.pt` weight files excluded by `.gitignore` (only reference kept in `ai-service/models/`)
- [x] All `.env` files excluded (only `.env.example` committed)
- [x] Large dataset files (images, labels) excluded by `.gitignore`

### 1.2 Branch Management

- [x] All development merged to `main` (or `master`)
- [x] Delete stale feature branches:
  ```bash
  git branch -d feature/phase-10-ai-model
  git branch -d feature/phase-11-integration
  git branch -d feature/phase-12-docs
  ```
- [x] Confirm `main` is the default branch on GitHub

### 1.3 Commit History

- [x] Descriptive commit messages following `type: description` convention
- [x] No secrets or credentials in commit history
  ```bash
  git log --all --full-history -- "**/.env" "**/*.key" "**/*.pem"
  # Should return no results
  ```
- [x] Final commit includes all Phase 13 documentation

### 1.4 README

- [x] Root `README.md` present with:
  - Project title and brief description
  - Architecture overview
  - Quick start (Docker Compose)
  - Link to full docs (`docs/`)
  - Tech stack badges

---

## 2. .gitignore Verification

Ensure these patterns are in `.gitignore`:

```gitignore
# Python
__pycache__/
*.pyc
*.pyo
.venv/
*.egg-info/

# Node
node_modules/
dist/
.turbo/

# Environment
.env
.env.*
!.env.example

# AI weights and datasets
*.pt
*.onnx
ai-service/data/datasets/raw/
ai-service/data/datasets/splits/
ai-service/data/datasets/processed/
ai-service/runs/detect/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

---

## 3. GitHub Repository Settings

- [ ] Description set: "AI-Based Traffic Sign Detection and Traffic Law Enforcement System for Cambodia"
- [ ] Topics/tags added: `yolo`, `computer-vision`, `django`, `fastapi`, `react`, `cambodia`, `traffic-enforcement`
- [ ] License file present (if public release): MIT or academic use
- [ ] `CODEOWNERS` or branch protection rules set on `main`
- [ ] GitHub Actions workflows passing (all checks green)
- [ ] Issues and PR templates created (`.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`)

---

## 4. Final Tag

Create a release tag for the thesis submission version:

```bash
git tag -a v1.0.0 -m "CamTraffic v1.0.0 - Final Year Project Submission"
git push origin v1.0.0
```

Create a GitHub Release:
- Tag: `v1.0.0`
- Title: `CamTraffic v1.0.0 — Final Year Project`
- Body: link to `docs/THESIS.md` and `docs/INSTALLATION-GUIDE.md`

---

## 5. Repository URL

> Update this with the actual repository URL before submission:

```
https://github.com/[your-username]/camtraffic
```
