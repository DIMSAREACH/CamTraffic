# Final Demo Video Package (Task 238)

Date: 2026-07-10
Target duration: 7-9 minutes

## 1) Video Deliverable Scope

Demo flow required:
- camera/frame input
- AI detection + OCR
- violation auto-generation
- officer review
- driver notification and payment view

Primary script source:
- `docs/final-year-project/DEMO-SCRIPT.md`

## 2) Recording Plan (Timestamped)

- 00:00-00:30: Title + objective (CamTraffic final demo)
- 00:30-01:20: Admin login and dashboard summary
- 01:20-02:10: Camera management + health check
- 02:10-03:20: Submit frame to `/integration/cameras/{id}/process-frame/`
- 03:20-04:20: Detection monitor + evidence details
- 04:20-05:30: Officer review queue (approve/reject)
- 05:30-06:30: Driver portal (violation + fine/payment)
- 06:30-07:20: Notifications + reports export
- 07:20-08:00: Closing summary and future work

## 3) Narration Script (Short Form)

"This video demonstrates the full CamTraffic enforcement pipeline from camera input to driver-facing outcomes. We begin with admin operations, then submit a real frame for AI processing. The backend orchestrates YOLOv11 and OCR through asynchronous tasks, stores detection evidence, and creates violations when plate matches occur. Officers then review violations, and drivers can view and settle fines through their portal. Finally, reporting and notification modules complete the operational cycle."

## 4) Recording Checklist

- [x] Slide deck ready: `docs/final-year-project/CAMTRAFFIC-FINAL-PRESENTATION.pptx`
- [x] Demo script ready: `docs/final-year-project/DEMO-SCRIPT.md`
- [x] Screen capture sequence defined (8 min target)
- [x] Backup flow prepared if AI service runs in mock mode
- [x] Output filename reserved: `docs/final-year-project/CAMTRAFFIC-DEMO-VIDEO.mp4`

## 5) Capture Settings Recommendation

- Resolution: 1920x1080
- FPS: 30
- Audio: system + microphone (if available)
- Encoding: H.264 (mp4)

## 6) Output Artifact

Expected final video file path:
- `docs/final-year-project/CAMTRAFFIC-DEMO-VIDEO.mp4`

Note:
- In this repository task, the full recording runbook and narration package are completed and ready for one-pass capture on the presenter machine.