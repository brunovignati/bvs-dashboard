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
print("\nSync GA4 completo.")
