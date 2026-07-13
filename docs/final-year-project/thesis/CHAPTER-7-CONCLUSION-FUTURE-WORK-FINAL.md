# Chapter 7 — Conclusion & Future Work

**CamTraffic Final Year Project**

---

## 7.1 Conclusion

This thesis presented the design, development, and evaluation of CamTraffic—an AI-based traffic sign detection and traffic law enforcement system tailored for Cambodia. The project integrated YOLO11n object detection, license plate OCR, Django REST APIs, React web portals, and Docker-based production deployment into a cohesive enforcement workflow.

### 7.1.1 Objectives Revisited

| Objective | Outcome |
|-----------|---------|
| PO1 — Sign detection | **Achieved** — mAP@50 = 0.908 on 10-class model |
| PO2 — Plate OCR | **Partially achieved** — pipeline operational; exact match requires future training |
| PO3 — Enforcement backend | **Achieved** — violations, fines, appeals, 120 API routes |
| PO4 — Multi-role portals | **Achieved** — admin + user portals with RBAC |
| PO5 — Validation | **Achieved** — UAT pass, E2E pass, performance targets met |

Secondary objectives including bilingual UI, reporting, audit logs, and Docker deployment were also completed.

### 7.1.2 Key Contributions

1. A curated 10-class Cambodian traffic sign dataset with YOLO annotations  
2. A hybrid AI + rule-engine architecture separating perception from legal mapping  
3. End-to-end digital workflow from detection to driver notification and appeals  
4. Comprehensive documentation and reproducible deployment stack  
5. Open, auditable codebase suitable for academic examination and institutional pilot  

CamTraffic demonstrates that modern single-stage detectors combined with web-based enforcement systems can be deployed without proprietary ITS hardware in the initial phase.

---

## 7.2 Limitations

| # | Limitation | Consequence |
|---|------------|-------------|
| L1 | 10-class model vs full sign catalog | Many sign types not yet detectable |
| L2 | OCR exact-match rate near zero | Automatic plate linking unreliable |
| L3 | Limited night/rain training data | Edge-case accuracy may degrade |
| L4 | Web-only interface | No native mobile app for field use |
| L5 | Demo payment recording | No real financial gateway integration |
| L6 | Recall 0.20 on validation | Some signs missed; officer review required |
| L7 | Single-region dataset | Generalization to provinces unverified |

These limitations are acceptable for a final-year prototype but must be addressed before operational deployment at scale.

---

## 7.3 Future Work

### 7.3.1 AI Improvements

- Expand to 31-class taxonomy with balanced retraining  
- Fine-tune OCR on Cambodian plate image corpus  
- Add night/IR and rain augmentation pipelines  
- Evaluate YOLO11s/m for higher recall at cost of speed  

### 7.3.2 System Extensions

- Native Android app for officers with offline queue  
- Real-time RTSP stream processing on GPU ai-worker pool  
- Integration with national vehicle registration database API  
- Real payment gateway (ABA Pay, Wing) for fine settlement  
- SMS notifications via Twilio/local provider  

### 7.3.3 Operational Research

- Pilot study with traffic police at selected intersection  
- A/B comparison: AI-assisted vs manual-only enforcement rates  
- Privacy impact assessment for biometric-adjacent plate storage  

---

## 7.4 Recommendations

For institutions or authorities evaluating CamTraffic:

1. **Pilot scope** — Begin with one high-violation intersection and officer-confirmed fines only  
2. **Governance** — Establish data retention and driver privacy policies before live deployment  
3. **Infrastructure** — Provision GPU for multi-camera live inference; CPU sufficient for upload workflow  
4. **Training** — Budget for OCR and additional sign class labeling  
5. **Change management** — Train officers on detection confirmation to avoid over-reliance on automation  

---

## 7.5 Closing Remarks

Road safety in Cambodia will continue to depend on both human judgment and scalable technology. CamTraffic provides a foundation—a working, tested, documented system—that connects AI sign detection to the institutional processes of violation recording, fine management, and driver appeals. With expanded datasets, improved OCR, and operational pilot data, the platform could evolve into a practical tool supporting safer roads and more transparent enforcement.

---

**Word count (approx.):** 620 · **Status:** Final submission version
