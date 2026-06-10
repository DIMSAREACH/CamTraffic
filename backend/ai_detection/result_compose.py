"""Build user-facing detection payloads (sign vs vehicle vs no-sign)."""

VEHICLE_LABELS_KM = {
    'car': 'រថយន្ត',
    'motorcycle': 'ម៉ូតូ',
    'bus': 'ឡានក្រុង',
    'truck': 'ឡានដឹកទំនិញ',
    'tuktuk': 'តូរតូខ',
}


def _is_unknown_sign(sign_result: dict) -> bool:
    if sign_result.get('class_key'):
        return False
    confidence = float(sign_result.get('confidence') or 0)
    sign_en = (sign_result.get('sign_name_en') or '').strip().lower()
    sign_km = sign_result.get('sign_name_km') or sign_result.get('sign_name') or ''
    if confidence >= 10:
        return False
    return sign_en in ('unknown sign', '') or sign_km == 'ស្លាកមិនស្គាល់'


def _apply_plate_fields(payload: dict, plate_result: dict | None) -> None:
    if not plate_result or not plate_result.get('plate_text'):
        return
    payload['detected_plate'] = plate_result['plate_text']
    payload['plate_confidence'] = float(plate_result.get('plate_confidence') or 0)
    payload['plate_type'] = plate_result.get('plate_type') or 'unknown'
    payload['plate_ocr_details'] = plate_result.get('raw_reads') or []
    if plate_result.get('matched_vehicle'):
        payload['matched_vehicle'] = plate_result['matched_vehicle']


def _append_plate_description(payload: dict, plate_result: dict | None) -> None:
    if not plate_result or not plate_result.get('plate_text'):
        return
    plate = plate_result['plate_text']
    conf = float(plate_result.get('plate_confidence') or 0)
    plate_line_km = f' ផ្លាកលេខ {plate} ({conf:.1f}% ភាពជឿជាក់)។'
    plate_line_en = f' License plate {plate} ({conf:.1f}% confidence).'
    payload['description'] = (payload.get('description') or '') + plate_line_km
    payload['description_en'] = (payload.get('description_en') or payload.get('description') or '') + plate_line_en
    if plate_result.get('matched_vehicle'):
        owner = plate_result['matched_vehicle'].get('owner_name', '')
        payload['description'] += f' ភ្ជាប់ជាមួយរថយន្តក្នុងប្រព័ន្ធ៖ {owner}។'
        payload['description_en'] += f' Linked to registered vehicle: {owner}.'


def _compose_plate_mode(payload: dict, plate_result: dict) -> None:
    plate = plate_result['plate_text']
    conf = float(plate_result.get('plate_confidence') or 0)
    payload['detection_mode'] = 'plate'
    payload['display_title'] = plate
    payload['display_title_en'] = plate
    payload['display_title_km'] = plate
    payload['display_confidence'] = conf
    payload['description'] = f'រកឃើញផ្លាកលេខ {plate} ({conf:.1f}% ភាពជឿជាក់)។'
    payload['description_en'] = f'License plate detected: {plate} ({conf:.1f}% confidence).'
    if plate_result.get('matched_vehicle'):
        owner = plate_result['matched_vehicle'].get('owner_name', '')
        payload['description'] += f' ភ្ជាប់ជាមួយរថយន្តក្នុងប្រព័ន្ធ៖ {owner}។'
        payload['description_en'] += f' Linked to registered vehicle: {owner}.'
    else:
        payload['description'] += ' មិនទាន់មានក្នុងប្រព័ន្ធចុះឈ្មោះ។'
        payload['description_en'] += ' Not yet registered in the system database.'
    payload['guidance'] = 'ផ្លាកលេខនេះអាចប្រើស្វែងរករថយន្ត ឬបង្កើតការប្រការបាន។'
    payload['guidance_en'] = 'This plate can be used to search vehicles or create violation records.'
    _apply_plate_fields(payload, plate_result)
    matched = plate_result.get('matched_vehicle')
    if matched and not payload.get('pipeline_vehicle'):
        vtype = matched.get('vehicle_type', 'car')
        payload['pipeline_vehicle'] = {
            'vehicle_type': vtype,
            'vehicle_label_en': vtype.replace('_', ' ').title(),
            'vehicle_label_km': VEHICLE_LABELS_KM.get(vtype, vtype),
            'vehicle_confidence': 0.0,
            'source': 'database',
        }


def compose_detection_payload(
    sign_result: dict,
    vehicles: list[dict],
    plate_result: dict | None = None,
) -> dict:
    """
    Add detection_mode and display_* fields for the dashboard.
    detection_mode: sign | vehicle | plate | unknown_sign | no_sign
    """
    payload = {
        'sign_name': sign_result['sign_name'],
        'confidence': sign_result['confidence'],
        'description': sign_result['description'],
        'guidance': sign_result['guidance'],
        'processing_time': sign_result.get('processing_time', 0),
        'detection_engine': sign_result.get('detection_engine', 'yolo'),
        'vehicles': vehicles,
        'vehicle_count': len(vehicles),
    }
    for key in (
        'sign_name_km', 'sign_name_en', 'sign_code', 'category',
        'description_en', 'guidance_en', 'class_key', 'sign_bbox',
    ):
        if sign_result.get(key):
            payload[key] = sign_result[key]

    if _is_unknown_sign(sign_result) and vehicles:
        top = vehicles[0]
        vtype = top.get('vehicle_type', '')
        label_en = top.get('label', 'Vehicle')
        label_km = VEHICLE_LABELS_KM.get(vtype, label_en)
        conf = float(top.get('confidence') or 0)
        payload['detection_mode'] = 'vehicle'
        payload['display_title'] = label_km
        payload['display_title_en'] = label_en
        payload['display_title_km'] = label_km
        payload['display_confidence'] = conf
        payload['description'] = (
            f'មិនមានស្លាកចរាចរណ៍ក្នុងរូបនេះ។ រកឃើញ{label_km} '
            f'({conf:.1f}% ភាពជឿជាក់)។'
        )
        payload['description_en'] = (
            f'No traffic sign in this image. Detected {label_en} '
            f'({conf:.1f}% confidence).'
        )
        payload['guidance'] = 'ទំព័រនេះរកឃើញស្លាកចរាចរណ៍ — សូមផ្ទុករូបផ្លាកដើម្បីស្គាល់ស្លាក។'
        payload['guidance_en'] = (
            'This page detects traffic signs — upload a sign photo for sign recognition.'
        )
        _apply_plate_fields(payload, plate_result)
        _append_plate_description(payload, plate_result)
        return payload

    if _is_unknown_sign(sign_result):
        if plate_result and plate_result.get('plate_text'):
            _compose_plate_mode(payload, plate_result)
            return payload

        engine = sign_result.get('detection_engine', '')
        payload['detection_mode'] = 'unknown_sign'
        payload['display_title'] = sign_result.get('sign_name_km') or 'ស្លាកមិនស្គាល់'
        payload['display_title_en'] = sign_result.get('sign_name_en') or 'Unknown sign'
        payload['display_title_km'] = sign_result.get('sign_name_km') or 'ស្លាកមិនស្គាល់'
        payload['display_confidence'] = 0.0
        if sign_result.get('description_en'):
            payload['description_en'] = sign_result['description_en']
        if sign_result.get('description'):
            payload['description'] = sign_result['description']
        if sign_result.get('guidance_en'):
            payload['guidance_en'] = sign_result['guidance_en']
        if sign_result.get('guidance'):
            payload['guidance'] = sign_result['guidance']
        if engine == 'none':
            payload['description_en'] = (
                'A traffic sign may be in this image, but it was not matched to the '
                'Cambodia sign catalog. YOLO confidence was too low and Gemini Vision '
                'could not identify it. Check GEMINI_API_KEY or use a clearer Cambodia sign photo.'
            )
            payload['description'] = (
                'រូបនេះប្រហែលមានស្លាកចរាចរណ៍ ប៉ុន្តែមិនត្រូវបានផ្គូផ្គងនឹងបញ្ជីស្លាកកម្ពុជា។ '
                'YOLO មិនគ្រប់គ្រាន់ ហើយ Gemini Vision មិនអាចរកឃើញបាន។ '
                'សូមពិនិត្យ GEMINI_API_KEY ឬប្រើរូបស្លាកកម្ពុជាច្បាស់ជាងនេះ។'
            )
        return payload

    payload['detection_mode'] = 'sign'
    payload['display_title'] = sign_result.get('sign_name_km') or sign_result.get('sign_name', '')
    payload['display_title_en'] = sign_result.get('sign_name_en') or sign_result.get('sign_name', '')
    payload['display_title_km'] = sign_result.get('sign_name_km') or sign_result.get('sign_name', '')
    payload['display_confidence'] = float(sign_result.get('confidence') or 0)
    _apply_plate_fields(payload, plate_result)
    _append_plate_description(payload, plate_result)
    return payload


def notification_message(payload: dict) -> str:
    mode = payload.get('detection_mode', 'sign')
    plate = payload.get('detected_plate') or ''
    if mode == 'vehicle':
        title = payload.get('display_title_en') or 'Vehicle'
        conf = float(payload.get('display_confidence') or 0)
        msg = f'Detected: {title} ({conf:.1f}% confidence)'
        if plate:
            msg += f' — Plate: {plate}'
        return msg
    if mode == 'plate':
        conf = float(payload.get('plate_confidence') or payload.get('display_confidence') or 0)
        return f'Detected plate: {plate} ({conf:.1f}% confidence)'
    if mode == 'unknown_sign':
        return 'Unknown traffic sign — not matched to catalog'
    if mode == 'no_sign':
        if plate:
            conf = float(payload.get('plate_confidence') or 0)
            return f'Plate: {plate} ({conf:.1f}% confidence)'
        return 'No traffic sign found in the uploaded image'
    sign = payload.get('sign_name_en') or payload.get('sign_name', 'Sign')
    conf = float(payload.get('confidence') or 0)
    return f'Detected: {sign} ({conf:.1f}% confidence)'
