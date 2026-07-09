# Traffic Sign Collection Checklist (Task 133)

## Objective

Collect high-quality Cambodian traffic sign images with balanced viewpoint, time-of-day,
and weather diversity for robust detection training.

## Required capture coverage

### Viewpoint and distance

- Front view
- Left angle
- Right angle
- Close distance
- Long distance

### Time-of-day

- Morning
- Afternoon
- Evening
- Night

### Weather

- Sunny
- Cloudy
- Rain

## Target per class

- Minimum target: **200 images per class**
- Recommended: 240+ images per class to allow quality filtering

## Quality acceptance rules

- Sign is visible and not fully occluded
- Sign content is readable at annotation zoom level
- Motion blur is acceptable only for limited hard-case examples
- Avoid heavy overexposure/underexposure for majority samples

## Collection workflow

1. Capture raw images to `raw/traffic-signs/`.
2. Track progress in `manifests/traffic_sign_target_tracker.template.csv`.
3. Log session metadata in `manifests/collection_log.template.csv`.
4. Move accepted samples to `processed/` after QA.

## Completion criteria

Task 133 is complete when all target classes reach at least 200 accepted images with
documented coverage across required views, times, and weather conditions.
