# GitHub — manual push only

**Repository:** [github.com/SareachGenZ/CamTraffic](https://github.com/SareachGenZ/CamTraffic)

This project **does not** auto-push to GitHub when you edit code, run `npm run dev`, or save files.  
GitHub updates happen **only when you run `git push`** or ask the assistant to **“push to GitHub”**.

There is **no** GitHub Actions workflow and **no** git hook that pushes for you.

---

## Already set up on this PC

| Item | Status |
|------|--------|
| Git repo | Yes (`main` branch) |
| Remote `origin` | `https://github.com/SareachGenZ/CamTraffic.git` |
| Initial code on GitHub | Yes (pushed) |
| Auto-push on save | **No** |

---

## When you change the system later

After you edit features, run these **only when you want GitHub updated**:

```powershell
cd "d:\Year4\Project Thesis\Expert System\Project\CamTraffic"

git add -A
git status
git commit -m "Short description of what you changed"
git push
```

Or tell Cursor: **“push to GitHub”** — it will commit and push for you.

---

## First-time setup on another computer

```powershell
git clone https://github.com/SareachGenZ/CamTraffic.git
cd CamTraffic

# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate

# Frontends (from project root)
cd ..
npm run install:frontends
```

Fill in `backend/.env` and `frontend-*/.env` locally (not on GitHub).

---

## What is **not** on GitHub (on purpose)

| Path | Why |
|------|-----|
| `backend/.env` | API keys, OAuth secrets |
| `frontend-user/.env`, `frontend-admin/.env` | Local config |
| `backend/venv/`, `node_modules/` | Dependencies (reinstall) |
| `ai/weights/*.pt`, `ai/dataset/` | Large files (train locally) |
| `backend/db.sqlite3`, `backend/media/` | Local data |

Use `backend/.env.example` and `frontend-*/.env.example` as templates.

---

## Push errors (403)

If you see `Permission denied to SareachGenZ` while logged in as another GitHub user:

1. Windows **Credential Manager** → remove `git:https://github.com`
2. Push again and sign in as **SareachGenZ** (use a **Personal Access Token** as password)

```powershell
git remote set-url origin https://SareachGenZ@github.com/SareachGenZ/CamTraffic.git
git push
```
