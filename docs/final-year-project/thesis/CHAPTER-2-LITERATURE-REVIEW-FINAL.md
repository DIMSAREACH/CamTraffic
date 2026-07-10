# Chapter 2 - Literature Review (Final)

Task: 392
Date: 2026-07-10

## 2.1 Object Detection Evolution

The YOLO family evolved from single-stage real-time detection foundations to modern high-accuracy variants suitable for production inference. Compared with two-stage approaches, YOLO-style detectors provide lower latency and simpler deployment paths.

## 2.2 Traffic Sign Detection Research

Prior work demonstrates strong performance in constrained datasets but challenges remain in domain transfer: weather variance, sign occlusion, and class imbalance. Cambodian road context adds regional signage variation and data scarcity constraints.

## 2.3 License Plate and OCR Studies

ANPR pipelines typically combine detection and OCR with post-processing normalization. Performance is heavily tied to crop quality, lighting, and script characteristics. This project uses EasyOCR baseline + normalization strategy and records measurable improvement over initial baseline.

## 2.4 Regional Enforcement Systems

Studies in Southeast Asian contexts emphasize practical deployment constraints: compute budget, connectivity variability, and operator workflow complexity. CamTraffic architecture follows this operationally grounded model by separating AI service and business backend.

## 2.5 Cambodia Legal and Operational Context

Traffic-law enforcement in Cambodia requires chain-of-evidence confidence and role-based authorization across administrators, officers, and drivers. The system therefore prioritizes auditability, explicit workflow transitions, and report exports.

## 2.6 Gap Analysis

Key identified gaps addressed by this project:
- Lack of integrated AI + case workflow in a single platform
- Limited local deployment runbooks for government-like environments
- Weak traceability between AI output and enforcement process

## 2.7 Conclusion

Literature supports a real-time single-stage detection approach with pragmatic OCR integration and workflow-centric architecture. CamTraffic aligns with this evidence while adapting to Cambodia-specific operational constraints.
