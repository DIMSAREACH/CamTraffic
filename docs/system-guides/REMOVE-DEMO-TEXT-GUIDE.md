# Remove "Thesis Demo" Text - Complete Guide

## Issue
The UI is showing "Phnom Penh — Thesis Demo No Parking Zone" text that needs to be removed for production.

## ✅ Already Fixed

### 1. Environment Variables (VERIFIED)
All `.env` files have demo flags set to `false`:

```bash
# src/web/admin/.env
VITE_USE_MOCK=false
VITE_USE_SAMPLE_FALLBACK=false
VITE_ALLOW_DEMO_VIOLATION=false
VITE_ALLOW_DEMO_ASSETS=false

# src/web/user/.env  
VITE_USE_MOCK=false
VITE_USE_SAMPLE_FALLBACK=false
VITE_ALLOW_DEMO_VIOLATION=false
VITE_ALLOW_DEMO_ASSETS=false
```

## 🔧 Next Steps

### Step 1: Clear Browser Cache
The text might be cached in your browser:

1. **Chrome/Edge**: Press `Ctrl+Shift+Del` → Clear cached images and files
2. **Firefox**: Press `Ctrl+Shift+Del` → Check "Cache" → Clear Now  
3. Or open DevTools (`F12`) → Network tab → Check "Disable cache"

### Step 2: Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Clean Database (if text persists)
Run the SQL script to remove any demo/thesis text from the database:

```bash
# Connect to your PostgreSQL database and run:
psql -U your_user -d camtraffic -f scripts/clean_demo_text.sql
```

Or use Django's dbshell:
```bash
cd src/backend
python manage.py dbshell < ../../scripts/clean_demo_text.sql
```

### Step 4: Hard Refresh the Page
After clearing cache and restarting:
- Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac) to hard refresh
- Or `Ctrl+Shift+R` in most browsers

## 🔍 Where the Text Might Be Coming From

1. **Browser Cache** - Most likely cause
2. **Database Records** - Clean with SQL script above
3. **Mock Data** - Already disabled via `.env` flags
4. **Sample Fallback** - Already disabled via `.env` flags

## ✅ Verification Checklist

- [x] `.env` files have demo flags set to `false`
- [x] SQL cleanup script created
- [ ] Browser cache cleared
- [ ] Dev server restarted  
- [ ] Page hard-refreshed
- [ ] Database cleaned (if needed)

## 📝 Production Deployment Notes

Before deploying to production:

1. Ensure all `.env` files keep demo flags as `false`
2. Run the SQL cleanup script on production database
3. Build with production environment:
   ```bash
   npm run build
   ```
4. Test thoroughly before deployment

## 🆘 If Text Still Appears

If "Thesis Demo" text persists after all steps:

1. Take a screenshot showing the exact location
2. Open browser DevTools (F12) → Elements tab
3. Click the element showing the text
4. Share the HTML structure to identify the source component
