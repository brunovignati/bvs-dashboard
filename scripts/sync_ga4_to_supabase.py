"""
BVS GA4 Sync - GitHub Actions
Descarga metricas diarias de Google Analytics 4 (Data API) de los ultimos 60 dias
y las sube a Supabase, con el mismo patron que scripts/sync_social_playwright.py.

GitHub Secrets necesarios:
  GA4_PROPERTY_ID      -> Property ID de GA4 (solo el numero, sin "properties/")
  GA4_CREDENTIALS_JSON -> Contenido completo del JSON de la service account de Google
  SUPABASE_URL         -> Ya existe (usado por sync_social_playwright.py)
  SUPABASE_KEY          -> Ya existe (usado por sync_social_playwright.py)
"""

import os
import json
import requests
from datetime import datetime, timezone

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account

GA4_PROPERTY_ID = os.environ["GA4_PROPERTY_ID"]
GA4_CREDENTIALS_JSON = os.environ["GA4_CREDENTIALS_JSON"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

NOW_ISO = datetime.now(timezone.utc).isoformat()

# Auth GA4 (service account)
print("Autenticando con Google Analytics 4...")
creds_info = json.loads(GA4_CREDENTIALS_JSON)
credentials = service_account.Credentials.from_service_account_info(
    creds_info, scopes=["https://www.googleapis.com/auth/analytics.readonly"]
)
client = BetaAnalyticsDataClient(credentials=credentials)

# Consulta GA4: trafico diario, ultimos 60 dias
print("Consultando GA4 (sessions, activeUsers, screenPageViews, bounceRate)...")
request = RunReportRequest(
    property=f"properties/{GA4_PROPERTY_ID}",
    dimensions=[Dimension(name="date")],
    metrics=[
        Metric(name="sessions"),
        Metric(name="activeUsers"),
        Metric(name="screenPageViews"),
        Metric(name="bounceRate"),
    ],
    date_ranges=[DateRange(start_date="60daysAgo", end_date="today")],
)
response = client.run_report(request)


def pd(d):
    d = str(d)
    return {"year": int(d[:4]), "month": int(d[4:6]), "day": int(d[6:8])}


def fv(v):
    try:
        return float(v) if v is not None else None
    except Exception:
        return None


rows = []
for row in response.rows:
    date_str = row.dimension_values[0].value
    sessions, users, pageviews, bounce_rate = [m.value for m in row.metric_values]
    rows.append(
        {
            "date_str": date_str,
            **pd(date_str),
            "sessions": fv(sessions),
            "users": fv(users),
            "pageviews": fv(pageviews),
            "bounce_rate": fv(bounce_rate),
            "updated_at": NOW_ISO,
        }
    )

print(f" {len(rows)} dias recibidos de GA4")

# Supabase upsert (mismo patron que sync_social_playwright.py)
SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal",
}


def upsert(table, records, conflict):
    total = 0
    for i in range(0, len(records), 100):
        chunk = records[i : i + 100]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict}",
            headers=SB_HEADERS,
            json=chunk,
            timeout=30,
        )
        if r.ok:
            total += len(chunk)
        else:
            print(f" {table} error {r.status_code}: {r.text[:200]}")
    return total


print(f" ga4_daily: {upsert('ga4_daily', rows, 'date_str')}")

# ── Embudo de ecommerce (Nivel 2) — bloque PROTEGIDO: si algo falla aquí, el sync de
# tráfico (arriba) ya se guardó y no se ve afectado. Puebla las columnas nuevas de
# ga4_daily; requiere que se haya ejecutado el ALTER de supabase/ga4_schema.sql.
try:
    print("Consultando GA4 ecommerce (itemsViewed, addToCarts, checkouts, ecommercePurchases, purchaseRevenue)...")
    eco_req = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="date")],
        metrics=[
            Metric(name="itemsViewed"),
            Metric(name="addToCarts"),
            Metric(name="checkouts"),
            Metric(name="ecommercePurchases"),
            Metric(name="purchaseRevenue"),
        ],
        date_ranges=[DateRange(start_date="60daysAgo", end_date="today")],
    )
    eco_resp = client.run_report(eco_req)
    eco_rows = []
    for row in eco_resp.rows:
        ds = row.dimension_values[0].value
        iv, atc, ck, ep, pr = [m.value for m in row.metric_values]
        eco_rows.append({
            "date_str": ds,
            **pd(ds),
            "item_views": fv(iv),
            "add_to_carts": fv(atc),
            "checkouts": fv(ck),
            "ecommerce_purchases": fv(ep),
            "purchase_revenue": fv(pr),
            "updated_at": NOW_ISO,
        })
    print(f" {len(eco_rows)} dias de ecommerce recibidos de GA4")
    print(f" ga4_daily (ecommerce): {upsert('ga4_daily', eco_rows, 'date_str')}")
except Exception as e:
    print(f" Ecommerce GA4 omitido (el core no se ve afectado): {e}")

# ── Ventas por MARCA (fabricante) — bloque PROTEGIDO e independiente. Usa la dimensión
# itemBrand de GA4 (Seresto, Royal Canin, Advantix, …), agregada por mes. Puebla la tabla
# brand_sales; requiere haber ejecutado supabase/brand_sales_schema.sql. Si falla, nada de
# lo anterior se ve afectado. Ventana amplia: GA4 devuelve lo que su retención permita; el
# upsert idempotente por (year,month,brand) va acumulando histórico ejecución a ejecución.
try:
    print("Consultando GA4 ventas por marca (itemBrand x mes: itemRevenue, itemsPurchased)...")
    brand_req = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="yearMonth"), Dimension(name="itemBrand")],
        metrics=[
            Metric(name="itemRevenue"),
            Metric(name="itemsPurchased"),
        ],
        date_ranges=[DateRange(start_date="2024-01-01", end_date="today")],
    )
    brand_resp = client.run_report(brand_req)
    brand_rows = []
    for row in brand_resp.rows:
        ym = row.dimension_values[0].value           # "YYYYMM"
        brand = (row.dimension_values[1].value or "").strip()
        rev, units = [m.value for m in row.metric_values]
        if not ym or len(ym) < 6:
            continue
        if not brand:
            brand = "(sin marca)"
        # itemsPurchased puede ser 0 con revenue 0 (marca vista pero no comprada): la
        # dejamos igualmente, el frontend filtra por revenue/units > 0.
        brand_rows.append({
            "year": int(ym[:4]),
            "month": int(ym[4:6]),
            "brand": brand,
            "revenue": fv(rev) or 0,
            "units": fv(units) or 0,
            "updated_at": NOW_ISO,
        })
    print(f" {len(brand_rows)} filas marca-mes recibidas de GA4")
    print(f" brand_sales: {upsert('brand_sales', brand_rows, 'year,month,brand')}")
except Exception as e:
    print(f" Ventas por marca GA4 omitido (el resto no se ve afectado): {e}")

# ── GA4 por CANAL de tráfico (sessionDefaultChannelGroup) — bloque PROTEGIDO e independiente.
# Puebla ga4_channel_daily (requiere supabase/create_ga4_channel_daily.sql). Permite comparar
# qué canal (orgánico/pago/email/social/directo/referral) convierte mejor. Si falla, nada de lo
# anterior se ve afectado.
try:
    print("Consultando GA4 por canal (sessionDefaultChannelGroup)...")
    ch_req = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="date"), Dimension(name="sessionDefaultChannelGroup")],
        metrics=[
            Metric(name="sessions"),
            Metric(name="itemsViewed"),
            Metric(name="addToCarts"),
            Metric(name="checkouts"),
            Metric(name="ecommercePurchases"),
            Metric(name="purchaseRevenue"),
        ],
        date_ranges=[DateRange(start_date="60daysAgo", end_date="today")],
    )
    ch_resp = client.run_report(ch_req)
    ch_rows = []
    for row in ch_resp.rows:
        ds = row.dimension_values[0].value
        channel = (row.dimension_values[1].value or "").strip() or "(sin canal)"
        se, iv, atc, ck, ep, pr = [m.value for m in row.metric_values]
        ch_rows.append({
            "date_str": ds,
            **pd(ds),
            "channel": channel,
            "sessions": fv(se),
            "item_views": fv(iv),
            "add_to_carts": fv(atc),
            "checkouts": fv(ck),
            "ecommerce_purchases": fv(ep),
            "purchase_revenue": fv(pr),
            "updated_at": NOW_ISO,
        })
    print(f" {len(ch_rows)} filas canal-día recibidas de GA4")
    print(f" ga4_channel_daily: {upsert('ga4_channel_daily', ch_rows, 'date_str,channel')}")
except Exception as e:
    print(f" GA4 por canal omitido (el resto no se ve afectado): {e}")

print("\nSync GA4 completo.")
