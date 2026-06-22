# Chapter 4 — Analysis, Planning & Implementation Guide (CamTraffic)

**Thesis:** Design and Development of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia

**Chapter title (Khmer):** ជំពូកទី៤ — ការវិភាគ ការគ្រោង និងការអនុវត្តន៍

This document reviews your **Chapter 4 outline** (from thesis template / `Chapter4.docx`), compares it to the **actual CamTraffic system**, lists what is missing, gives a **corrected table of contents**, and explains how to use **company/police documents** in your thesis.

**Related:** [CHAPTER4_IMPLEMENTATION.md](./CHAPTER4_IMPLEMENTATION.md) (code mapping) · [CHAPTER3_SYSTEM_DESIGN.md](./CHAPTER3_SYSTEM_DESIGN.md) (design diagrams)

---

## 1. Short Answer

| Question | Answer |
|----------|--------|
| Is your current Chapter 4 outline enough? | **No** — section 4.3 uses **wrong technology** (Laravel, Vue3, XAMPP, PHP, MySQL) |
| Is the structure (Analysis → Design → Implementation) OK? | **Yes** — keep 4.1, 4.2, 4.3 structure |
| What is missing? | AI module, Expert System, correct install stack, company document analysis, screenshots |
| Should you ask for police/company documents? | **Yes — strongly recommended** |

---

## 2. Your Original Outline vs CamTraffic

### 2.1 Original outline (from template)

```
ជំពូកទី៤ — ការវិភាគ ការគ្រោង និងការអនុវត្តន៍

៤.១. ការវិភាគ
  ៤.១.១. ការវិភាគលើប្រព័ន្ធបច្ចុប្បន្ន
    ៤.១.១.១. សេចក្តីសង្ខេបពីប្រព័ន្ធបច្ចុប្បន្ន
  ៤.១.២. ការវិភាគលើប្រព័ន្ធសំណើ
    ៤.១.២.១. លំហូរទិន្នន័យនៃប្រព័ន្ធសំណើ

៤.២. ការគ្រោងនៃប្រព័ន្ធសំណើ
  ៤.២.១. ផ្នែក Input Design
  ៤.២.២. Database Design
  ៤.២.៣. System Architecture

៤.៣. ការអនុវត្តន៍
  ៤.៣.១. ការដំឡើងលើ Server
    ៤.៣.១.១. Windows
    ៤.៣.១.២. Xampp          ❌ NOT USED
    ៤.៣.១.៣. PHP            ❌ NOT USED
    ៤.៣.១.៤. Visual Studio Code
    ៤.៣.១.៥. Laravel        ❌ NOT USED
    ៤.៣.១.៦. Tailwindcss     ✅ USED
    ៤.៣.១.៧. Vue3           ❌ NOT USED (React instead)
    ៤.៣.១.៨. MySQL          ❌ NOT USED (PostgreSQL/SQLite)
  ៤.៣.២. ការដំឡើង Client
    ៤.៣.២.១. ការដំឡើង Client
    ៤.៣.២.២. Access to web browser
```

### 2.2 What CamTraffic actually uses

| Template says | CamTraffic uses |
|---------------|-----------------|
| PHP / Laravel | **Python 3.12+ / Django 4.2 / DRF** |
| Vue3 | **React 18 + TypeScript + Vite** |
| XAMPP | **Python venv + `manage.py runserver`** |
| MySQL | **PostgreSQL** (prod) / **SQLite** (dev) |
| Tailwind | **Tailwind CSS 4** ✅ |
| VS Code | **VS Code / Cursor** ✅ |
| (not listed) | **YOLOv8, OpenCV, EasyOCR, Gemini, edge-tts** |

---

## 3. Section-by-Section Review

### ៤.១. ការវិភាគ (Analysis)

| Section | Enough? | Action |
|---------|---------|--------|
| 4.1.1 Current system summary | ⚠️ Partial | Describe **manual police workflow** (paper forms, no AI) — use company documents |
| 4.1.1.1 Current system overview | ⚠️ Partial | Add problems: slow lookup, no central DB, no sign AI |
| 4.1.2 Proposed system analysis | ⚠️ Partial | Add proposed **AI + Expert System** benefits |
| 4.1.2.1 Proposed data flow | ⚠️ Missing detail | Use DFD from [CHAPTER3 §3.11](./CHAPTER3_SYSTEM_DESIGN.md) |

**Add these subsections:**

| New section | Content |
|-------------|---------|
| 4.1.1.2 | Problems/limitations of current manual system |
| 4.1.1.3 | Comparison table: Manual vs CamTraffic |
| 4.1.2.2 | Proposed AI detection data flow |
| 4.1.3 | Requirements summary (from `PRD.md`) |

---

### ៤.២. ការគ្រោង (Design)

| Section | Enough? | Action |
|---------|---------|--------|
| 4.2.1 Input Design | ⚠️ Partial | Upload, webcam, login, fine forms, vehicle forms |
| 4.2.2 Database Design | ⚠️ Partial | Use [ERD.md](./ERD.md) — 20 entities |
| 4.2.3 System Architecture | ⚠️ Partial | Use [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) |

**Add these subsections:**

| New section | Reference |
|-------------|-----------|
| 4.2.4 API / REST Design | [API.md](./API.md) |
| 4.2.5 AI Module Design | [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) |
| 4.2.6 Expert System Design | ViolationRule engine |
| 4.2.7 Security Design | JWT, RBAC, OAuth — [CHAPTER3 §3.15](./CHAPTER3_SYSTEM_DESIGN.md) |
| 4.2.8 UI Design | Admin + User portals — [CHAPTER3 §3.17](./CHAPTER3_SYSTEM_DESIGN.md) |

---

### ៤.៣. ការអនុវត្តន៍ (Implementation)

| Section | Enough? | Action |
|---------|---------|--------|
| 4.3.1 Server install (XAMPP/Laravel/Vue/MySQL) | ❌ **Wrong** | **Replace entirely** — see Section 5 below |
| 4.3.2 Client install | ⚠️ Partial | Browser access to `:5173` and `:5174` |
| AI training & detection | ❌ **Missing** | Add 4.3.4 AI Module |
| Backend / Frontend code | ❌ **Missing** | See [CHAPTER4_IMPLEMENTATION.md](./CHAPTER4_IMPLEMENTATION.md) |
| Screenshots | ❌ **Missing** | `docs/screenshots/` via `capture_defense_screenshots.py` |

---

## 4. Corrected Chapter 4 Table of Contents (CamTraffic)

Use this in your Word thesis instead of the Laravel/XAMPP template.

```
ជំពូកទី៤ — ការវិភាគ ការគ្រោង និងការអនុវត្តន៍

៤.១. ការវិភាគ
  ៤.១.១. ការវិភាគលើប្រព័ន្ធបច្ចុប្បន្ន
    ៤.១.១.១. សេចក្តីសង្ខេបពីប្រព័ន្ធបច្ចុប្បន្ន (Manual / Paper-based)
    ៤.១.១.២. បញ្ហា និងកំហុសនៃប្រព័ន្ធបច្ចុប្បន្ន
    ៤.១.១.៣. ឯកសារយោងពីអង្គភាព (ច្បាប់ · ទម្រង់ពិន័យ · កំណត់ត្រារំលោភ · របាយការណ៍)
  ៤.១.២. ការវិភាគលើប្រព័ន្ធសំណើ (CamTraffic)
    ៤.១.២.១. លំហូរទិន្នន័យនៃប្រព័ន្ធសំណើ
    ៤.១.២.២. លំហូរ AI Detection និង Expert System
    ៤.១.២.៣. តារាងប្រៀបធៀប (Manual vs Proposed)
  ៤.១.៣. សេចក្តីសង្ខេបតម្រូវការប្រព័ន្ធ

៤.២. ការគ្រោងនៃប្រព័ន្ធសំណើ
  ៤.២.១. Input Design
  ៤.២.២. Database Design
  ៤.២.៣. System Architecture
  ៤.២.៤. API / REST Design
  ៤.២.៥. AI Module Design (YOLOv8 · Gemini · EasyOCR)
  ៤.២.៦. Expert System Design (ViolationRule)
  ៤.២.៧. Security Design
  ៤.២.៨. User Interface Design

៤.៣. ការអនុវត្តន៍
  ៤.៣.១. ការដំឡើង Development Environment
    ៤.៣.១.១. Windows + Python 3.12 + venv
    ៤.៣.១.២. Django + pip install -r requirements.txt
    ៤.៣.១.៣. Node.js + npm (Vite)
    ៤.៣.១.៤. PostgreSQL (Production) / SQLite (Development)
    ៤.៣.១.៥. Visual Studio Code / Cursor
    ៤.៣.១.៦. Tailwind CSS 4
    ៤.៣.១.៧. AI libraries (Ultralytics, OpenCV, EasyOCR)
  ៤.៣.២. Backend Implementation (Django + DRF)
  ៤.៣.៣. Frontend Implementation (React + Vite)
  ៤.៣.៤. AI Module Implementation (Dataset · Train · Detect)
  ៤.៣.៥. Client Access (Browser · Login by Role)
  ៤.៣.៦. Screenshots of Implemented Modules
```

---

## 5. Section 4.3.1 — Correct Installation Steps (CamTraffic)

Replace XAMPP/Laravel/Vue/MySQL with these steps (from `README.md`).

### 5.1 Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env         # USE_SQLITE=True by default
python manage.py migrate
python manage.py create_admin
python manage.py seed_data
python manage.py runserver
```

### 5.2 Frontend setup

```bash
# From project root
npm run install:frontends
npm run dev
```

| Portal | URL | Roles |
|--------|-----|-------|
| User (driver / police) | http://localhost:5173 | police, driver |
| Admin | http://localhost:5174 | admin |

### 5.3 AI module setup

```bash
cd ai
..\backend\venv\Scripts\python.exe build_dataset.py
..\backend\venv\Scripts\python.exe train.py --epochs 30 --device cpu
```

Set in `backend/.env`:

```env
AI_USE_MOCK=False
AI_MODEL_PATH=../ai/weights/best.pt
GEMINI_API_KEY=your-key
GEMINI_ENABLED=True
```

### 5.4 Technology install table (for thesis)

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.12+ | Backend + AI |
| Django | 4.2 | Web framework |
| DRF | 3.14+ | REST API |
| Node.js | 18+ | Frontend build |
| React | 18.3 | UI |
| Vite | 6.3 | Dev server / build |
| Tailwind CSS | 4.1 | Styling |
| PostgreSQL | 14+ | Production DB |
| Ultralytics | 8.0+ | YOLOv8 |
| OpenCV | 4.8+ | Image processing |
| EasyOCR | 1.7+ | Plate OCR |

---

## 6. Company / Police Documents — Should You Ask?

### 6.1 Recommendation: **Yes — strongly recommended**

Asking for official documents makes your thesis **more realistic** and supports **section 4.1.1 (current system analysis)**.

**Suggested appendix line (Khmer):**

> ឯកសាររួមមាន៖ ច្បាប់ចរាចរណ៍ ទម្រង់ពិន័យ កំណត់ត្រាការរំលោភ និងរបាយការណ៍ប្រចាំខែរបស់ប៉ូលីសចរាចរណ៍ — ទទួលបានពី [ឈ្មោះអង្គភាព] ក្នុងពេលវិភាគតម្រូវការ ដើម្បីប្រៀបធៀបប្រព័ន្ធដៃគូ និងរចនាម៉ូឌុលពិន័យ/រំលោភឱ្យសមស្តង់ទៅនឹងការអនុវត្តជាក់ស្តែង។

**Suggested appendix line (English):**

> Supporting documents received from [Organization Name] for requirements analysis: traffic regulations, fine ticket forms, violation records, and monthly traffic police reports.

### 6.2 How each document maps to CamTraffic

| Document (Khmer) | Use in thesis | Maps to system |
|------------------|---------------|----------------|
| **ច្បាប់ចរាចរណ៍** | Legal framework in 4.1.1; validate violation types | `ViolationRule`, `traffic_signs.penalty` |
| **ទម្រង់ពិន័យ** | Input design 4.2.1; compare with digital fine PDF | `Fine` model, `GET /api/fines/{id}/pdf/` |
| **កំណត់ត្រាការរំលោភ** | Manual process analysis; DB field design | `TrafficViolation`, evidence images |
| **របាយការណ៍ប្រចាំខែប៉ូលីស** | Justify Reports module | `ReportsPage`, `GET /api/dashboard/police/reports/pdf/` |

### 6.3 Extra documents worth requesting

| Document | Why |
|----------|-----|
| Fine amount schedule (តារាងកំរិតពិន័យ) | Realistic `default_fine_amount` in rules |
| Official traffic sign reference | Validate 236-sign catalog |
| Officer standard operating procedure (SOP) | Use cases + workflow |
| Sample filled form (anonymized) | Before/after comparison in Ch.4 |
| Letter of cooperation (if allowed) | Defense credibility |

### 6.4 Important cautions

| Topic | Guidance |
|-------|----------|
| **Privacy** | Anonymize names, plates, ID numbers in thesis |
| **Copyright** | Cite source; list in appendix |
| **Disclaimer** | State CamTraffic is a **prototype / academic project**, not an official government system |
| **If refused** | Use public road traffic law + your reference sign PDF folder; note limitation in 4.1.1 |

---

## 7. Khmer Text Samples (copy to Word)

### ៤.១.១.១. សេចក្តីសង្ខេបពីប្រព័ន្ធបច្ចុប្បន្ន

បច្ចុប្បន្ន ការអនុវត្តច្បាប់ចរាចរណ៍នៅកម្ពុជាភាគច្រើនអាស្រ័យលើ **ការងារដៃគូ** របស់ប៉ូលីសចរាចរណ៍។ ការកត់ត្រាការរំលោភ និងការចេញពិន័យ ត្រូវបានធ្វើតាម **ទម្រង់ពិន័យ** និង **កំណត់ត្រារំលោភ** ដោយដៃ។ ការស្វែងរកព័ត៌មានអ្នកបើកបរ យានយន្ត ឬប្រវត្តិពិន័យ ត្រូវការពេលវេលា និងមិនមាន **មូលដ្ឋានទិន្នន័យកណ្តាល** ឬ **ប្រព័ន្ធរកឃើញសញ្ញាដោយស្វ័យប្រវត្តិ**។ របាយការណ៍ប្រចាំខែត្រូវបានបង្កើតដោយដៃ ឬ Excel ដែលពិបាករួមបញ្ចូលគ្នាសម្រាប់អ្នកគ្រប់គ្រង។

### ៤.១.២.១. លំហូរទិន្នន័យនៃប្រព័ន្ធសំណើ

ប្រព័ន្ធសំណើ CamTraffic រៀបចំលំហូរទិន្នន័យជា **Hybrid AI Architecture**៖ ទទួលរូបភាព (Upload/Webcam) → OpenCV → YOLOv8 (សញ្ញា) → YOLOv8n (យានយន្ត) → EasyOCR (ស្លាកលេខ) → ViolationRule Engine (Expert System) → រក្សាទុកកំណត់ត្រា និងពិន័យក្នុង PostgreSQL។ ក្នុងករណី YOLO confidence ទាប ប្រព័ន្ធប្រើ Gemini Vision API ជា Fallback។

### ៤.១.២.៣. តារាងប្រៀបធៀប

| លក្ខណៈ | ប្រព័ន្ធបច្ចុប្បន្ន (Manual) | CamTraffic (Proposed) |
|--------|---------------------------|------------------------|
| កត់ត្រារំលោភ | ទម្រង់ពិន័យ (ករៀប) | Database + evidence images |
| រកឃើញសញ្ញា | ការសង្កេតដោយភ្នែក | YOLOv8 + 236+ signs |
| ស្វែងរកអ្នកបើកបរ | ដៃ / ទូរស័ព្ទ | Plate OCR + vehicle DB |
| របាយការណ៍ | Excel / ដៃ | Dashboard + PDF export |
| ពេលវេលា | យឺត | Near real-time (webcam/upload) |

---

## 8. Mapping: Chapter 4 → Project Docs

| Thesis section | CamTraffic document / code |
|----------------|---------------------------|
| 4.1.1 Current system | Company docs + `PRD.md` §2 Problem Statement |
| 4.1.2 Proposed flow | [CHAPTER3 §3.11 DFD](./CHAPTER3_SYSTEM_DESIGN.md) |
| 4.2.1 Input design | Login, upload, fine forms — frontend pages |
| 4.2.2 Database | [ERD.md](./ERD.md) |
| 4.2.3 Architecture | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) |
| 4.2.5 AI design | [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) |
| 4.3 Implementation | [CHAPTER4_IMPLEMENTATION.md](./CHAPTER4_IMPLEMENTATION.md) |
| 4.3.6 Screenshots | `docs/screenshots/` |
| Results (link Ch.5) | [CHAPTER5_RESULTS.md](./CHAPTER5_RESULTS.md) |

---

## 9. Pre-Submission Checklist

- [ ] Remove all references to Laravel, Vue3, XAMPP, PHP, MySQL from Chapter 4
- [ ] Add Django, React, Python, PostgreSQL, YOLOv8 to section 4.3.1
- [ ] Write 4.1.1 using company documents (or note if unavailable)
- [ ] Include comparison table Manual vs CamTraffic
- [ ] Add AI module implementation (4.3.4)
- [ ] Add Expert System (ViolationRule) in 4.2.6
- [ ] Insert architecture/DFD/ERD figures from Chapter 3
- [ ] Add implementation screenshots
- [ ] Link to Chapter 5 test results (AI-06, TS-03, E2E tests)
- [ ] Appendix: list supporting documents from police/company

---

## 10. Manual vs Template — Remove / Keep / Add

| Item in template | Action |
|------------------|--------|
| XAMPP | **Remove** |
| PHP | **Remove** |
| Laravel | **Remove** |
| Vue3 | **Remove** → use React |
| MySQL | **Remove** → use PostgreSQL/SQLite |
| Windows | **Keep** (dev environment) |
| VS Code | **Keep** |
| Tailwind | **Keep** |
| Python + Django | **Add** |
| Node.js + Vite + React | **Add** |
| YOLOv8 + OpenCV + EasyOCR | **Add** |
| Gemini hybrid AI | **Add** |
| Expert System rules | **Add** |
| Company documents appendix | **Add** |

---

*Chapter 4 Analysis & Planning Guide — CamTraffic thesis, aligned with actual codebase.*
