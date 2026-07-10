# Chapter 6 - Testing and Evaluation

## 6.1 Testing Strategy

Testing combined automated and user-centered validation across four dimensions:
- functional correctness
- integration behavior
- non-functional quality (performance/security)
- AI model accuracy and runtime behavior

Evidence sources:
- integration and backend test suites under `tests/`
- UAT report in `docs/test-reports/UAT-REPORT.md`
- AI evaluation artifacts in `ai-service/runs/evaluation/final/`

## 6.2 Integration Testing (Stage 7)

Stage 7 validated the complete workflow from frame submission to enforcement outputs.

Result:
- 27/27 integration tests passed
- execution time: 31.85 s

Validated behaviors include:
- camera frame submission and extraction
- detection persistence
- OCR result persistence
- violation auto-creation logic
- officer and driver notifications
- report generation integration

## 6.3 Software Testing (Stage 8)

Aggregate result:
- 112/112 tests passed
- execution time: 2.67 s

### 6.3.1 Functional Coverage

Scenarios validated:
- login and role routing
- RBAC endpoint restrictions
- CRUD workflows across backend apps
- AI and OCR endpoint handling
- reporting endpoints

### 6.3.2 Performance Coverage

Validated targets:
- key API endpoints around <= 200 ms target
- AI pipeline latency instrumentation
- concurrent load behavior (10 users)

### 6.3.3 Security Coverage

Validated controls:
- JWT expiry and refresh behavior
- SQL injection resistance (ORM-mediated queries)
- XSS response behavior and headers
- file upload MIME restrictions

## 6.4 User Acceptance Testing (UAT)

From `docs/test-reports/UAT-REPORT.md`:
- participants: 3 (lecturer, officer, driver)
- overall rating: 4.4/5
- all major role workflows were accepted

Key qualitative outcomes:
- officer violation review flow considered clear and practical
- driver violation/appeal flow considered usable
- supervisor assessment confirmed end-to-end completeness for thesis scope

## 6.5 AI Evaluation (Stage 9)

## 6.5.1 Detection Model Metrics

From `post_train_eval_v2.json`:
- mAP@50: 0.6081
- mAP@50-95: 0.4419
- Precision: 0.6489
- Recall: 0.6151
- F1: 0.6315

## 6.5.2 OCR Metrics

From `ocr_report_val_improved.json`:
- CER improved from 0.6632 to 0.3524
- Exact match improved from 0.1386 to 0.3168

## 6.5.3 Runtime Performance

From `fps_benchmark_cpu.json`:
- mean latency: 69.28 ms/image
- p95 latency: 95.21 ms
- throughput: 14.43 FPS

Interpretation:
- CPU target thresholds for prototype operation were met.
- GPU benchmark remains environment-dependent and requires CUDA-enabled torch runtime.

## 6.5.4 Baseline Comparison

From `model_comparison_report.json`:
- YOLOv11 v1 mAP@50: 0.4240
- YOLOv11 v2 mAP@50: 0.6081
- delta: +0.1841

## 6.6 Discussion of Results

Strengths:
- complete software pipeline validated end-to-end
- measurable improvements in both detection and OCR quality
- operational readiness artifacts (deployment, health checks, backups)

Limitations:
- detection accuracy below final production target (mAP@50 >= 0.80)
- OCR still sensitive to challenging visual conditions
- some advanced resilience features (for example, SSE reconnect hardening) remain future work

## 6.7 Threats to Validity

- Dataset composition may not fully represent all real-road edge cases.
- Local hardware constraints (CPU-focused training) influenced final model metrics.
- UAT sample size was small (3 participants), though role coverage was complete.

## 6.8 Conclusion

The combined testing and evaluation results demonstrate that CamTraffic is functionally complete, test-validated, and suitable for controlled deployment and academic defense. The primary improvement path is GPU-enabled long-epoch training with expanded field-collected data.
