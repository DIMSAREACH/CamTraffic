# Thesis Formatting Compliance Checklist

**Task 398** · CamTraffic Final Year Project · Date: 2026-07-12

This document tracks compliance with typical university thesis formatting requirements. **Adjust margins, font, and binding rules to match your institution's official template.**

---

## 1. Document structure

| Requirement | Status | Location |
|-------------|:------:|----------|
| Title page | ⬜ User | Insert in Word export |
| Abstract (150–250 words) | ✅ | Chapter 1 Final §Abstract |
| Table of contents | ⬜ User | Generate in Word |
| List of figures | ⬜ User | Figures 4.1–4.5, 5.1–5.5 |
| List of tables | ⬜ User | Tables 6.1–6.5 |
| 7 chapters | ✅ | `thesis/CHAPTER-*-FINAL.md` |
| References (30+) | ✅ | `thesis/REFERENCES.md` (35 sources) |
| Appendices | ✅ | `thesis/APPENDICES.md` |

---

## 2. Typography (typical academic standard)

| Rule | Recommended | CamTraffic source |
|------|-------------|-------------------|
| Body font | Times New Roman 12pt | Export from Markdown |
| Headings | Bold, numbered 1.1, 1.2 | Present in chapter files |
| Line spacing | 1.5 or double | Apply in Word |
| Margins | 1 inch / 2.54 cm | Apply in Word |
| Page numbers | Bottom center, Roman for front matter | Apply in Word |
| Figure captions | Below figure, numbered | Add on export |
| Table captions | Above table, numbered | Add on export |

---

## 3. Citation style

| Rule | Status |
|------|:------:|
| IEEE numbered citations [1], [2] | ✅ |
| Reference list alphabetical by citation order | ✅ |
| In-text citations in Chapters 1–2 | ✅ |
| Consistent journal/conference format | ✅ |

---

## 4. Figures and diagrams

| Figure | Source file | Format |
|--------|-------------|--------|
| Use case | `diagrams/USE-CASE-DIAGRAM.md` | Mermaid → PNG export |
| Class | `diagrams/CLASS-DIAGRAM.md` | Mermaid → PNG |
| Sequence | `diagrams/SEQUENCE-DIAGRAM-VIOLATION-FLOW.md` | Mermaid → PNG |
| ER | `docs/DATABASE.md` | Mermaid → PNG |
| Deployment | `diagrams/DEPLOYMENT-DIAGRAM.md` | Mermaid → PNG |
| PR curve | `ai/runs/detect/dataset_10_train/PR_curve.png` | PNG |
| Confusion matrix | `ai/runs/detect/dataset_10_train/confusion_matrix.png` | PNG |
| UI screenshots | Capture from running app | PNG |

**Export Mermaid:** VS Code Mermaid preview → export, or https://mermaid.live

---

## 5. Content quality

| Check | Status |
|-------|:------:|
| All chapters have introduction + summary | ✅ |
| Objectives addressed in conclusion | ✅ |
| Limitations stated honestly | ✅ |
| Metrics match evaluation reports | ✅ |
| No placeholder `[Your Name]` in submission copy | ⬜ User must fill |
| Spell-check completed | ⬜ User |
| Grammar review | ⬜ User |

---

## 6. File assembly for submission

Recommended merge order for Word/PDF:

1. Title page  
2. Abstract  
3. Acknowledgements (optional)  
4. Table of contents  
5. List of figures / tables  
6. Chapter 1–7 (FINAL versions)  
7. References  
8. Appendices A–G  

**Source files:** `docs/final-year-project/thesis/`

---

## 7. Institution-specific placeholders

Replace before submission:

- `[Your Name]` — author name  
- `[University]` — institution name  
- `[Supervisor Name]` — advisor  
- Submission date per faculty calendar  

---

## 8. Compliance sign-off

| Item | Reviewer | Date | Pass |
|------|----------|------|:----:|
| Structure complete | Self | 2026-07-12 | ✅ |
| References 30+ | Self | 2026-07-12 | ✅ |
| Metrics verified | Self | 2026-07-12 | ✅ |
| Word template applied | Student | — | ⬜ |
| Supervisor approval | Supervisor | — | ⬜ |

---

*Formatting compliance document complete for Phase 15 Task 398.*
