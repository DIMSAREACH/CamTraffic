# Cambodian Traffic Sign Research (Task 129.2)

## Objective

Document the legal/technical references and prepare a practical class list for dataset
collection and annotation in Cambodia.

## Source references

1. Law on Road Traffic (2015, English copy)  
   https://www.huskyandpartners.com/images/Law%20Library/Transportation/20190502-Law%20on%20Road%20Traffic_2015_En.pdf.pdf
2. Ministry of Public Works and Transport (official portal)  
   https://www.mpwt.gov.kh/en/home
3. Cambodia Road Traffic Signs 2007 reference catalog (archived visual reference)  
   https://commons.wikimedia.org/wiki/File:Cambodia_Road_Traffic_Signs_2007.pdf

## Research notes

- Article 5 of the 2015 law defines traffic signs/markings/lights as the governing
  visual control system on roads and states that detailed sign images/messages are
  defined by MPWT regulations (Prakas).
- Practical dataset classes should therefore align with observed Cambodian signs and
  existing annotation targets while remaining extensible for future MPWT updates.
- For this project phase, we use a thesis-ready baseline set with explicit class IDs.

## Sign categorization for collection

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

### Guide / other operational signs

- `unknown_sign` (catch-all for field samples pending taxonomy expansion)

## Baseline class ID list (Task 129.2 output)

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

## Output artifacts for this task

- Official references listed and documented
- Warning/regulatory/guide categories prepared
- Class IDs assigned and synced with annotation labels
- Label list ready for collection and annotation workflow
