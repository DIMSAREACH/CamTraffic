# Running E2E Tests on Windows - Workaround

The E2E tests are encountering a Playwright launcher issue on Windows. Here's the workaround:

## Quick Fix: Run Servers Manually

Playwright's `reuseExistingServer` option will detect already-running servers and skip launching them.

### Step 1: Start Backend (Terminal 1)
```bash
cd src/backend
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

### Step 2: Start Admin Frontend (Terminal 2)
```bash
# From project root
set VITE_ADMIN_PORT=5184
npm run dev:admin
```

### Step 3: Start User Frontend (Terminal 3)
```bash
# From project root
set VITE_USER_PORT=5183
npm run dev:user
```

### Step 4: Run E2E Tests (Terminal 4)
```bash
# From project root
cd tests/e2e
npx playwright test --reporter=list
```

---

## Alternative: Run Tests Individually

If full suite fails, run tests one by one:

### Admin Tests
```bash
cd tests/e2e
npx playwright test admin-login.spec.ts --project=admin-chromium
npx playwright test accessibility.spec.ts --project=admin-chromium
```

### User Tests
```bash
cd tests/e2e
npx playwright test user-login.spec.ts --project=user-chromium
npx playwright test officer-ai-detection.spec.ts --project=user-chromium
```

---

## Check Test Results

After running, you should see:
```
✓ 4 tests passed (4 total)
```

Expected tests:
1. ✅ Admin login test
2. ✅ User (Officer/Driver) login test
3. ✅ Officer AI detection workflow
4. ✅ Accessibility tests

---

## Troubleshooting

### If backend doesn't start:
```bash
cd src/backend
pip install -r requirements.txt
python manage.py check
```

### If frontend doesn't start:
```bash
# Clear cache and reinstall
npm run dev:clean
```

### If tests still fail:
```bash
# Run with UI mode for debugging
cd tests/e2e
npx playwright test --ui
```

---

## For Defense Day

**Important:** Have all 3 servers running BEFORE the demo starts!

This is actually safer than relying on Playwright to launch them during the test.
