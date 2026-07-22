# Defense talking points — Multi-domain architecture (30–60 sec)

Use after showing the live demo of Admin → Officer → Citizen.

---

## One-liner

> “CamTraffic is designed as a **multi-domain traffic law enforcement system**: Administration, Traffic Operations, and Citizen Service are separated in the UI, APIs, and permissions—not put into a single Admin Dashboard.”

---

## 20-second expansion

| Domain | Route | Who | Job |
|--------|-------|-----|-----|
| Administration | `/admin` | Admin | Users, RBAC, cameras, AI models, audit |
| Traffic Operations | `/officer` | Officer | AI review, approve/reject, issue fine |
| Citizen Service | `/citizen` | Driver | Own vehicles, fines, appeals |

**Key rule for examiners:** *Admins configure the system; only officers issue fines.*

---

## If asked “Why separate?”

1. **Security** — least privilege (citizen cannot approve; admin cannot issue fines)  
2. **Real-world government systems** — admin ≠ traffic police ≠ citizen app  
3. **Maintainability** — clear folders (`officer/`, `citizen/`, `admin/`) and `/api/v1/{domain}/`  

**Thesis pointer:** Chapter **4.2.5** — `CHAPTER-4-2-5-MULTI-DOMAIN-ARCHITECTURE.md`

---

## Live demo path (confirm URLs)

1. Admin → http://localhost:5174 → `/admin/dashboard`  
2. Officer → http://localhost:5173 → `/officer`  
3. Citizen → http://localhost:5173 → `/citizen`  

Accounts: `docs/final-year-project/DEMO-ACCOUNTS.md`
