"""Generate a clear pgAdmin-style ERD for CamTraffic (thesis / documentation)."""
from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

OUT = Path(__file__).resolve().parents[2] / "docs" / "camtraffic-erd-pgadmin-style.png"

# db_table name -> (x, y, columns)  columns: (name, type, is_pk, fk_target_table)
TABLES: dict[str, tuple[float, float, list[tuple[str, str, bool, str | None]]]] = {
  # ── Zone A: Identity & RBAC (left) ──────────────────────────────────────
    "users": (1.5, 14.5, [
        ("id", "uuid", True, None),
        ("email", "varchar(254)", False, None),
        ("full_name", "varchar(255)", False, None),
        ("role", "varchar(20)", False, None),
        ("phone", "varchar(20)", False, None),
        ("is_active", "boolean", False, None),
        ("created_at", "timestamptz", False, None),
    ]),
    "officers": (7.0, 19.5, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("badge_no", "varchar(50)", False, None),
        ("rank", "varchar(100)", False, None),
        ("department", "varchar(150)", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "drivers": (7.0, 14.5, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("license_no", "varchar(50)", False, None),
        ("national_id", "varchar(50)", False, None),
        ("kyc_status", "varchar(20)", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "user_preferences": (7.0, 9.5, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("notify_fines", "boolean", False, None),
        ("notify_detections", "boolean", False, None),
        ("two_factor_enabled", "boolean", False, None),
    ]),
    "login_events": (7.0, 5.0, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("ip_address", "inet", False, None),
        ("status", "varchar(20)", False, None),
        ("created_at", "timestamptz", False, None),
    ]),
    "rbac_roles": (1.5, 9.5, [
        ("id", "uuid", True, None),
        ("role_name", "varchar(100)", False, None),
        ("description", "text", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "rbac_permissions": (1.5, 5.0, [
        ("id", "uuid", True, None),
        ("perm_name", "varchar(100)", False, None),
        ("action_type", "varchar(50)", False, None),
        ("resource", "varchar(100)", False, None),
    ]),
    "rbac_role_permissions": (1.5, 0.5, [
        ("id", "bigint", True, None),
        ("role_id", "uuid", False, "rbac_roles"),
        ("permission_id", "uuid", False, "rbac_permissions"),
    ]),
    "rbac_user_roles": (7.0, 0.5, [
        ("id", "bigint", True, None),
        ("user_id", "uuid", False, "users"),
        ("role_id", "uuid", False, "rbac_roles"),
    ]),

  # ── Zone B: Registry & AI (center-left) ───────────────────────────────────
    "vehicles": (14.5, 17.5, [
        ("id", "uuid", True, None),
        ("driver_id", "uuid", False, "drivers"),
        ("owner_id", "uuid", False, "users"),
        ("plate_number", "varchar(20)", False, None),
        ("vehicle_type", "varchar(20)", False, None),
        ("model", "varchar(100)", False, None),
        ("color", "varchar(50)", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "ai_detection_logs": (14.5, 11.5, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("detected_sign", "varchar(150)", False, None),
        ("confidence", "float", False, None),
        ("detected_plate", "varchar(30)", False, None),
        ("matched_vehicle_id", "uuid", False, "vehicles"),
        ("created_at", "timestamptz", False, None),
    ]),
    "vehicle_tracking_logs": (14.5, 5.5, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("detection_log_id", "uuid", False, "ai_detection_logs"),
        ("track_session_id", "varchar(64)", False, None),
        ("track_id", "integer", False, None),
        ("vehicle_type", "varchar(20)", False, None),
    ]),

  # ── Zone C: Enforcement (center) ──────────────────────────────────────────
    "traffic_violations": (22.0, 14.0, [
        ("id", "uuid", True, None),
        ("driver_id", "uuid", False, "drivers"),
        ("vehicle_id", "uuid", False, "vehicles"),
        ("officer_id", "uuid", False, "officers"),
        ("camera_id", "uuid", False, "cameras"),
        ("road_id", "uuid", False, "roads"),
        ("ai_detection_log_id", "uuid", False, "ai_detection_logs"),
        ("violation_type", "varchar(50)", False, None),
        ("plate_detected", "varchar(20)", False, None),
        ("violation_date", "timestamptz", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "fines": (22.0, 7.5, [
        ("id", "uuid", True, None),
        ("violation_id", "uuid", False, "traffic_violations"),
        ("driver_id", "uuid", False, "users"),
        ("police_id", "uuid", False, "users"),
        ("amount", "numeric(12,2)", False, None),
        ("reason", "text", False, None),
        ("status", "varchar(20)", False, None),
        ("paid_at", "timestamptz", False, None),
    ]),
    "violation_appeals": (22.0, 1.0, [
        ("id", "uuid", True, None),
        ("violation_id", "uuid", False, "traffic_violations"),
        ("fine_id", "uuid", False, "fines"),
        ("driver_id", "uuid", False, "drivers"),
        ("reason", "text", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "unknown_vehicles": (29.5, 11.0, [
        ("id", "uuid", True, None),
        ("plate_detected", "varchar(20)", False, None),
        ("camera_id", "uuid", False, "cameras"),
        ("is_resolved", "boolean", False, None),
        ("linked_vehicle_id", "uuid", False, "vehicles"),
        ("linked_violation_id", "uuid", False, "traffic_violations"),
    ]),

  # ── Zone D: Infrastructure (right) ──────────────────────────────────────────
    "roads": (36.5, 19.5, [
        ("id", "uuid", True, None),
        ("name", "varchar(200)", False, None),
        ("road_type", "varchar(30)", False, None),
        ("speed_limit", "integer", False, None),
        ("city", "varchar(100)", False, None),
        ("status", "varchar(30)", False, None),
    ]),
    "cameras": (36.5, 13.5, [
        ("id", "uuid", True, None),
        ("road_id", "uuid", False, "roads"),
        ("name", "varchar(150)", False, None),
        ("code", "varchar(50)", False, None),
        ("camera_type", "varchar(20)", False, None),
        ("status", "varchar(20)", False, None),
    ]),
    "traffic_signals": (36.5, 7.5, [
        ("id", "uuid", True, None),
        ("road_id", "uuid", False, "roads"),
        ("signal_code", "varchar(50)", False, None),
        ("cycle_duration", "integer", False, None),
        ("status", "varchar(20)", False, None),
    ]),

  # ── Zone E: Knowledge & AI models (far right) ─────────────────────────────
    "traffic_signs": (43.5, 19.5, [
        ("id", "bigint", True, None),
        ("sign_name", "varchar(150)", False, None),
        ("sign_code", "varchar(20)", False, None),
        ("category", "varchar(20)", False, None),
        ("penalty", "varchar(255)", False, None),
        ("rules", "jsonb", False, None),
    ]),
    "violation_rules": (43.5, 13.0, [
        ("id", "uuid", True, None),
        ("sign_class_key", "varchar(80)", False, None),
        ("prohibited_action", "varchar(50)", False, None),
        ("violation_type", "varchar(50)", False, None),
        ("default_fine_amount", "numeric", False, None),
    ]),
    "ai_model_versions": (43.5, 7.0, [
        ("id", "uuid", True, None),
        ("version", "varchar(50)", False, None),
        ("model_file", "varchar(255)", False, None),
        ("is_active", "boolean", False, None),
        ("uploaded_by_id", "uuid", False, "users"),
    ]),

  # ── Zone F: Operations (bottom center) ────────────────────────────────────
    "notifications": (14.5, 0.5, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("type", "varchar(30)", False, None),
        ("title", "varchar(200)", False, None),
        ("message", "text", False, None),
        ("is_read", "boolean", False, None),
    ]),
    "audit_logs": (29.5, 1.0, [
        ("id", "uuid", True, None),
        ("user_id", "uuid", False, "users"),
        ("action", "varchar(50)", False, None),
        ("resource", "varchar(100)", False, None),
        ("timestamp", "timestamptz", False, None),
    ]),
}

RELATIONS: list[tuple[str, str]] = [
    ("officers", "users"),
    ("drivers", "users"),
    ("user_preferences", "users"),
    ("login_events", "users"),
    ("rbac_user_roles", "users"),
    ("rbac_user_roles", "rbac_roles"),
    ("rbac_role_permissions", "rbac_roles"),
    ("rbac_role_permissions", "rbac_permissions"),
    ("vehicles", "drivers"),
    ("vehicles", "users"),
    ("ai_detection_logs", "users"),
    ("ai_detection_logs", "vehicles"),
    ("vehicle_tracking_logs", "users"),
    ("vehicle_tracking_logs", "ai_detection_logs"),
    ("traffic_violations", "drivers"),
    ("traffic_violations", "vehicles"),
    ("traffic_violations", "officers"),
    ("traffic_violations", "cameras"),
    ("traffic_violations", "roads"),
    ("traffic_violations", "ai_detection_logs"),
    ("fines", "traffic_violations"),
    ("fines", "users"),
    ("violation_appeals", "traffic_violations"),
    ("violation_appeals", "fines"),
    ("violation_appeals", "drivers"),
    ("unknown_vehicles", "cameras"),
    ("unknown_vehicles", "vehicles"),
    ("unknown_vehicles", "traffic_violations"),
    ("cameras", "roads"),
    ("traffic_signals", "roads"),
    ("ai_model_versions", "users"),
    ("notifications", "users"),
    ("audit_logs", "users"),
]

ZONES = [
    (0.2, 4.0, 11.5, 18.5, "A · Identity & RBAC", "#e8f4fc"),
    (13.8, 4.0, 8.0, 18.5, "B · Vehicles & AI Logs", "#eef8ee"),
    (21.0, 0.5, 14.5, 18.5, "C · Enforcement", "#fff4e8"),
    (35.8, 6.5, 6.8, 16.5, "D · Infrastructure", "#f3eef9"),
    (42.8, 6.0, 7.5, 17.0, "E · Signs & Rules", "#fdf2f8"),
    (13.8, 0.0, 22.0, 4.2, "F · Notifications & Audit", "#f5f5f5"),
]

COL_W = 4.6
ROW_H = 0.52
HEADER_H = 0.72
PAD = 0.1


def table_height(n: int) -> float:
    return HEADER_H + n * ROW_H + PAD


def draw_zone(ax, x, y, w, h, label, color):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.08,rounding_size=0.15",
        linewidth=1.0,
        edgecolor="#b0bec5",
        facecolor=color,
        alpha=0.55,
        zorder=0,
    )
    ax.add_patch(patch)
    ax.text(x + 0.15, y + h - 0.35, label, fontsize=10, fontweight="bold", color="#37474f", zorder=1)


def draw_table(ax, name: str, x: float, y: float, columns: list):
    h = table_height(len(columns))
    ax.add_patch(FancyBboxPatch(
        (x, y), COL_W, h,
        boxstyle="square,pad=0",
        linewidth=1.0,
        edgecolor="#607d8b",
        facecolor="#ffffff",
        zorder=3,
    ))
    ax.add_patch(FancyBboxPatch(
        (x, y + h - HEADER_H), COL_W, HEADER_H,
        boxstyle="square,pad=0",
        linewidth=0,
        facecolor="#b8d4e8",
        zorder=4,
    ))
    ax.text(
        x + 0.15, y + h - HEADER_H / 2,
        f"public.{name}",
        fontsize=10, va="center", fontweight="bold", color="#1a3d5c", zorder=5,
    )
    for i, (col, typ, is_pk, fk) in enumerate(columns):
        row_y = y + h - HEADER_H - (i + 0.5) * ROW_H
        ix = x + 0.16
        if is_pk:
            ax.add_patch(mpatches.Rectangle(
                (ix, row_y - 0.1), 0.18, 0.2,
                facecolor="#f0c040", edgecolor="#b8860b", linewidth=0.5, zorder=5,
            ))
        elif fk:
            ax.add_patch(mpatches.Rectangle(
                (ix, row_y - 0.1), 0.18, 0.2,
                facecolor="#5b9bd5", edgecolor="#2e5f8a", linewidth=0.5, zorder=5,
            ))
        ax.text(x + 0.42, row_y, col, fontsize=8.5, va="center", family="Consolas", zorder=5)
        ax.text(x + COL_W - 0.12, row_y, typ, fontsize=7.5, va="center", ha="right", color="#455a64", family="Consolas", zorder=5)
    return {"x": x, "y": y, "w": COL_W, "h": h, "name": name}


def side_anchor(box, side: str):
    if side == "left":
        return box["x"], box["y"] + box["h"] / 2
    if side == "right":
        return box["x"] + box["w"], box["y"] + box["h"] / 2
    if side == "top":
        return box["x"] + box["w"] / 2, box["y"] + box["h"]
    return box["x"] + box["w"] / 2, box["y"]


def pick_sides(child, parent):
    cx, cy = child["x"] + child["w"] / 2, child["y"] + child["h"] / 2
    px, py = parent["x"] + parent["w"] / 2, parent["y"] + parent["h"] / 2
    dx, dy = cx - px, cy - py
    if abs(dx) >= abs(dy):
        if dx > 0:
            return "left", "right"
        return "right", "left"
    if dy > 0:
        return "bottom", "top"
    return "top", "bottom"


def connect(ax, child_box, parent_box, color="#5c6bc0"):
    cs, ps = pick_sides(child_box, parent_box)
    p1 = side_anchor(child_box, cs)
    p2 = side_anchor(parent_box, ps)
    ax.add_patch(FancyArrowPatch(
        p1, p2,
        arrowstyle="-|>",
        mutation_scale=12,
        linewidth=1.0,
        color=color,
        connectionstyle="arc3,rad=0.08",
        zorder=2,
        alpha=0.75,
    ))


def main():
    fig_w, fig_h, dpi = 52, 28, 160
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=dpi)
    ax.set_xlim(0, 51)
    ax.set_ylim(-0.5, 25)
    ax.axis("off")
    bg = "#f8fafc"
    ax.set_facecolor(bg)
    fig.patch.set_facecolor(bg)

    for zx, zy, zw, zh, label, color in ZONES:
        draw_zone(ax, zx, zy, zw, zh, label, color)

    boxes = {name: draw_table(ax, name, x, y, cols) for name, (x, y, cols) in TABLES.items()}

    for child, parent in RELATIONS:
        connect(ax, boxes[child], boxes[parent])

    # logical link (no FK in DB)
    ax.add_patch(FancyArrowPatch(
        side_anchor(boxes["violation_rules"], "left"),
        side_anchor(boxes["traffic_signs"], "bottom"),
        arrowstyle="-|>",
        mutation_scale=12,
        linewidth=1.2,
        linestyle="dashed",
        color="#9c27b0",
        connectionstyle="arc3,rad=0.2",
        zorder=2,
        alpha=0.8,
    ))
    ax.text(41.8, 12.2, "sign_class_key\n(logical link)", fontsize=7.5, color="#7b1fa2", ha="center")

    ax.text(25.5, 24.2, "CamTraffic — Entity Relationship Diagram", ha="center", fontsize=18, fontweight="bold", color="#1a237e")
    ax.text(
        25.5, 23.4,
        "Database: camtraffic_db  ·  Django models  ·  26 tables  ·  PK (gold)  ·  FK (blue)",
        ha="center", fontsize=11, color="#546e7a",
    )

    leg_x = 1.0
    ax.add_patch(mpatches.Rectangle((leg_x, 23.6), 0.22, 0.22, facecolor="#f0c040", edgecolor="#b8860b"))
    ax.text(leg_x + 0.35, 23.71, "Primary Key", fontsize=9, va="center")
    ax.add_patch(mpatches.Rectangle((leg_x + 2.4, 23.6), 0.22, 0.22, facecolor="#5b9bd5", edgecolor="#2e5f8a"))
    ax.text(leg_x + 2.75, 23.71, "Foreign Key", fontsize=9, va="center")
    ax.plot([leg_x + 5.2, leg_x + 6.0], [23.71, 23.71], color="#5c6bc0", linewidth=1.2)
    ax.text(leg_x + 6.15, 23.71, "Relationship", fontsize=9, va="center")
    ax.plot([leg_x + 8.5, leg_x + 9.3], [23.71, 23.71], color="#9c27b0", linewidth=1.2, linestyle="dashed")
    ax.text(leg_x + 9.45, 23.71, "Logical link (no FK)", fontsize=9, va="center")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, bbox_inches="tight", facecolor=bg, pad_inches=0.25)
    plt.close(fig)
    print(f"Saved: {OUT}")


if __name__ == "__main__":
    main()
