# Fix Render verification for `api.camtraffic.store`

Render’s message about **AAAA** and **CAA** almost always means DNS at your registrar/CDN—not application code. Use this checklist for **`api`** (same rules apply to **`admin`** and **`app`**).

Official reference: [Render — Custom domains](https://render.com/docs/custom-domains), [CAA records](https://render.com/docs/custom-domains#caa-records), [Cloudflare DNS](https://render.com/docs/configure-cloudflare-dns).

---

## 1. Copy the exact CNAME from Render

1. **Render → camtraffic-api → Settings → Custom Domains**
2. Find **`api.camtraffic.store`** — Render shows **Name** and **Value** (target).
3. Target is usually your service hostname, e.g. `camtraffic-api.onrender.com` — **use Render’s value, not a guess**.

At your DNS provider add **one** record:

| Type  | Host / name | Value / target                    | TTL  |
|-------|-------------|-----------------------------------|------|
| CNAME | `api`       | *(paste from Render dashboard)*   | Auto |

**Do not** also add an **A** or **AAAA** record for `api` — only the CNAME.

Namecheap / Cloudflare “name” is often just `api`, not the full `api.camtraffic.store`.

---

## 2. Remove all AAAA records (required)

Render is **IPv4-only**. **AAAA** records break verification.

In DNS for **`camtraffic.store`**, delete **every** AAAA record, including:

- `@` (apex)
- `www`
- `api`, `admin`, `app`
- `*` (wildcard)

Re-check after saving; some panels re-add defaults.

---

## 3. Fix CAA records (if any exist)

If you have **no** CAA records, skip this section.

If you **do** have CAA records on `camtraffic.store`, Render’s TLS needs **Let’s Encrypt** and **Google Trust Services**. Add at **apex** (`@`):

| Type | Host | Value |
|------|------|--------|
| CAA  | `@`  | `0 issue "letsencrypt.org"` |
| CAA  | `@`  | `0 issue "pki.goog"` |

If you use wildcards or strict CAA, also add `issuewild` for the same issuers (see Render docs).

**Or** temporarily **remove** all CAA records, verify on Render, then add CAA back including the rows above.

---

## 4. Cloudflare-specific

If DNS is on **Cloudflare**:

1. **SSL/TLS → Overview →** set encryption to **Full** (not Flexible).
2. For the **`api`** CNAME: **Proxy status = DNS only** (grey cloud) until Render shows **Verified** and certificate issued.
3. After verified, you may switch to Proxied (orange) if you want.

During first verification, **orange cloud** often causes “couldn’t verify” errors.

---

## 5. Conflicts to remove

| Problem | Fix |
|---------|-----|
| `api` has **A** record to an IP | Delete A; keep only CNAME to Render |
| **URL redirect / parking** on `api` or apex | Disable for `api`; use CNAME only |
| **Wildcard** `*` CNAME to another host | Remove or point `*` only after `api` works |
| Old **CNAME** `api` → wrong target | Edit to match Render dashboard exactly |

---

## 6. Verify from your PC

```powershell
nslookup -type=CNAME api.camtraffic.store
```

You should see the CNAME chain toward `*.onrender.com`.

Online: [dnschecker.org](https://dnschecker.org) → CNAME → `api.camtraffic.store`.

---

## 7. Render dashboard

1. Wait **5–30 minutes** after DNS changes (up to 24–48h globally).
2. **Custom Domains → Verify** next to `api.camtraffic.store`.
3. Optional: [Flush Google Public DNS cache](https://developers.google.com/speed/public-dns/cache) for the hostname.

Success: status **Verified**, certificate issued. Then open:

`https://api.camtraffic.store/health/`

---

## 8. Until verification succeeds

Keep the app working on default Render URLs:

**Static sites (admin + user) build env:**

```env
VITE_API_URL=https://camtraffic-api.onrender.com/api
```

**API env:**

```env
ALLOWED_HOSTS=camtraffic-api.onrender.com,.onrender.com
CORS_ALLOWED_ORIGINS=https://camtraffic-admin.onrender.com,https://camtraffic-user.onrender.com
```

After **`api.camtraffic.store`** is verified, switch `VITE_API_URL` and `ALLOWED_HOSTS` / CORS as in [`RENDER.md`](RENDER.md).

---

## 9. Repeat for admin and app

| Subdomain | Render service        | CNAME host | Typical target              |
|-----------|------------------------|------------|-----------------------------|
| `api`     | camtraffic-api (Web)   | `api`      | `camtraffic-api.onrender.com` |
| `admin`   | camtraffic-admin       | `admin`    | `camtraffic-admin.onrender.com` |
| `app`     | camtraffic-user        | `app`      | `camtraffic-user.onrender.com` |

Each needs its own CNAME; same AAAA/CAA rules for the whole zone.

**Render plan note:** Hobby includes **2** custom domains on the workspace; Pro includes more. If you hit a plan limit, verify **api** + **admin** first, or upgrade / use `*.onrender.com` URLs for the third host.
