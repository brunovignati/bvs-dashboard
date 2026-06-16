"""
=============================================================
BVS Analytics — Sincronizador Connectif → Supabase
VERSIÓN ACUMULABLE — todos los 15 reportes
=============================================================
Reemplaza Base44 con Supabase (gratis para siempre)
=============================================================
"""

import requests
import zipfile
import io
import csv
import re
import time
import logging
from datetime import datetime

# ─────────────────────────────────────────────
#  CONFIGURACIÓN — pon tus credenciales aquí
# ─────────────────────────────────────────────
CONNECTIF_API_KEY  = "r11ZJclyFV2LyXsPjtG6ZU:uXYhtDUR37vBR1M12vejPC"
CONNECTIF_BASE_URL = "https://api.connectif.cloud"

# Estas las obtienes de tu proyecto Supabase → Settings → API
SUPABASE_URL       = "https://tdygooblqxldyakijgda.supabase.co"
SUPABASE_KEY       = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWdvb2JscXhsZHlha2lqZ2RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ5OTgwNSwiZXhwIjoyMDk3MDc1ODA1fQ.ks59ROyIph2wg_543nFbutdwEIPt_ZIJ9K830x7WNwY"  # service_role (no anon)

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S")
log = logging.getLogger("bvs-sync")

CONNECTIF_HEADERS = {"Authorization": f"apiKey {CONNECTIF_API_KEY}"}
SUPABASE_HEADERS  = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"  # upsert acumulable
}


# ══════════════════════════════════════════════
#  Connectif — descargar exports
# ══════════════════════════════════════════════

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
    log.info(f"Connectif: {len(all_exports)} exports")
    return all_exports


def normalize_name(filename):
    name = filename.lower()
    name = re.sub(r'\.zip$', '', name)
    name = re.sub(r'-\d{8}-\d{8}-[0-9a-f-]{36}$', '', name)
    name = re.sub(r'^v[!_\s]*', '', name)
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
    log.info(f"Reportes únicos: {len(latest)}")
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
    for kw in keywords:
        for name, exp in latest_map.items():
            if kw.lower() in name.lower():
                return exp
    return None


# ══════════════════════════════════════════════
#  Transformadores — Connectif CSV → Supabase
# ══════════════════════════════════════════════

def t_monthly_metrics(rows):
    result = []
    for r in rows:
        if not r.get('year') or not r.get('month'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "purchases":    float(r.get('numberOfPurchases', 0)),
            "revenue":      float(r.get('totalPurchaseAmount', 0)),
            "avg_purchase": float(r.get('avgPurchaseAmount', 0)),
            "email_attr":   float(r.get('numberOfPurchasesAttributedToEmail', 0)),
            "push_attr":    float(r.get('numberOfPurchasesAttributedToPushNotification', 0)),
            "web_attr":     float(r.get('numberOfPurchasesAttributedToWebContent', 0)),
            "sms_attr":     float(r.get('numberOfPurchasesAttributedToSms', 0)),
            "updated_at":   datetime.now().isoformat(),
        })
    return result


def t_email_campaigns(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        name = r.get('emailName') or r.get('emailWorkflow') or f"Sin nombre"
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "email_name":     str(name)[:255],
            "email_workflow": str(r.get('emailWorkflow', ''))[:255],
            "sent":      float(r.get('numberOfEmailsSent', 0)),
            "opens":     float(r.get('numberOfUniqueEmailOpens', 0)),
            "clicks":    float(r.get('numberOfUniqueEmailClicks', 0)),
            "unsubs":    float(r.get('numberOfEmailUnsubscribes', 0)),
            "purchases": float(r.get('numberOfPurchases', 0)),
            "revenue":   float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
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
            "sent":      float(r.get('numberOfEmailsSent', 0)),
            "opens":     float(r.get('numberOfUniqueEmailOpens', 0)),
            "clicks":    float(r.get('numberOfUniqueEmailClicks', 0)),
            "purchases": float(r.get('numberOfPurchases', 0)),
            "revenue":   float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_buyer_cohorts(rows):
    result = []
    for r in rows:
        if not r.get('year') or not r.get('month'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "first_time": float(r.get('numberOfFirstTimeBuyers', 0)),
            "recurring":  float(r.get('numberOfRecurringBuyers', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_push_campaigns(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        wf = r.get('pushNotificationWorkflow') or r.get('pushNotificationName') or 'Push'
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "workflow": str(wf)[:255],
            "sent":      float(r.get('numberOfPushNotificationsSent', 0)),
            "opens":     float(r.get('numberOfUniquePushNotificationOpens', 0)),
            "clicks":    float(r.get('numberOfUniquePushNotificationClicks', 0)),
            "purchases": float(r.get('numberOfPurchases', 0)),
            "revenue":   float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_subscribers(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "status":    str(r.get('newsletterSubscriptionStatus', '')),
            "contacts":  float(r.get('numberOfContacts', 0)),
            "increment": float(r.get('incrementOfContacts', 0)),
            "unsubs":    float(r.get('numberOfEmailUnsubscribes', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_push_subscribers(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "contacts":  float(r.get('numberOfContacts', 0)),
            "increment": float(r.get('incrementOfContacts', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_segments(rows):
    result = []
    for r in rows:
        seg = r.get('segment', '')
        if not seg:
            continue
        result.append({
            "segment":  str(seg)[:255],
            "contacts": float(r.get('numberOfContacts', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_compradores(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "brand":   str(r.get('productBrand', 'BVS'))[:255],
            "buyers":  float(r.get('numberOfBuyers', 0)),
            "revenue": float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_sticky(rows):
    result = []
    for r in rows:
        wf = r.get('webContentWorkflow', '')
        if not wf:
            continue
        result.append({
            "workflow":  str(wf)[:255],
            "opens":     float(r.get('numberOfTotalWebContentOpens', 0)),
            "clicks":    float(r.get('numberOfTotalWebContentClicks', 0)),
            "conv_rate": float(r.get('webContentClickConversionRate', 0)),
            "buyers":    float(r.get('numberOfBuyers', 0)),
            "revenue":   float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_envios(rows):
    day_names = {1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb',7:'Dom'}
    result = []
    for r in rows:
        day = r.get('dayOfWeek')
        if day is None:
            continue
        result.append({
            "day_of_week": int(day),
            "day_name":    day_names.get(int(day), str(day)),
            "sent":        float(r.get('numberOfEmailsSent', 0)),
            "purchases":   float(r.get('numberOfPurchases', 0)),
            "revenue":     float(r.get('totalPurchaseAmount', 0)),
            "updated_at":  datetime.now().isoformat(),
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
            "purchases": float(r.get('numberOfPurchasesAttributedToPushNotification', 0)),
            "revenue":   float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_rendimiento_push(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "sent":            float(r.get('numberOfPushNotificationsSent', 0)),
            "purchases_attr":  float(r.get('numberOfPurchasesAttributedToPushNotification', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


def t_carrito(rows):
    result = []
    for r in rows:
        if not r.get('month') or not r.get('year'):
            continue
        name = r.get('emailName') or r.get('emailWorkflow') or 'Carrito'
        result.append({
            "year": int(r['year']), "month": int(r['month']),
            "email_name": str(name)[:255],
            "sent":      float(r.get('numberOfEmailsSent', 0)),
            "opens":     float(r.get('numberOfUniqueEmailOpens', 0)),
            "clicks":    float(r.get('numberOfUniqueEmailClicks', 0)),
            "purchases": float(r.get('numberOfPurchases', 0)),
            "revenue":   float(r.get('totalPurchaseAmount', 0)),
            "updated_at": datetime.now().isoformat(),
        })
    return result


# ══════════════════════════════════════════════
#  Supabase — upsert acumulable
# ══════════════════════════════════════════════

def upsert_supabase(table, records, batch_size=100):
    if not records:
        log.warning(f"  Sin datos para {table}")
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        resp = requests.post(url, headers=SUPABASE_HEADERS, json=batch, timeout=30)
        if resp.status_code in (200, 201):
            total += len(batch)
        else:
            log.error(f"  Error en {table}: {resp.status_code} — {resp.text[:200]}")
        time.sleep(0.05)
    log.info(f"  ✅ {table}: {total} registros sincronizados")


# ══════════════════════════════════════════════
#  MAIN — los 15 reportes
# ══════════════════════════════════════════════

REPORT_MAP = [
    # (tabla_supabase, [keywords_connectif], transformador)
    ("monthly_metrics",  ["nutrace", "compras mensual"],           t_monthly_metrics),
    ("email_campaigns",  ["metricas looker", "métricas looker"],   t_email_campaigns),
    ("cart_abandonment", ["carritos abandonados", "carrito abandon"], t_cart_abandonment),
    ("buyer_cohorts",    ["primerizos"],                           t_buyer_cohorts),
    ("push_campaigns",   ["push ds", "métricas push"],             t_push_campaigns),
    ("subscribers",      ["evolutivo suscritos"],                  t_subscribers),
    ("push_subscribers", ["evolución suscriptores push", "evoluci n de suscriptores push"], t_push_subscribers),
    ("segments",         ["segmento"],                             t_segments),
    ("compradores",      ["compradores mensual", "compradores de la marca"], t_compradores),
    ("sticky",           ["sticky"],                               t_sticky),
    ("envios",           ["envíos", "envios", "env os"],           t_envios),
    ("ventas_push",      ["ventas push"],                          t_ventas_push),
    ("rendimiento_push", ["rendimiento push"],                     t_rendimiento_push),
    ("carrito",          ["v! carrito", " carrito"],               t_carrito),
    # audit newsletters va también a email_campaigns (mismo formato)
    ("email_campaigns",  ["audit newsletter"],                     t_email_campaigns),
]


def main():
    log.info("=" * 60)
    log.info("  BVS Analytics — Sync Connectif → Supabase (15 reportes)")
    log.info(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info("=" * 60)

    log.info("\n[1/3] Obteniendo exports de Connectif...")
    all_exports = get_all_exports()
    latest_map  = get_latest_exports(all_exports)

    log.info("\n[2/3] Descargando y transformando...")
    synced = set()

    for table, keywords, transform_fn in REPORT_MAP:
        key = f"{table}:{keywords[0]}"
        if key in synced:
            continue
        exp = find_report(latest_map, *keywords)
        if not exp:
            log.warning(f"  ⚠️  No encontrado: {keywords[0]}")
            continue
        try:
            log.info(f"  → {exp['fileName']}")
            rows    = download_csv(exp['fileUrl'])
            records = transform_fn(rows)
            log.info(f"     {len(rows)} filas → {len(records)} registros")

            log.info(f"\n[3/3] Subiendo a Supabase: {table}...")
            upsert_supabase(table, records)
            synced.add(key)
        except Exception as e:
            log.error(f"  ❌ Error en {table}: {e}")

    log.info("\n" + "=" * 60)
    log.info("  ✅ Sincronización completada — historial intacto")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
