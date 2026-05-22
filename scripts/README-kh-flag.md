# Install Cambodia flag SVG (Khmer language icon)

1. Copy your full `<svg>...</svg>` paste into:
   `scripts/kh-flag-source.txt`

2. Run:
   ```powershell
   python scripts/write_kh_flag.py
   ```
   Or:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/install-kh-flag.ps1
   ```

3. Hard-refresh the app (Ctrl+Shift+R).

The app loads `frontend-admin/shared/assets/flags/cambodia-flag.svg` via `?raw` import in `LocaleFlag.tsx`.
