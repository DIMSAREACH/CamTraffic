# Class Taxonomy Baseline (Tasks 129-130)

Initial class baseline for collection and annotation planning.
Expanded in Task 129.2 with category mapping and explicit class IDs.

## Category mapping (Task 129.2)

### Warning signs

- `pedestrian_crossing`
- `school_zone`
- `traffic_light_signal`

### Regulatory signs

- `speed_limit_20`
- `speed_limit_30`
- `speed_limit_40`
- `speed_limit_50`
- `speed_limit_60`
- `no_entry`
- `stop`
- `yield`
- `no_u_turn`
- `one_way`
- `parking_prohibited`

### Guide / operational

- `unknown_sign`

## Baseline class IDs

| ID | Class |
|---:|---|
| 0 | `speed_limit_20` |
| 1 | `speed_limit_30` |
| 2 | `speed_limit_40` |
| 3 | `speed_limit_50` |
| 4 | `speed_limit_60` |
| 5 | `no_entry` |
| 6 | `stop` |
| 7 | `yield` |
| 8 | `no_u_turn` |
| 9 | `one_way` |
| 10 | `parking_prohibited` |
| 11 | `pedestrian_crossing` |
| 12 | `school_zone` |
| 13 | `traffic_light_signal` |
| 14 | `license_plate_kh_private` |
| 15 | `license_plate_kh_commercial` |
| 16 | `license_plate_kh_government` |
| 17 | `unknown_sign` |

## OCR target classes

- `license_plate_kh_private`
- `license_plate_kh_commercial`
- `license_plate_kh_government`

## Quality tags

- `clear`
- `blurred`
- `occluded`
- `overexposed`
- `underexposed`
