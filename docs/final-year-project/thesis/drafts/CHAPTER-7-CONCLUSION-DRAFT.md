# Chapter 7 — Conclusion & Future Work [DRAFT]

**Task 388** · CamTraffic Final Year Project · 2026

---

## 7.1 Summary

This thesis presented CamTraffic, an AI-based traffic sign detection and traffic law enforcement system for Cambodia. The project achieved its primary objectives:

1. **Sign detection** — YOLO11n model with mAP@50 = 0.908 on 10 Cambodian sign classes  
2. **Enforcement workflow** — Integrated violations, fines, appeals, and notifications  
3. **Multi-role portals** — Admin and user web applications with Khmer/English support  
4. **Production readiness** — Docker Compose stack with PostgreSQL, Redis, Celery, and Nginx  
5. **Validation** — Automated tests, UAT, and performance benchmarks passed  

The system demonstrates that a modular monolith combining embedded AI inference with rule-based expert mapping is a viable architecture for resource-constrained deployments.

---

## 7.2 Limitations

| Limitation | Impact |
|------------|--------|
| 10-class model vs full sign catalog | Cannot detect all sign types in field |
| OCR exact-match rate | Automatic plate-to-driver linking unreliable |
| Dataset size and diversity | Night/rain/angle edge cases underrepresented |
| No mobile app | Field officers depend on browser |
| Demo payment flow | No real payment gateway integration |
| CPU-first inference | GPU recommended for multi-camera live streams |

---

## 7.3 Future Work

1. Expand to full 31-class sign taxonomy with retrained weights  
2. Fine-tune OCR on Cambodian plate dataset  
3. Edge deployment on roadside NVIDIA Jetson devices  
4. Native mobile app for officers  
5. Real-time RTSP stream processing at scale  
6. Integration with national vehicle registration API  
7. Khmer TTS improvements for accessibility  

---

## 7.4 Recommendations

Traffic authorities considering a pilot should:

- Start with fixed cameras at high-violation intersections  
- Require officer confirmation before fine auto-issuance  
- Establish data retention policies aligned with privacy law  
- Plan GPU infrastructure if processing more than 5 concurrent streams  

---

*Draft version — see `CHAPTER-7-CONCLUSION-FUTURE-WORK-FINAL.md` for submission copy.*
