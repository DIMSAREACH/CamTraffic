"""Downloadable CSV / XLSX import templates."""
from __future__ import annotations

import csv
import io

TEMPLATES: dict[str, dict] = {
    'users': {
        'headers': ['Name', 'Email', 'Phone', 'Role', 'Password'],
        'sample': [
            ['John Doe', 'john@example.com', '012345678', 'Driver', ''],
            ['Jane Smith', 'jane@example.com', '098765432', 'Police', ''],
        ],
        'columns': [
            {'key': 'Name', 'required': True, 'note': 'Full name'},
            {'key': 'Email', 'required': True, 'note': 'Unique email'},
            {'key': 'Phone', 'required': False, 'note': ''},
            {'key': 'Role', 'required': True, 'note': 'Driver|User|Police|Officer|Admin'},
            {'key': 'Password', 'required': False, 'note': 'Optional; generated if blank'},
        ],
    },
    'vehicles': {
        'headers': ['Plate Number', 'Vehicle Type', 'Owner Email', 'Model', 'Color', 'Year'],
        'sample': [
            ['2AB-1234', 'Car', 'driver@camtraffic.demo', 'Toyota Camry', 'White', '2020'],
            ['1CD-5678', 'Motorcycle', 'driver@camtraffic.demo', 'Honda Wave', 'Red', '2019'],
        ],
        'columns': [
            {'key': 'Plate Number', 'required': True, 'note': 'Unique plate'},
            {'key': 'Vehicle Type', 'required': True, 'note': 'Car|Motorcycle|Truck|Bus|Tuk-Tuk'},
            {'key': 'Owner Email', 'required': True, 'note': 'Existing driver email'},
            {'key': 'Model', 'required': False, 'note': 'Defaults to Unknown'},
            {'key': 'Color', 'required': False, 'note': 'Defaults to Unknown'},
            {'key': 'Year', 'required': False, 'note': 'Defaults to 2020'},
        ],
    },
    'signs': {
        'headers': ['Code', 'Name', 'Category', 'Description'],
        'sample': [
            ['R1', 'Stop Sign', 'Regulatory', 'Drivers must stop'],
            ['W1', 'Curve Ahead', 'Warning', 'Sharp curve ahead'],
        ],
        'columns': [
            {'key': 'Code', 'required': True, 'note': 'Unique sign code'},
            {'key': 'Name', 'required': True, 'note': ''},
            {'key': 'Category', 'required': True, 'note': 'Warning|Prohibitory|Regulatory|Mandatory|Informative'},
            {'key': 'Description', 'required': False, 'note': ''},
        ],
    },
    'cameras': {
        'headers': ['Camera ID', 'Location', 'Road Name', 'RTSP URL', 'Status'],
        'sample': [
            ['CAM001', 'Monivong Blvd Cam 1', 'Monivong Blvd', 'rtsp://192.168.1.10/stream', 'Active'],
            ['CAM002', 'Russian Blvd Cam 1', 'Russian Blvd', 'rtsp://192.168.1.11/stream', 'Active'],
        ],
        'columns': [
            {'key': 'Camera ID', 'required': True, 'note': 'Unique camera code'},
            {'key': 'Location', 'required': True, 'note': 'Display name'},
            {'key': 'Road Name', 'required': True, 'note': 'Find or create road'},
            {'key': 'RTSP URL', 'required': False, 'note': 'Stream / snapshot URL'},
            {'key': 'Status', 'required': False, 'note': 'Active|Inactive|Offline|Maintenance'},
        ],
    },
    'violations': {
        'headers': ['Plate Number', 'Violation', 'Date', 'Fine'],
        'sample': [
            ['2AB-1234', 'NO_PARKING', '2026-07-20', '10000'],
            ['1CD-5678', 'No Helmet', '2026-07-21', '5000'],
        ],
        'columns': [
            {'key': 'Plate Number', 'required': True, 'note': 'Must match registered vehicle'},
            {'key': 'Violation', 'required': True, 'note': 'Type code or free text'},
            {'key': 'Date', 'required': True, 'note': 'YYYY-MM-DD or ISO datetime'},
            {'key': 'Fine', 'required': False, 'note': 'Optional fine amount (KHR)'},
        ],
    },
}


def build_csv_template(import_type: str) -> bytes:
    spec = TEMPLATES[import_type]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(spec['headers'])
    for row in spec['sample']:
        writer.writerow(row)
    return buf.getvalue().encode('utf-8-sig')


def build_xlsx_template(import_type: str) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    spec = TEMPLATES[import_type]
    wb = Workbook()
    ws = wb.active
    ws.title = import_type.title()
    ws.append(spec['headers'])
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for row in spec['sample']:
        ws.append(row)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def types_catalog() -> list[dict]:
    return [
        {
            'type': key,
            'label': key.replace('_', ' ').title() if key != 'signs' else 'Traffic Signs',
            'columns': value['columns'],
            'unique_key': {
                'users': 'Email',
                'vehicles': 'Plate Number',
                'signs': 'Code',
                'cameras': 'Camera ID',
                'violations': 'Plate Number + Date + Violation',
            }[key],
        }
        for key, value in TEMPLATES.items()
    ]
