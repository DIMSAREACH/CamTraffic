# GitHub — manual push only

This project **does not** auto-push to GitHub when you save files or run the app.  
You push **only when you ask** (e.g. “push to GitHub”).

## First-time setup (once)

### 1. Create an empty repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name: e.g. `CamTraffic`
3. **Do not** add README, .gitignore, or license (this project already has them)
4. Create repository
5. Copy the HTTPS URL, e.g. `https://github.com/YOUR_USERNAME/CamTraffic.git`

### 2. Link and push from your PC

```powershell
cd "d:\Year4\Project Thesis\Expert System\Project\CamTraffic"

git remote add origin https://github.com/YOUR_USERNAME/CamTraffic.git
git branch -M main
git push -u origin main
```

Use a **Personal Access Token** as the password if GitHub asks (not your account password).

## Later updates (when you say “push”)

```powershell
cd "d:\Year4\Project Thesis\Expert System\Project\CamTraffic"
git add -A
git status
git commit -m "Describe your changes"
git push
```

## What is not stored on GitHub

- `backend/.env` (API keys, secrets)
- `frontend-*/.env`
- `backend/venv/`, `node_modules/`
- `ai/weights/*.pt`, `ai/dataset/` (too large — retrain locally)

Copy `backend/.env.example` on another machine and fill in your own values.
