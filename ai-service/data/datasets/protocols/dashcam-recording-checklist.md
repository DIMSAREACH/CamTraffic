# Dashcam Video Recording Checklist (Task 135)

## Objective

Record continuous road footage for frame extraction, sign/vehicle detection training, and
realistic traffic-law enforcement scenarios.

## Required device settings

- Resolution: **1920×1080** (1080p)
- Frame rate: **30 FPS**
- Container/codec: **MP4** (H.264 preferred for compatibility)
- Audio: optional (disable if not needed for thesis dataset)
- Loop recording: off for mission sessions (use segmented files with clear session IDs)
- Timestamp overlay: on (helps metadata alignment)

## Session coverage (required)

Record dedicated sessions for:

- Morning
- Noon
- Evening
- Night
- Rain (when safely available)

## Storage layout

- Raw files: `raw/dashcam/`
- General road clips (non-dashcam): `raw/videos/` if captured separately
- Log every session in `manifests/dashcam_session_log.csv` (copy from template)

## Session workflow

1. Pre-check mount, lens cleanliness, storage space, and power.
2. Confirm settings (1080p / 30 FPS / MP4).
3. Drive planned route from `protocols/location-collection-plan.md`.
4. Note route, weather, and time window in session log.
5. End-of-day: verify playback, backup to laptop + external drive.
6. Update cumulative hours in `manifests/dashcam_hours_tracker.template.csv`.

## Quality rules

- Reject corrupted or zero-byte files.
- Flag heavy windshield glare sessions for limited use only.
- Prefer stable mount angles; avoid excessive vibration blur when possible.

## Target

- **Minimum total recorded duration: 50 hours**
- Track progress until `cumulative_hours >= 50` in the hours tracker.

## Completion criteria

Task 135 is complete when device settings are documented, all required session types are
logged, and cumulative dashcam duration reaches at least 50 hours with verified backups.
