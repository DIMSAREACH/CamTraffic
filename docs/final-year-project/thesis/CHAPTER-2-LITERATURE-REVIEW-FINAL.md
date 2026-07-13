# Chapter 2 — Literature Review

**CamTraffic Final Year Project**

---

## 2.1 Introduction

This chapter surveys prior work in intelligent traffic enforcement, traffic sign recognition, object detection architectures, license plate OCR, and rule-based expert systems. The review identifies gaps that motivate CamTraffic's Cambodia-specific design.

---

## 2.2 Intelligent Transportation and Enforcement Systems

Intelligent Transportation Systems (ITS) integrate sensing, communication, and analytics to improve road safety and efficiency [1]. Subsystems include adaptive signal control, incident detection, and automated enforcement [2]. Red-light and speed camera networks in Europe and North America demonstrate that automated evidence capture reduces certain violation types when paired with clear legal frameworks [3].

Automatic Number Plate Recognition (ANPR) is a core ITS component: cameras capture plate images, OCR extracts identifiers, and backend systems match vehicles to registries [4]. ANPR supports tolling, stolen-vehicle detection, and congestion charging [5].

In developing economies, ITS deployment faces constraints including capital cost, intermittent connectivity, and institutional change management [6]. CamTraffic adopts a software-first strategy deployable on affordable VPS infrastructure rather than proprietary embedded roadside units.

---

## 2.3 Traffic Sign Detection and Recognition

### 2.3.1 Classical Approaches

Early systems extracted color histograms, HOG features, or Haar cascades and classified signs with SVM or k-NN [7]. These methods degraded under lighting variation, occlusion, and viewing angle changes.

### 2.3.2 Deep Learning Benchmarks

Convolutional neural networks achieved human-level performance on the German Traffic Sign Recognition Benchmark (GTSRB), which defines 43 classes [8]. The CURE-TSD dataset and LISA Traffic Sign Dataset provide additional benchmarks for detection (bounding boxes) rather than classification alone [9].

Regional variation is critical: Cambodian signs follow Ministry of Public Works and Transport conventions but include local pictograms and Khmer supplementary text [10]. Transfer learning from GTSRB alone is insufficient; a local annotated dataset is required.

### 2.3.3 Object Detection vs Classification

Traffic enforcement requires **detection** (locating signs in full scenes) not merely **classification** (identifying cropped sign images). Object detectors output bounding boxes and class labels simultaneously [11].

---

## 2.4 YOLO Object Detection Family

Redmon et al. introduced YOLO as a unified single-stage detector predicting boxes and classes in one forward pass [12]. Advantages include high frames-per-second suitable for video streams. YOLOv3 added multi-scale predictions [13]; YOLOv5–v8 improved training ergonomics and anchor-free heads [14]; YOLOv11 (Ultralytics, 2024) continues the lineage with efficient nano variants for edge deployment [15].

Compared to two-stage detectors (Faster R-CNN), YOLO trades marginal precision for speed—a acceptable tradeoff for officer upload workflows where sub-second feedback improves usability [16].

CamTraffic trains YOLO11n on a 10-class Cambodian subset with 640px input, achieving mAP@50 = 0.908 (see Chapter 6).

---

## 2.5 License Plate Recognition

ANPR pipelines typically execute: (1) vehicle detection, (2) plate region localization, (3) perspective correction, (4) character segmentation or sequence recognition [17]. Deep models such as CRNN and attention-based decoders improve sequence accuracy [18].

Open-source OCR engines include Tesseract, EasyOCR, and PaddleOCR [19][20]. EasyOCR supports multiple scripts and requires minimal setup—selected for CamTraffic's baseline. Evaluation shows character error rate above 2.0 on local samples with 0% exact match without domain fine-tuning (Chapter 6)—consistent with findings that plate OCR requires country-specific training data [21].

---

## 2.6 Expert Systems and Rule-Based Enforcement

Expert systems encode domain knowledge as IF-THEN rules interpretable by non-ML stakeholders [22]. In enforcement, rules map detected conditions to violation types: e.g., IF sign = NO_ENTRY AND vehicle trajectory = entering THEN violation = illegal entry.

Hybrid architectures separating **perception** (ML) from **decision** (rules) allow legal updates without retraining neural networks [23]. CamTraffic implements this via `ViolationRule` records keyed by YOLO class identifiers.

---

## 2.7 Web Application Architectures for Enforcement

Modern enforcement platforms use REST APIs, JWT authentication, and role-based access control (RBAC) [24]. Django REST Framework and React are established choices for rapid full-stack development with strong security middleware [25].

Container orchestration (Docker Compose, Kubernetes) simplifies reproducible deployment—a requirement for thesis demonstration and institutional handover [26].

---

## 2.8 Gap Analysis and Research Position

| Research gap | CamTraffic contribution |
|--------------|-------------------------|
| Limited Cambodia-specific sign datasets | Custom 10-class YOLO dataset and weights |
| Disconnected AI demos and enforcement IT | Unified Django monolith with embedded inference |
| English-only enforcement UIs | Khmer/English React i18n |
| Opaque fine processes for drivers | Driver portal with appeals and notifications |
| Heavy proprietary ITS cost | Open stack: Django, React, PostgreSQL, Docker |

---

## 2.9 Summary

Prior literature establishes that (1) automated sign detection is feasible with modern YOLO variants, (2) plate OCR remains challenging without local training data, (3) hybrid ML + rules architectures suit legal enforcement domains, and (4) web-based multi-role systems can deliver operational workflows. Chapter 3 describes how CamTraffic's methodology applies these insights.

---

**Word count (approx.):** 780 · **Status:** Final submission version
