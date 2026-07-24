# 🧪 E2E Tests - Quick Start Guide

## Issue Found

The E2E tests are encountering a Playwright launcher error on Windows:
```
Error: Failed to launch: Error: spawn C:\WINDOWS\system32\cmd.exe ENOENT
```

This is a known Windows issue where Playwright has trouble spawning the dev servers.

---

## ✅ **SOLUTION: Manual Server Launch**

Instead of letting Playwright start the servers, we'll start them manually (which is actually better for your defense demo anyway!).

---

## 🚀 **How to Run E2E Tests (4 Simple Steps)**

### **Step 1: Start Backend** (Terminal 1)

```bash
cd src/backend
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

**Wait for:** `Starting development server at http://127.0.0.1:8000/`

---

### **Step 2: Start Admin Frontend** (Terminal 2)

```bash
# From project root
npm run dev:admin
```

**Wait for:** `VITE ready in XXX ms` on port 5184

---

### **Step 3: Start User Frontend** (Terminal 3)

```bash
# From project root  
npm run dev:user
```

**Wait for:** `VITE ready in XXX ms` on port 5183

---

### **Step 4: Run E2E Tests** (Terminal 4)

```bash
cd tests/e2e
npx playwright test --reporter=list
```

**Expected Output:**
```
✓ tests/admin-login.spec.ts:3:5 › Admin Portal Login (admin-chromium)
✓ tests/user-login.spec.ts:3:5 › User Portal Login - Officer (user-chromium)
✓ tests/user-login.spec.ts:3:5 › User Portal Login - Driver (user-chromium)
✓ tests/officer-ai-detection.spec.ts:3:5 › Officer AI Detection (user-chromium)

4 passed (XXs)
```

---

## 🎯 **Alternative: Use the Batch Script**

I've created `run-e2e-tests.bat` for you!

### Before running the batch script:
1. Start backend (Terminal 1)
2. Start admin frontend (Terminal 2)
3. Start user frontend (Terminal 3)

### Then double-click:
```
run-e2e-tests.bat
```

The script will:
- ✅ Check if all servers are running
- ✅ Run all E2E tests
- ✅ Show results

---

## 📊 **What the Tests Validate**

### Test 1: Admin Login ✅
- Verifies admin can log in at `http://127.0.0.1:5184`
- Checks redirect to admin dashboard
- Validates admin role access

### Test 2: User Login (Officer) ✅
- Verifies officer can log in at `http://127.0.0.1:5183`
- Checks redirect to officer dashboard
- Validates officer role access

### Test 3: User Login (Driver) ✅
- Verifies driver can log in at `http://127.0.0.1:5183`
- Checks redirect to citizen dashboard
- Validates driver role access

### Test 4: Officer AI Detection ✅
- Tests AI detection workflow
- Uploads test image
- Validates detection results
- Checks confidence scores

---

## 🐛 **Troubleshooting**

### Error: "Backend not running"
```bash
cd src/backend
python manage.py check
python manage.py runserver 127.0.0.1:8000
```

### Error: "Frontend not starting"
```bash
# Clear cache
npm run dev:clean
# Or manually:
npm cache clean --force
npm install
```

### Error: "Test timeout"
- Increase timeout in `playwright.config.ts` (already set to 60s)
- Check if servers are responding:
  ```bash
  curl http://127.0.0.1:8000/health/
  curl http://127.0.0.1:5184/
  curl http://127.0.0.1:5183/
  ```

### Tests fail on specific scenarios
```bash
# Run with UI for debugging
cd tests/e2e
npx playwright test --ui

# Run specific test
npx playwright test admin-login.spec.ts --project=admin-chromium --headed
```

---

## 🎓 **For Defense Day**

### Best Practice: Pre-start All Servers

**30 minutes before defense:**
1. ✅ Start backend
2. ✅ Start admin frontend
3. ✅ Start user frontend
4. ✅ Test login on all 3 portals
5. ✅ Leave them running during presentation

This way:
- No startup delays during demo
- Servers are already "warm"
- No risk of launch failures
- You can show live system immediately

---

## 📸 **Taking Screenshots for Defense**

After tests pass, take screenshots:

```bash
# Run tests with screenshots
cd tests/e2e
npx playwright test --screenshot=only-on-failure

# If you want screenshots of passing tests too:
npx playwright test --screenshot=on
```

Screenshots saved to: `tests/e2e/test-results/`

---

## ✅ **Checklist**

- [ ] Backend running on http://127.0.0.1:8000
- [ ] Admin frontend on http://127.0.0.1:5184
- [ ] User frontend on http://127.0.0.1:5183
- [ ] E2E tests: 4/4 passing
- [ ] Screenshots saved (optional)
- [ ] Note test results in defense materials

---

## 🎯 **Expected Test Duration**

- Setup time: ~2-3 minutes (start 3 servers)
- Test execution: ~30-60 seconds (all 4 tests)
- Total: **~5 minutes**

---

## 📝 **Report for Defense**

When tests pass, you can say:

> "Our system has been validated with **4 end-to-end automated tests** covering:
> - User authentication for all 3 roles (Admin, Officer, Driver)
> - Complete AI detection workflow
> - All tests passing with 100% success rate
> - Automated testing ensures system reliability"

**Test Evidence:**
- ✅ All 4 E2E tests passing
- ✅ Backend tests: XX passing
- ✅ Integration tests passing
- ✅ Total test coverage: XX%

---

**Good luck with testing! 🚀**
