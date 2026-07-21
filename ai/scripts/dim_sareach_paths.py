"""Resolve Dim Sareach thesis dataset paths (override with CAMTRAFFIC_DIM_SAREACH_DATASET)."""
from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
EXPERT_SYSTEM_ROOT = REPO_ROOT.parent.parent


def dataset_root() -> Path:
    override = os.environ.get('CAMTRAFFIC_DIM_SAREACH_DATASET', '').strip()
    if override:
        return Path(override)
    return EXPERT_SYSTEM_ROOT / 'Reference(PDF Download)' / 'Dim Sareach' / 'Dataset'


def road_signs_root() -> Path:
    return dataset_root() / 'Road signs in Cambodia'


def roboflow_vehicles_root() -> Path:
    return dataset_root() / 'Cambodia Traffic.v1i.yolov11'


def roboflow_plates_root() -> Path:
    return dataset_root() / 'Plate Number.v3i.yolov11'


def cam_tsr_data_root() -> Path:
    return dataset_root() / 'Data'


def road_footage_source_root() -> Path:
    return dataset_root() / 'VDO'


def vehicle_detect_root() -> Path:
    """Optional flat JPG batch (legacy layout under Dim Sareach/Vichicle Detect)."""
    under_dataset = dataset_root() / 'Vichicle Detect'
    if under_dataset.is_dir():
        return under_dataset
    legacy = EXPERT_SYSTEM_ROOT / 'Reference(PDF Download)' / 'Dim Sareach' / 'Vichicle Detect'
    return legacy
