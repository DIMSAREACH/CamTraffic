"""CamTraffic infrastructure — match CamCyber thesis diagram layout exactly."""
from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle

OUT = Path(__file__).resolve().parents[2] / "docs" / "camtraffic-infrastructure-diagram.png"

TECH = {
    "cloudflare": ("#F38020", "#FFFFFF", "CF"),
    "docker": ("#2496ED", "#FFFFFF", "Dk"),
    "github": ("#24292F", "#FFFFFF", "GH"),
    "git": ("#F05032", "#FFFFFF", "Git"),
    "compose": ("#2496ED", "#FFFFFF", "DC"),
    "nginx": ("#009639", "#FFFFFF", "Nx"),
    "react": ("#61DAFB", "#111111", "Re"),
    "django": ("#092E20", "#FFFFFF", "Dj"),
    "postgres": ("#336791", "#FFFFFF", "PG"),
    "redis": ("#DC382D", "#FFFFFF", "Rd"),
    "pgadmin": ("#336791", "#FFFFFF", "pg"),
    "gunicorn": ("#499848", "#FFFFFF", "Gn"),
}


def dashed_rect(ax, x, y, w, h):
    ax.add_patch(Rectangle((x, y), w, h, fill=False, edgecolor="#9e9e9e", linewidth=1.1, linestyle=(0, (5, 5)), zorder=0))


def side_label(ax, x, y, text, size=12):
    ax.text(x, y, text, ha="center", va="center", fontsize=size, fontweight="bold", color="#333333", rotation=90, zorder=5)


def server_rack(ax, cx, cy, scale=1.0):
    w, h = 0.048 * scale, 0.072 * scale
    x, y = cx - w / 2, cy - h / 2
    for i in range(3):
        ry = y + i * (h / 3.15)
        ax.add_patch(Rectangle((x, ry), w, h / 3.4, facecolor="#d0d0d0", edgecolor="#757575", linewidth=1.3, zorder=4))
        for j in range(3):
            ax.add_patch(Circle((x + 0.010 * scale + j * 0.014 * scale, ry + h / 8), 0.004 * scale, facecolor="#43a047", zorder=5))


def server_block(ax, cx, cy, name: str, ip_line: str, logos: list[str]):
    server_rack(ax, cx, cy)
    ax.text(cx, cy - 0.052, name, ha="center", va="top", fontsize=11, fontweight="bold", color="#212121", zorder=6)
    ax.text(cx, cy - 0.078, ip_line, ha="center", va="top", fontsize=9, color="#616161", zorder=6)
    lx = cx + 0.062
    for i, key in enumerate(logos):
        bg, fg, ab = TECH[key]
        r = 0.019
        lx_i = lx + i * 0.042
        ax.add_patch(Circle((lx_i, cy), r, facecolor=bg, edgecolor="#616161", linewidth=0.9, zorder=6))
        ax.text(lx_i, cy, ab, ha="center", va="center", fontsize=7, fontweight="bold", color=fg, zorder=7)


def cloudflare_logo(ax, cx, cy):
    ax.add_patch(Circle((cx, cy), 0.034, facecolor="#F38020", edgecolor="#E65100", linewidth=1.5, zorder=5))
    ax.text(cx, cy + 0.006, "CF", ha="center", va="center", fontsize=14, fontweight="bold", color="white", zorder=6)
    ax.text(cx, cy - 0.048, "Cloudflare", ha="center", va="top", fontsize=11, fontweight="bold", color="#E65100", zorder=6)


def cartoon_user(ax, cx, cy, label: str):
    # desk
    ax.add_patch(Rectangle((cx - 0.055, cy - 0.035), 0.11, 0.018, facecolor="#8d6e63", edgecolor="#5d4037", linewidth=1, zorder=3))
    # chair back
    ax.add_patch(Rectangle((cx - 0.028, cy - 0.055), 0.056, 0.022, facecolor="#5c6bc0", edgecolor="#3949ab", linewidth=1, zorder=3))
    # body
    ax.add_patch(FancyBboxPatch((cx - 0.022, cy - 0.048), 0.044, 0.035, boxstyle="round,pad=0.004", facecolor="#7986cb", edgecolor="#3949ab", linewidth=1, zorder=4))
    # head
    ax.add_patch(Circle((cx, cy - 0.008), 0.016, facecolor="#ffcc80", edgecolor="#6d4c41", linewidth=1, zorder=5))
    # monitor
    ax.add_patch(Rectangle((cx - 0.038, cy + 0.012), 0.076, 0.048, facecolor="#eceff1", edgecolor="#546e7a", linewidth=1.2, zorder=4))
    ax.add_patch(Rectangle((cx - 0.030, cy + 0.020), 0.060, 0.032, facecolor="#90caf9", edgecolor="none", zorder=5))
    ax.add_patch(Rectangle((cx - 0.010, cy + 0.004), 0.020, 0.010, facecolor="#b0bec5", edgecolor="none", zorder=5))
    ax.text(cx, cy - 0.088, label, ha="center", va="top", fontsize=11, fontweight="bold", color="#1565c0", zorder=6)


def flow_arrow(ax, p1, p2, label="", color="#1976d2", rad=0.0, green=False):
    style = f"arc3,rad={rad}" if rad else "arc3"
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle="-|>", mutation_scale=18, linewidth=2.2, color=color, connectionstyle=style, zorder=3))
    if label:
        mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
        fc = "#2e7d32" if green else "#757575"
        ax.text(mx, my + 0.014, label, ha="center", va="bottom", fontsize=10.5, fontweight="bold", color=fc, zorder=8)


def main():
    plt.rcParams["font.family"] = "Segoe UI"
    fig, ax = plt.subplots(figsize=(14, 10), dpi=220)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    ax.set_facecolor("white")
    fig.patch.set_facecolor("white")

    L = 0.11  # left content margin
    R = 0.95  # right edge
    M = 0.50  # middle split

    # ── Full grid (like sample) ───────────────────────────────────────────
    dashed_rect(ax, L, 0.80, R - L, 0.16)   # Client
    dashed_rect(ax, L, 0.68, R - L, 0.12)   # DNS
    dashed_rect(ax, L, 0.42, M - L, 0.26)   # Application (left top)
    dashed_rect(ax, L, 0.08, M - L, 0.34)   # Database (left bottom)
    dashed_rect(ax, M, 0.54, R - M, 0.14)   # SCM (right top)
    dashed_rect(ax, M, 0.42, R - M, 0.12)   # CI/CD (right mid)
    dashed_rect(ax, M, 0.08, R - M, 0.34)   # right bottom empty / align grid

    # internal horizontal split left column
    ax.plot([L, M], [0.42, 0.42], color="#9e9e9e", linewidth=1.0, linestyle=(0, (5, 5)), zorder=1)
    ax.plot([M, R], [0.54, 0.54], color="#9e9e9e", linewidth=1.0, linestyle=(0, (5, 5)), zorder=1)

    # Side labels
    side_label(ax, 0.065, 0.88, "Client")
    side_label(ax, 0.065, 0.74, "DNS")
    side_label(ax, 0.065, 0.40, "CamTraffic\nInfrastructure", size=11)

    # Zone labels (vertical, inside cells)
    side_label(ax, 0.135, 0.55, "Application", size=10)
    side_label(ax, 0.135, 0.25, "Database / File\n/ Storage", size=9)
    side_label(ax, M + 0.045, 0.61, "SCM", size=10)
    side_label(ax, M + 0.045, 0.48, "CI/CD", size=10)

    # ── Client ────────────────────────────────────────────────────────────
    cartoon_user(ax, 0.26, 0.86, "Tester")
    cartoon_user(ax, 0.80, 0.86, "Developer & Deployer")

    # ── DNS ─────────────────────────────────────────────────────────────────
    cloudflare_logo(ax, 0.50, 0.74)

    # ── Servers (CamTraffic stack) ─────────────────────────────────────────
    server_block(ax, 0.26, 0.56, "CamTraffic-App",
                 "159.223.69.158",
                 ["nginx", "react", "django", "docker"])

    server_block(ax, 0.26, 0.24, "CamTraffic-DB",
                 "Private IP: 10.104.0.2",
                 ["postgres", "redis", "pgadmin", "docker"])

    server_block(ax, 0.72, 0.60, "CamTraffic-GitHub",
                 "159.223.51.145",
                 ["docker", "github", "git"])

    server_block(ax, 0.72, 0.48, "CamTraffic-CI/CD",
                 "Docker Compose",
                 ["docker", "compose", "gunicorn"])

    # ── Flow arrows (same as CamCyber sample) ───────────────────────────────
    flow_arrow(ax, (0.26, 0.78), (0.44, 0.76))                    # Tester → Cloudflare
    flow_arrow(ax, (0.50, 0.71), (0.28, 0.60))                    # CF → App
    flow_arrow(ax, (0.50, 0.71), (0.28, 0.30), rad=-0.25)         # CF → DB
    flow_arrow(ax, (0.80, 0.78), (0.72, 0.64), "push", rad=-0.12) # Dev → GitHub
    flow_arrow(ax, (0.64, 0.60), (0.34, 0.56), "pull", rad=0.06)  # GitHub → App
    flow_arrow(ax, (0.72, 0.56), (0.72, 0.52), "Webhooks", green=True)
    flow_arrow(ax, (0.72, 0.52), (0.72, 0.56), green=True)
    flow_arrow(ax, (0.64, 0.48), (0.34, 0.54), "port: 22", rad=0.08)
    flow_arrow(ax, (0.26, 0.48), (0.26, 0.30))                    # App → DB

    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, bbox_inches="tight", facecolor="white", pad_inches=0.12)
    plt.close(fig)
    print(f"Saved: {OUT}")


if __name__ == "__main__":
    main()
