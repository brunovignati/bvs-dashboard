"""
BVS Analytics â Sincronizador Connectif â Supabase
VERSIÃN CORREGIDA v3 â Jun 2026
Fixes:
  1. UPSERT real con on_conflict por tabla
  2. Eliminado Audit Newsletters (duplicado de MÃ©tricas Looker)
  3. Filtro de filas sin nombre en t_email_campaigns
  4. Corregido slice en upsert_supabase (i:i+batch_size)
"""

import requests
import zipfile
import io
import csv
import re
import time
import logging
import os
from datetime import datetime

# âââââââââââââââââââââââââââââââââââââââââââââ
# CONFIGURACIÃN â credenciales desde variables de entorno o hardcoded
# âââââââââââââââââââââââââââââââââââââââââââââ
CONNECTIF_API_KEY  = os.environ.get("CONNECTIF_API_KEY",  "r11ZJclyFV2LyXsPjtG6ZU:uXYhtDUR37vBR1M12vejPC")
CONNECTIF_BASE_URL = "https://api.connectif.cloud"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://tdygooblqxldyakijgda.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWdvb2JscXhsZHlha2lqZ2RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ5OTgwNSwiZXhwIjoyMDk3MDc1ODA1fQ.ks59ROyIph2wg_543nFbutdwEIPt_ZIJ9K830x7WNwY")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("bvs-sync")

CONNECTIF_HEADERS = {"Authorization": f"apiKey {CONNECTIF_API_KEY}"}
SUPABASE_HEADERS  = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

NOW = datetime.now()
CURRENT_YEAR  = NOW.year
CURRENT_MONTH = NOW.month

# on_conflict por tabla â columnas que identifican un registro Ãºnico
ON_CONFLICT = {
    "monthly_metrics":  "year,month",
    "email_campaigns":  "year,month,email_name",
    "cart_abandonment": "year,month,email_name",
    "buyer_cohorts":    "year,month",
    "cohort_retention": "cohort_year,cohort_month,life_month",
    "channel_segmentation": "year,month",
    "push_campaigns":   "year,month,workflow",
    "subscribers":      "year,month,status",
    "push_subscribers": "year,month",
    "segments":         "year,month,segment",
    "compradores":      "year,month,brand",
    "sticky":           "workflow",
    "envios":           "day_of_week",
    "ventas_push":      "year,month,channel",
    "rendimiento_push": "year,month",
    "carrito":          "year,month,email_name",
    "daily_revenue":    "year,month,day",
    "daily_email":      "year,month,day,email_name",
    "daily_push":       "year,month,day,workflow",
    "daily_sticky":     "year,month,day,content_name",
}

# ââââââââââââââââââââââââââââââââââââââââââââââ
# Connectif â descargar exports
# ââââââââââââââââââââââââââââââââââââââââââââââ

def get_all_exports():
    all_exports = []
    page = 1
    while page <= 10:
        url = f"{CONNECTIF_BASE_URL}/exports?page={page}&pageSize=50"
        resp = requests.get(url, headers=CONNECTIF_HEADERS, timeout=30)
        if resp.status_code != 200:
            raise Exception(f"Connectif {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        all_exports.extend(results)
        if not data.get("links", {}).get("next"):
            break
        page += 1
    log.info(f"Connectif: {len(all_exports)} exports encontrados")
    return all_exports

def normalize_name(filename):
    name = filename.lower()
    name = re.sub(r'\.zip$', '', name)
    name = re.sub(r'-\d{8}-\d{8}-[0-9a-f-]{36}$', '', name)
    name = re.sub(r'^v[!\s]*', '', name)
    return name.replace('_', ' ').strip()

def get_latest_exports(all_exports):
    latest = {}
    for exp in all_exports:
        if exp.get("status") != "finished" or not exp.get("fileUrl"):
            continue
        name = normalize_name(exp.get("fileName", ""))
        existing = latest.get(name)
        if not existing or exp.get("finishedAt", "") > existing.get("finishedAt", ""):
            latest[name] = exp
    log.info(f"Reportes Ãºnicos disponibles: {len(latest)}")
    return latest

def download_csv(file_url):
    resp = requests.get(file_url, timeout=60)
    if resp.status_code != 200:
        raise Exception(f"ZIP error {resp.status_code}")
    with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
        for name in z.namelist():
            if name.lower().endswith('.csv'):
                with z.open(name) as f:
                    return parse_csv(f.read().decode('utf-8-sig'))
        with z.open(z.namelist()[0]) as f:
            return parse_csv(f.read().decode('utf-8-sig'))

def parse_csv(content):
    lines = content.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    lines = [l for l in lines if l.strip()]
    if not lines:
        return []
    reader = csv.DictReader(lines)
    rows = []
    for row in reader:
        clean = {}
        for k, v in row.items():
            k = k.strip().strip('"')
            v = (v or '').strip().strip('"')
            try:
                clean[k] = float(v) if '.' in v else int(v)
            except (ValueError, TypeError):
                clean[k] = v
        rows.append(clean)
    return rows

def find_report(latest_map, *keywords):
    # Prefijo "=" = match exacto; sin prefijo = substring
    for kw in keywords:
        exact = kw.startswith('=')
        kw_clean = kw[1:] if exact else kw
        for name, exp in latest_map.items():
            match = (name.lower() == kw_clean.lower()) if exact else (kw_clean.lower() in name.lower())
            if match:
                return exp
    return None

def safe_float(row, *keys, default=0.0):
    for key in keys:
        val = row.get(key)
        if val is not None and val != '':
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
    return default

# ââââââââââââââââââââââââââââââââââââââââââââââ
# Transformadores
# ââââââââââââââââââââââââââââââââââââââââââââââ

def t_monthly_metrics(rows):
    result = []
    for r in rows:
        if not r.get('year') or not r.get('month'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "purchases":    safe_float(r, 'numberOfPurchases'),
            "revenue":      safe_float(r, 'totalPurchaseAmount'),
            "avg_purchase": safe_float(r, 'avgPurchaseAmount'),
            "email_attr":   safe_float(r, 'numberOfPurchasesAttributedToEmail'),
            "push_attr":    safe_float(r, 'numberOfPurchasesAttributedToPushNotification'),
            "web_attr":     safe_float(r, 'numberOfPurchasesAttributedToWebContent'),
            "sms_attr":     safe_float(r, 'numberOfPurchasesAttributedToSms'),
            "updated_at":   NOW.isoformat(),
        })
    return result

def t_email_campaigns(rows):
    dedup = {}
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        if not r.get('emailName') and not r.get('emailWorkflow'):
            continue
        name = r.get('emailName') or r.get('emailWorkflow')
        key = (int(r['year']), int(r['month']), str(name)[:255])
        row = {
            "year": key[0], "month": key[1],
            "email_name":     key[2],
            "email_workflow": str(r.get('emailWorkflow', ''))[:255],
            "sent":      safe_float(r, 'numberOfEmailsSent'),
            "opens":     safe_float(r, 'numberOfUniqueEmailOpens'),
            "clicks":    safe_float(r, 'numberOfUniqueEmailClicks'),
            "unsubs":    safe_float(r, 'numberOfEmailUnsubscribes'),
            "purchases": safe_float(r, 'numberOfPurchases'),
            "revenue":   safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        }
        # si hay duplicado, quedarse con el que tiene mÃ¡s revenue
        if key not in dedup or row['revenue'] > dedup[key]['revenue']:
            dedup[key] = row
    result = list(dedup.values())
    return result

def t_cart_abandonment(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        name = r.get('emailName') or r.get('emailWorkflow') or 'Carrito'
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "email_name": str(name)[:255],
            "sent":      safe_float(r, 'numberOfEmailsSent'),
            "opens":     safe_float(r, 'numberOfUniqueEmailOpens'),
            "clicks":    safe_float(r, 'numberOfUniqueEmailClicks'),
            "purchases": safe_float(r, 'numberOfPurchases'),
            "revenue":   safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        })
    return result

def t_buyer_cohorts(rows):
    result = []
    for r in rows:
        if not r.get('year') or not r.get('month'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "first_time": safe_float(r, 'numberOfFirstTimeBuyers'),
            "recurring":  safe_float(r, 'numberOfRecurringBuyers'),
            "updated_at": NOW.isoformat(),
        })
    return result

def _int(row, *keys, default=None):
    """Como safe_float pero devuelve int; None si no encuentra clave utilizable."""
    v = safe_float(row, *keys, default=None)
    return int(v) if v is not None else default

def t_cohort_retention(rows):
    """
    Matriz de cohortes para el LTV real.

    Espera un informe Data Explorer "V. Cohortes" con, por fila, una cohorte de
    adquisición (mes de la primera compra) × mes de vida. Nombres de columna
    admitidos (defensivo — el primer run revela los reales en el log):
      cohorte:   cohortYear/cohortMonth  o  firstPurchaseYear/firstPurchaseMonth
      life:      lifeMonth / monthsSinceFirstPurchase / monthNumber (0,1,2,...)
      buyers:    numberOfBuyers / numberOfContacts / buyers
      revenue:   totalPurchaseAmount / revenue

    Calcula cohort_size (buyers en life_month=0) y lo adjunta a cada fila.
    """
    parsed = []
    for r in rows:
        cy = _int(r, 'cohortYear', 'firstPurchaseYear', 'year')
        cm = _int(r, 'cohortMonth', 'firstPurchaseMonth', 'month')
        lm = _int(r, 'lifeMonth', 'monthsSinceFirstPurchase', 'monthNumber',
                  'monthsSincePurchase', default=None)
        if cy is None or cm is None or lm is None:
            continue
        parsed.append({
            "cohort_year": cy, "cohort_month": cm, "life_month": lm,
            "buyers":  _int(r, 'numberOfBuyers', 'numberOfContacts', 'buyers', default=0) or 0,
            "revenue": safe_float(r, 'totalPurchaseAmount', 'revenue'),
        })
    # cohort_size = buyers en life_month 0 de cada cohorte
    size = {}
    for p in parsed:
        if p["life_month"] == 0:
            size[(p["cohort_year"], p["cohort_month"])] = p["buyers"]
    result = []
    for p in parsed:
        p["cohort_size"] = size.get((p["cohort_year"], p["cohort_month"]), 0)
        p["updated_at"] = NOW.isoformat()
        result.append(p)
    return result

def t_channel_segmentation(rows):
    by_month = {}
    unknown_origins = set()
    for r in rows:
        if not r.get('year') or not r.get('month'):
            continue
        year  = int(r['year'])
        month = int(r['month'])
        origin = str(
            r.get('purchaseOrigin') or r.get('purchase_origin') or
            r.get('Purchase origin') or r.get('Purchase Origin') or ''
        ).strip()
        buyers = int(safe_float(r, 'numberOfBuyers', 'number_of_buyers', 'Number of buyers'))
        key = (year, month)
        if key not in by_month:
            by_month[key] = {'api': 0, 'web': 0}
        if origin.upper() == 'API':
            by_month[key]['api'] = buyers
        elif origin.lower() == 'web':
            by_month[key]['web'] = buyers
        else:
            unknown_origins.add(origin)
    if unknown_origins:
        log.warning(f"  ⚠️  purchaseOrigin desconocido ignorado: {unknown_origins}")
    if not by_month:
        log.warning("  ⚠️  channel_segmentation: sin filas válidas en el CSV")
        return []
    # Fetch total_buyers from buyer_cohorts in Supabase
    try:
        url = f"{SUPABASE_URL}/rest/v1/buyer_cohorts?select=year,month,first_time,recurring"
        resp = requests.get(url, headers=SUPABASE_HEADERS, timeout=30)
        cohorts_raw = resp.json() if resp.status_code == 200 else []
        cohorts = {}
        for c in cohorts_raw:
            y = int(c.get('year', 0)); m = int(c.get('month', 0))
            if y and m:
                cohorts[(y, m)] = int(safe_float(c, 'first_time')) + int(safe_float(c, 'recurring'))
        log.info(f"     buyer_cohorts disponibles: {len(cohorts)} meses")
    except Exception as e:
        log.error(f"  ❌ Error obteniendo buyer_cohorts: {e}")
        return []
    result = []
    for (year, month), origins in sorted(by_month.items()):
        api = origins['api']; web = origins['web']
        total = cohorts.get((year, month))
        if total is None:
            log.warning(f"  ⚠️  Sin buyer_cohorts para {year}/{month:02d} — omitido")
            continue
        if api == 0 and web == 0:
            continue
        omnichannel = api + web - total
        retail = api - omnichannel
        digital = web - omnichannel
        check = retail + digital + omnichannel
        if check != total:
            log.error(f"  ❌ Validación fallida {year}/{month:02d}: {retail}+{digital}+{omnichannel}={check} ≠ {total}. NO se escribirá.")
            continue
        if retail < 0 or digital < 0 or omnichannel < 0:
            log.error(f"  ❌ Valor negativo {year}/{month:02d}: retail={retail}, digital={digital}, omnichannel={omnichannel}. NO se escribirá.")
            continue
        result.append({
            'year': year, 'month': month,
            'api_buyers': api, 'web_buyers': web,
            'retail': retail, 'digital': digital,
            'omnichannel': omnichannel, 'total_buyers': total,
            'updated_at': NOW.isoformat(),
        })
    return result

def t_push_campaigns(rows):
    result = []

    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue

        wf = r.get('pushNotificationWorkflow') or r.get('pushNotificationName') or 'Push'

        result.append({
            "year": int(r['year']),
            "month": int(r['month']),
            "workflow": str(wf)[:255],
            "sent": safe_float(r, 'numberOfPushNotificationsSent', 'numberOfWebPushNotificationsSent'),
            "opens": safe_float(r, 'numberOfUniquePushNotificationOpens', 'numberOfUniqueWebPushNotificationOpens'),
            "clicks": safe_float(r, 'numberOfUniquePushNotificationClicks', 'numberOfUniqueWebPushNotificationClicks'),
            "purchases": safe_float(r, 'numberOfPurchases'),
            "revenue": safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        })

    dedup = {}
    for row in result:
        key = (row["year"], row["month"], row["workflow"])
        dedup[key] = row

    return list(dedup.values())

def t_subscribers(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "status":    str(r.get('newsletterSubscriptionStatus', '')),
            "contacts":  safe_float(r, 'numberOfContacts'),
            "increment": safe_float(r, 'incrementOfContacts'),
            "unsubs":    safe_float(r, 'numberOfEmailUnsubscribes'),
            "updated_at": NOW.isoformat(),
        })
    return result

def t_push_subscribers(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        has_push = r.get('hasMobileWebPushNotificationSubscriptions', '')
        if str(has_push).lower() not in ('yes', 'true', '1', ''):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "contacts":  safe_float(r, 'numberOfContacts'),
            "increment": safe_float(r, 'incrementOfContacts'),
            "updated_at": NOW.isoformat(),
        })
    return result

def t_segments(rows):
    result = []

    for r in rows:
        seg = r.get('segment', '')

        if not seg:
            continue

        result.append({
            "year": CURRENT_YEAR,
            "month": CURRENT_MONTH,
            "segment": str(seg)[:255],
            "contacts": safe_float(r, 'numberOfContacts'),
            "updated_at": NOW.isoformat(),
        })

    dedup = {}

    for row in result:
        key = (row["year"], row["month"], row["segment"])
        dedup[key] = row

    return list(dedup.values())

def t_compradores(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "brand":   str(r.get('productBrand', 'BVS'))[:255],
            "buyers":  safe_float(r, 'numberOfBuyers'),
            "revenue": safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        })
    return result

def t_sticky(rows):
    result = []
    for r in rows:
        wf = r.get('webContentWorkflow', '')
        if not wf:
            continue
        result.append({
            "year":      CURRENT_YEAR,
            "month":     CURRENT_MONTH,
            "workflow":  str(wf)[:255],
            "opens":     safe_float(r, 'numberOfTotalWebContentOpens'),
            "clicks":    safe_float(r, 'numberOfTotalWebContentClicks'),
            "conv_rate": safe_float(r, 'webContentClickConversionRate'),
            "buyers":    safe_float(r, 'numberOfBuyers'),
            "revenue":   safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        })
    return result

def t_envios(rows):
    day_names = {1: 'Lun', 2: 'Mar', 3: 'MiÃ©', 4: 'Jue', 5: 'Vie', 6: 'SÃ¡b', 7: 'Dom'}
    result = []
    for r in rows:
        day = r.get('dayOfWeek')
        if day is None:
            continue
        result.append({
            "day_of_week": int(day),
            "day_name":    day_names.get(int(day), str(day)),
            "sent":        safe_float(r, 'numberOfEmailsSent'),
            "purchases":   safe_float(r, 'numberOfPurchases'),
            "revenue":     safe_float(r, 'totalPurchaseAmount'),
            "updated_at":  NOW.isoformat(),
        })
    return result

def t_ventas_push(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "channel":   str(r.get('purchaseChannel', 'push')),
            "purchases": safe_float(r,
                'numberOfPurchasesAttributedToPushNotification',
                'numberOfPurchasesAttributedToWebPushNotification'),
            "revenue":   safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        })
    return result

def t_rendimiento_push(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "sent": safe_float(r,
                'numberOfWebPushNotificationsSent',
                'numberOfPushNotificationsSent'),
            "purchases_attr": safe_float(r,
                'numberOfPurchasesAttributedToPushNotification',
                'numberOfPurchasesAttributedToWebPushNotification'),
            "updated_at": NOW.isoformat(),
        })
    return result


def t_daily_revenue(rows):
    result = []
    for r in rows:
        if not r.get('year') or not r.get('month') or not r.get('day'):
            continue
        result.append({
            "day":          int(r['day']),
            "month":        int(r['month']),
            "year":         int(r['year']),
            "purchases":    safe_float(r, 'numberOfPurchases'),
            "revenue":      safe_float(r, 'totalPurchaseAmount'),
            "avg_purchase": safe_float(r, 'avgPurchaseAmount'),
            "email_attr":   safe_float(r, 'numberOfPurchasesAttributedToEmail'),
            "push_attr":    safe_float(r, 'numberOfPurchasesAttributedToPushNotification'),
            "web_attr":     safe_float(r, 'numberOfPurchasesAttributedToWebContent'),
            "sms_attr":     safe_float(r, 'numberOfPurchasesAttributedToSms'),
            "updated_at":   NOW.isoformat(),
        })
    return result

def t_daily_email(rows):
    dedup = {}
    for r in rows:
        if not r.get('year') or not r.get('month') or not r.get('day'):
            continue
        name = r.get('emailName') or r.get('emailWorkflow') or ''
        if not name:
            continue
        key = (int(r['year']), int(r['month']), int(r['day']), str(name)[:255])
        row = {
            "year": key[0], "month": key[1], "day": key[2],
            "email_name": key[3],
            "sent":      safe_float(r, 'numberOfEmailsSent'),
            "opens":     safe_float(r, 'numberOfUniqueEmailOpens'),
            "clicks":    safe_float(r, 'numberOfUniqueEmailClicks'),
            "unsubs":    safe_float(r, 'numberOfEmailUnsubscribes'),
            "purchases": safe_float(r, 'numberOfPurchases'),
            "revenue":   safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        }
        if key not in dedup or row['revenue'] > dedup[key]['revenue']:
            dedup[key] = row
    return list(dedup.values())

def t_daily_push(rows):
    dedup = {}
    for r in rows:
        if not r.get('year') or not r.get('month') or not r.get('day'):
            continue
        wf = (r.get('webPushNotificationWorkflow') or
              r.get('pushNotificationWorkflow') or
              r.get('pushNotificationName') or 'Push')
        key = (int(r['year']), int(r['month']), int(r['day']), str(wf)[:255])
        row = {
            "year": key[0], "month": key[1], "day": key[2],
            "workflow": key[3],
            "sent":      safe_float(r, 'numberOfWebPushNotificationsSent', 'numberOfPushNotificationsSent'),
            "opens":     safe_float(r, 'numberOfUniqueWebPushNotificationOpens', 'numberOfUniquePushNotificationOpens'),
            "clicks":    safe_float(r, 'numberOfUniqueWebPushNotificationClicks', 'numberOfUniquePushNotificationClicks'),
            "open_rate": safe_float(r, 'webPushNotificationOpenRate'),
            "ctr":       safe_float(r, 'webPushNotificationClickThroughRate'),
            "updated_at": NOW.isoformat(),
        }
        dedup[key] = row
    return list(dedup.values())

def t_daily_sticky(rows):
    dedup = {}
    for r in rows:
        if not r.get('year') or not r.get('month') or not r.get('day'):
            continue
        name = r.get('webContentName') or r.get('webContentWorkflow') or ''
        if not name:
            continue
        key = (int(r['year']), int(r['month']), int(r['day']), str(name)[:255])
        row = {
            "year": key[0], "month": key[1], "day": key[2],
            "content_name": key[3],
            "opens":   safe_float(r, 'numberOfTotalWebContentOpens'),
            "clicks":  safe_float(r, 'numberOfTotalWebContentClicks'),
            "ctr":     safe_float(r, 'webContentClickConversionRate'),
            "buyers":  safe_float(r, 'numberOfBuyers'),
            "revenue": safe_float(r, 'totalPurchasesAmount', 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        }
        dedup[key] = row
    return list(dedup.values())

def t_carrito(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        name = r.get('emailName') or r.get('emailWorkflow') or 'Carrito'
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "email_name": str(name)[:255],
            "sent":      safe_float(r, 'numberOfEmailsSent'),
            "opens":     safe_float(r, 'numberOfUniqueEmailOpens'),
            "clicks":    safe_float(r, 'numberOfUniqueEmailClicks'),
            "purchases": safe_float(r, 'numberOfPurchases'),
            "revenue":   safe_float(r, 'totalPurchaseAmount'),
            "updated_at": NOW.isoformat(),
        })
    return result

# ââââââââââââââââââââââââââââââââââââââââââââââ
# Supabase â upsert acumulable con on_conflict real
# ââââââââââââââââââââââââââââââââââââââââââââââ

def upsert_supabase(table, records, batch_size=100):
    if not records:
        log.warning(f"  Sin datos para {table}")
        return
    conflict_cols = ON_CONFLICT.get(table, "")
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if conflict_cols:
        url += f"?on_conflict={conflict_cols}"
    total = 0
    errors = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]  # FIX: slice correcto
        resp = requests.post(url, headers=SUPABASE_HEADERS, json=batch, timeout=30)
        if resp.status_code in (200, 201):
            total += len(batch)
        else:
            errors += len(batch)
            log.error(f"  Error en {table}: {resp.status_code} â {resp.text[:300]}")
        time.sleep(0.05)
    if errors:
        log.warning(f"  â ï¸  {table}: {total} OK, {errors} errores")
    else:
        log.info(f"  â {table}: {total} registros sincronizados")

# ââââââââââââââââââââââââââââââââââââââââââââââ
# REPORT MAP â 14 reportes (Audit Newsletters eliminado)
# ââââââââââââââââââââââââââââââââââââââââââââââ

REPORT_MAP = [
    ("monthly_metrics",  ["nutrace", "compras mensual"],                    t_monthly_metrics),
    ("email_campaigns",  ["tricas looker", "audit newsletters"],                      t_email_campaigns),
    # cart_abandonment: el informe "carritos abandonados" es de CONVERSIÓN y NO trae envíos
    # (numberOfEmailsSent ausente → sent/opens/clicks = 0, imposible calcular tasa de recuperación).
    # Se puebla desde el informe COMPLETO de carrito ("=carrito", el mismo que alimenta `carrito`),
    # que sí trae envíos/aperturas/clics reales. `carrito` es la tabla canónica; el dashboard usa
    # `carrito` (CartWinnerCard/CartSequenceCard). Se mantiene cart_abandonment por compatibilidad.
    ("cart_abandonment", ["=carrito"],                                      t_carrito),
    ("buyer_cohorts",    ["primerizos"],                                    t_buyer_cohorts),
    ("cohort_retention", ["cohorte", "cohort", "ltv"],                       t_cohort_retention),
    ("channel_segmentation", ["compradores por origen", "channel buyers"],    t_channel_segmentation),
    ("push_campaigns",   ["push ds", "mÃ©tricas push"],                     t_push_campaigns),
    ("subscribers",      ["evolutivo suscritos"],                           t_subscribers),
    ("push_subscribers", ["evoluciÃ³n suscriptores push", "evoluci n de suscriptores push"], t_push_subscribers),
    ("segments",         ["segmento"],                                      t_segments),
    ("compradores",      ["compradores mensual", "compradores de la marca"], t_compradores),
    ("sticky",           ["sticky"],                                        t_sticky),
    ("envios",           ["envÃ­os", "envios", "env os"],                    t_envios),
    ("ventas_push",      ["ventas push"],                                   t_ventas_push),
    ("rendimiento_push", ["rendimiento push"],                              t_rendimiento_push),
    ("carrito",          ["=carrito"],                                       t_carrito),
    ("daily_revenue",    ["ventas diarias"],                                 t_daily_revenue),
    ("daily_email",      ["email diario"],                                   t_daily_email),
    ("daily_push",       ["push diario"],                                    t_daily_push),
    ("daily_sticky",     ["contenido web diario"],                           t_daily_sticky),
]

# ââââââââââââââââââââââââââââââââââââââââââââââ
# MAIN
# ââââââââââââââââââââââââââââââââââââââââââââââ

def main():
    log.info("=" * 60)
    log.info("  BVS Analytics â Sync Connectif â Supabase v3")
    log.info(f"  {NOW.strftime('%Y-%m-%d %H:%M:%S')}")
    log.info(f"  Snapshot year/month: {CURRENT_YEAR}/{CURRENT_MONTH:02d}")
    log.info("=" * 60)

    log.info("\n[1/3] Obteniendo exports de Connectif...")
    all_exports = get_all_exports()
    latest_map  = get_latest_exports(all_exports)

    log.info("\n[2/3] Descargando, transformando y subiendo...")
    synced = set()

    for table, keywords, transform_fn in REPORT_MAP:
        key = f"{table}:{keywords[0]}"
        if key in synced:
            continue
        exp = find_report(latest_map, *keywords)
        if not exp:
            log.warning(f"  â ï¸  No encontrado: {keywords[0]}")
            continue
        try:
            log.info(f"\n  â {exp['fileName']}")
            rows    = download_csv(exp['fileUrl'])
            records = transform_fn(rows)
            log.info(f"     {len(rows)} filas CSV â {len(records)} registros Supabase")
            upsert_supabase(table, records)
            synced.add(key)
        except Exception as e:
            log.error(f"  â Error en {table} ({keywords[0]}): {e}")

    log.info("\n" + "=" * 60)
    log.info("  â SincronizaciÃ³n completada â historial acumulado intacto")
    log.info("=" * 60)

if __name__ == "__main__":
    main()
