# Chapter 2 — Literature Review [DRAFT]

**Task 383** · CamTraffic Final Year Project · 2026

---

## 2.1 Intelligent Traffic Enforcement Systems

Intelligent Transportation Systems (ITS) combine sensors, communication networks, and software to improve safety and efficiency [1]. Automated enforcement subsystems include red-light cameras, speed cameras, and ANPR (Automatic Number Plate Recognition) installations [2]. These systems reduce human workload but require integration with legal workflows and data retention policies [3].

In developing economies, ITS adoption is constrained by cost, connectivity, and institutional capacity [4]. CamTraffic targets a lightweight, web-deployable architecture rather than proprietary roadside hardware.

---

## 2.2 Traffic Sign Recognition

Early traffic sign recognition relied on hand-crafted features and SVM classifiers [5]. Deep learning replaced this pipeline with end-to-end convolutional models. The German Traffic Sign Recognition Benchmark (GTSRB) established baseline accuracy metrics for 43 sign classes [6].

Regional datasets matter because sign shapes, colors, and scripts differ. Southeast Asian signs often combine pictograms with local language text. Cambodia follows a mix of international conventions and national variants documented in Ministry of Public Works and Transport guidelines [7].

---

## 2.3 YOLO Object Detection Family

Redmon et al. introduced YOLO as a single-stage detector achieving real-time performance [8]. Subsequent versions (YOLOv3–YOLOv11) improved anchor-free designs, multi-scale features, and training efficiency [9][10]. Ultralytics provides a unified training and export toolchain used in this project [11].

Single-stage detectors trade some precision for speed compared to two-stage R-CNN variants [12]. For officer-facing upload and webcam workflows, sub-second inference on CPU is a practical requirement met by YOLO11n at 640px input.

---

## 2.4 License Plate OCR

ANPR pipelines typically segment the plate region, normalize perspective, and run character recognition [13]. Open-source engines include EasyOCR and PaddleOCR [14][15]. Cambodian plates use Latin alphanumeric formats but vary in font and layout, making exact-match OCR challenging without domain-specific training [16].

CamTraffic uses EasyOCR as a baseline with post-processing normalization; evaluation shows room for improvement on exact plate match rates.

---

## 2.5 Expert Systems in Law Enforcement

Expert systems encode domain rules (if sign X and action Y then violation Z) separate from ML inference [17]. This separation allows law updates without retraining detectors. CamTraffic maps YOLO class keys to `ViolationRule` records with default fines—a hybrid AI + rules architecture [18].

---

## 2.6 Gap Analysis

| Gap | CamTraffic response |
|-----|---------------------|
| Cambodia-specific sign classes | Custom 10-class YOLO dataset |
| Khmer UI for officers/drivers | React i18n (en/km) |
| End-to-end enforcement workflow | Violations → fines → appeals API |
| Affordable deployment | Docker Compose on VPS |
| Evidence audit trail | AIDetectionLog + audit app |

---

*Draft version — see `CHAPTER-2-LITERATURE-REVIEW-FINAL.md` for submission copy.*
