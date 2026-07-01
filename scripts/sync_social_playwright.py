"""
BVS Social Media Sync - GitHub Actions (Playwright login)
Sin API token. Playwright loga en Metricool, extrae cookie _ashkii y llama a la API.

GitHub Secrets: METRICOOL_EMAIL, METRICOOL_PASSWORD, SUPABASE_URL, SUPABASE_KEY
"""

import os, requests
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright

METRICOOL_EMAIL    = os.environ["METRICOOL_EMAIL"]
METRICOOL_PASSWORD = os.environ["METRICOOL_PASSWORD"]
SUPABASE_URL       = os.environ["SUPABASE_URL"]
SUPABASE_KEY       = os.environ["SUPABASE_KEY"]
BRAND_ID           = "4404955"

tz_madrid = timezone(timedelta(hours=2))
today     = datetime.now(tz_madrid)
NOW_ISO   = datetime.now(timezone.utc).isoformat()
to_date   = today.strftime("%Y-%m-%dT23:59:59+02:00")
from_60   = (today - timedelta(days=60)).strftime("%Y-%m-%dT00:00:00+02:00")
from_180  = (today - timedelta(days=180)).strftime("%Y-%m-%dT00:00:00+02:00")

# ── Login ────────────────────────────────────────────────────
print("Iniciando sesion en Metricool...")

def get_session_cookie():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = ctx.new_page()
        page.goto("https://app.metricool.com/login", wait_until="networkidle")
        page.locator("input[type='email'], input[name='email']").first.fill(METRICOOL_EMAIL)
        page.locator("input[type='password']").first.fill(METRICOOL_PASSWORD)
        page.locator("button[type='submit']").first.click()
        try:
            page.wait_for_url("**/app.metricool.com/**", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        cookies = ctx.cookies("https://app.metricool.com")
        browser.close()
    val = next((c["value"] for c in cookies if c["name"] == "_ashkii"), None)
    if not val:
        raise RuntimeError(f"Cookie _ashkii no encontrada. Cookies: {[c['name'] for c in cookies]}")
    print(f"  Cookie obtenida ({len(val)} chars)")
    return val

SESSION_COOKIE = get_session_cookie()

# ── Metricool API ────────────────────────────────────────────
def fetch_metricool(metrics, from_date):
    resp = requests.post(
        "https://app.metricool.com/api/v2/analytics/data",
        headers={"Cookie": f"_ashkii={SESSION_COOKIE}", "Content-Type": "application/json",
                 "Referer": "https://app.metricool.com/", "Origin": "https://app.metricool.com"},
        json={"brandId": BRAND_ID, "from": from_date, "to": to_date, "metrics": metrics},
        timeout=60,
    )
    resp.raise_for_status()
    return [r for r in resp.json().get("rows", []) if r and r[-1] and len(str(r[-1])) == 8]

# ── Supabase upsert ──────────────────────────────────────────
SB_HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
              "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"}

def upsert(table, records, conflict):
    total = 0
    for i in range(0, len(records), 100):
        r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict}",
                          headers=SB_HEADERS, json=records[i:i+100], timeout=30)
        if r.ok: total += len(records[i:i+100])
        else: print(f"  {table} error {r.status_code}: {r.text[:200]}")
    return total

def pd(d):
    d = str(d); return {"year": int(d[:4]), "month": int(d[4:6]), "day": int(d[6:8])}

def fv(v):
    try: return float(v) if v is not None else None
    except: return None

# ── Instagram daily ──────────────────────────────────────────
print("\nInstagram diario")
ig = fetch_metricool(["IGEV01","IGEV05","IGEV06","IGEV22","IGEV23"], from_60)
print(f"  ig_daily: {upsert('ig_daily', [{"date_str":str(r[5]),**pd(r[5]),"followers":fv(r[0]),"views":fv(r[1]),"reach":fv(r[2]),"reels_count":fv(r[3]),"reels_views":fv(r[4]),"updated_at":NOW_ISO} for r in ig], 'date_str')}")

# ── Instagram reels ──────────────────────────────────────────
print("\nInstagram reels")
igr = fetch_metricool(["IGRE01","IGRE03","IGRE06","IGRE07","IGRE08","IGRE09","IGRE10","IGRE11","IGRE12","IGRE23"], from_180)
reels = []
for r in igr:
    url = str(r[2]) if r[2] else ""
    if "instagram.com" not in url: continue
    d = str(r[0])
    reels.append({"url":url,"date_str":d,"year":int(d[:4]),"month":int(d[4:6]),"content":str(r[1]) if r[1] else "","comments":fv(r[3]),"engagement":fv(r[4]),"interactions":fv(r[5]),"likes":fv(r[6]),"reach":fv(r[7]),"saved":fv(r[8]),"views":fv(r[9]),"updated_at":NOW_ISO})
print(f"  ig_reels: {upsert('ig_reels', reels, 'url')}")

# ── Facebook daily ───────────────────────────────────────────
print("\nFacebook diario")
fb = fetch_metricool(["FBEV17","FBEV03","FBEV49","FBEV47","FBEV48"], from_60)
print(f"  fb_daily: {upsert('fb_daily', [{"date_str":str(r[5]),**pd(r[5]),"followers":fv(r[0]),"page_views":fv(r[1]),"page_media_view":fv(r[2]),"followers_acquired":fv(r[3]),"followers_lost":fv(r[4]),"updated_at":NOW_ISO} for r in fb], 'date_str')}")

# ── TikTok daily ─────────────────────────────────────────────
print("\nTikTok diario")
tk = fetch_metricool(["TKEV07","TKEV12","TKEV11","TKEV06","TKEV01","TKEV08","TKEV09"], from_60)
print(f"  tk_daily: {upsert('tk_daily', [{"date_str":str(r[7]),**pd(r[7]),"followers":fv(r[0]),"account_views":fv(r[1]),"reach":fv(r[2]),"interactions":fv(r[3]),"videos":fv(r[4]),"new_followers":fv(r[5]),"profile_views":fv(r[6]),"updated_at":NOW_ISO} for r in tk], 'date_str')}")

print("\nSync completo.")
