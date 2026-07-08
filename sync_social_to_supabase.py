"""
BVS Analytics — Sincronizador Redes Sociales → Supabase
VERSION 1.0 — Jul 2026

Reemplaza completamente la tarea Cowork bvs-instagram-sync.
Sin Claude, sin MCP, sin créditos de IA.

Flujo: Metricool API → Python → Supabase (upsert acumulativo)

Tablas de destino:
  ig_daily    (date_str PK) — Instagram evolución diaria
  ig_reels    (url PK)      — Instagram reels individuales
  fb_daily    (date_str PK) — Facebook evolución diaria
  tk_daily    (date_str PK) — TikTok evolución diaria

Variables de entorno requeridas (GitHub Secrets):
  METRICOOL_TOKEN           — API token de Metricool (Settings → Integrations → API)
  SUPABASE_URL              — https://tdygooblqxldyakijgda.supabase.co
  SUPABASE_SERVICE_ROLE_KEY — clave service_role de Supabase
  METRICOOL_BRAND_ID        — opcional, por defecto "4404955"
"""

import os
import time
import logging
import requests
from datetime import datetime, timedelta, timezone

# ─────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────

METRICOOL_TOKEN    = os.environ.get("METRICOOL_TOKEN", "")
METRICOOL_BRAND_ID = os.environ.get("METRICOOL_BRAND_ID", "4404955")
SUPABASE_URL       = os.environ.get("SUPABASE_URL",
                        "https://tdygooblqxldyakijgda.supabase.co")
SUPABASE_KEY       = os.environ.get("SUPABASE_SERVICE_ROLE_KEY",
                        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWdvb2JscXhsZHlha2lqZ2RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ5OTgwNSwiZXhwIjoyMDk3MDc1ODA1fQ.ks59ROyIph2wg_543nFbutdwEIPt_ZIJ9K830x7WNwY")

METRICOOL_BASE_URL = "https://app.metricool.com"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("bvs-social-sync")

NOW = datetime.now(timezone.utc)

SUPABASE_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",
}

METRICOOL_HEADERS = {
    "x-app-token":  METRICOOL_TOKEN,
    "Content-Type": "application/json",
}

# ─────────────────────────────────────────────
# METRICOOL — llamadas a la API
# ─────────────────────────────────────────────

def _date_ranges():
    """Devuelve (to, from_60d, from_180d) en formato ISO 8601 con TZ+02:00."""
    to_     = NOW.strftime("%Y-%m-%dT23:59:59+02:00")
    from60  = (NOW - timedelta(days=60)).strftime("%Y-%m-%dT00:00:00+02:00")
    from180 = (NOW - timedelta(days=180)).strftime("%Y-%m-%dT00:00:00+02:00")
    return to_, from60, from180


def _call_metricool(network: str, connector: str, metrics: list[str],
                    from_date: str, to_date: str) -> list:
    """
    Llama a la API de analytics de Metricool.
    Devuelve lista de filas (cada fila = lista de valores).
    """
    # Construir query params manualmente para repetir metrics[]
    params = [
        ("blogId",    METRICOOL_BRAND_ID),
        ("network",   network),
        ("connector", connector),
        ("from",      from_date),
        ("to",        to_date),
    ]
    for m in metrics:
        params.append(("metrics[]", m))

    url = f"{METRICOOL_BASE_URL}/api/v2/analytics"
    try:
        resp = requests.get(url, headers=METRICOOL_HEADERS, params=params, timeout=45)
        if resp.status_code != 200:
            log.error(f"  ❌ Metricool {network}/{connector}: HTTP {resp.status_code} — {resp.text[:300]}")
            return []
        data = resp.json()
        # El API puede devolver {"data": [...]} o directamente [...]
        rows = data.get("data", data) if isinstance(data, dict) else data
        if not isinstance(rows, list):
            log.error(f"  ❌ Respuesta inesperada de Metricool: {str(data)[:200]}")
            return []
        log.info(f"     {network}/{connector}: {len(rows)} filas recibidas")
        return rows
    except Exception as e:
        log.error(f"  ❌ Error llamando Metricool {network}/{connector}: {e}")
        return []


def _parse_date_str(date_raw) -> tuple[str, int, int, int]:
    """Parsea '20260701' → ('20260701', 2026, 7, 1). Devuelve ('',0,0,0) si inválido."""
    s = str(date_raw or "").strip()
    if len(s) != 8 or not s.isdigit():
        return "", 0, 0, 0
    return s, int(s[:4]), int(s[4:6]), int(s[6:8])


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default

# ─────────────────────────────────────────────
# SUPABASE — upsert
# ─────────────────────────────────────────────

def _upsert_supabase(table: str, records: list, conflict_col: str, batch_size=100):
    if not records:
        log.warning(f"  ⚠️  Sin datos para {table}")
        return

    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_col}"
    total, errors = 0, 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        resp  = requests.post(url, headers=SUPABASE_HEADERS, json=batch, timeout=30)
        if resp.status_code in (200, 201):
            total += len(batch)
        else:
            errors += len(batch)
            log.error(f"  ❌ {table}: {resp.status_code} — {resp.text[:200]}")
        time.sleep(0.05)

    icon = "✅" if not errors else "⚠️"
    log.info(f"  {icon} {table}: {total} sincronizados, {errors} errores")

# ─────────────────────────────────────────────
# SYNC — Instagram daily (ig_daily)
# ─────────────────────────────────────────────

def sync_ig_daily(from_date: str, to_date: str):
    """
    Métricas: IGEV01=followers, IGEV05=views, IGEV06=reach,
              IGEV22=reels_count, IGEV23=reels_views, [date_YYYYMMDD]
    Columnas por orden: [followers, views, reach, reels_count, reels_views, date]
    Ignorar filas donde r[0] == None
    """
    metrics = ["IGEV01", "IGEV05", "IGEV06", "IGEV22", "IGEV23"]
    rows    = _call_metricool("instagram", "evolution", metrics, from_date, to_date)

    records = []
    for r in rows:
        if not r or r[0] is None:
            continue
        date_raw = r[5] if len(r) > 5 else ""
        date_str, year, month, day = _parse_date_str(date_raw)
        if not year:
            continue
        records.append({
            "date_str":   date_str,
            "year":       year,
            "month":      month,
            "day":        day,
            "followers":   _safe_float(r[0]),
            "views":       _safe_float(r[1]),
            "reach":       _safe_float(r[2]),
            "reels_count": _safe_float(r[3]),
            "reels_views": _safe_float(r[4]),
            "updated_at":  NOW.isoformat(),
        })

    log.info(f"     ig_daily: {len(records)} registros válidos de {len(rows)} filas")
    _upsert_supabase("ig_daily", records, "date_str")

# ─────────────────────────────────────────────
# SYNC — Instagram reels (ig_reels)
# ─────────────────────────────────────────────

def sync_ig_reels(from_date: str, to_date: str):
    """
    Métricas: IGRE01=date, IGRE03=content, IGRE06=url, IGRE07=comments,
              IGRE08=engagement, IGRE09=interactions, IGRE10=likes,
              IGRE11=reach, IGRE12=saved, IGRE23=views
    Columnas: [date, content, url, comments, engagement, interactions,
               likes, reach, saved, views]
    Ignorar filas sin URL (r[2] vacío)
    """
    metrics = ["IGRE01", "IGRE03", "IGRE06", "IGRE07", "IGRE08",
               "IGRE09", "IGRE10", "IGRE11", "IGRE12", "IGRE23"]
    rows = _call_metricool("instagram", "reels", metrics, from_date, to_date)

    records = []
    for r in rows:
        if not r or not r[2]:   # url requerida
            continue
        date_str, year, month, _ = _parse_date_str(r[0])
        if not year:
            continue
        records.append({
            "url":          str(r[2]),
            "date_str":     date_str,
            "year":         year,
            "month":        month,
            "content":      str(r[1] or "")[:2000],
            "comments":     _safe_float(r[3]),
            "engagement":   _safe_float(r[4]),
            "interactions": _safe_float(r[5]),
            "likes":        _safe_float(r[6]),
            "reach":        _safe_float(r[7]),
            "saved":        _safe_float(r[8]),
            "views":        _safe_float(r[9]),
            "updated_at":   NOW.isoformat(),
        })

    log.info(f"     ig_reels: {len(records)} registros válidos de {len(rows)} filas")
    _upsert_supabase("ig_reels", records, "url")

# ─────────────────────────────────────────────
# SYNC — Facebook daily (fb_daily)
# ─────────────────────────────────────────────

def sync_fb_daily(from_date: str, to_date: str):
    """
    Métricas: FBEV17=followers, FBEV03=page_views, FBEV49=page_media_view,
              FBEV47=followers_acquired, FBEV48=followers_lost, [date]
    Columnas: [followers, page_views, page_media_view,
               followers_acquired, followers_lost, date]
    Ignorar filas donde r[0]==None o r[5] no tiene 8 dígitos
    """
    metrics = ["FBEV17", "FBEV03", "FBEV49", "FBEV47", "FBEV48"]
    rows    = _call_metricool("facebook", "evolution", metrics, from_date, to_date)

    records = []
    for r in rows:
        if not r or r[0] is None:
            continue
        date_raw = r[5] if len(r) > 5 else ""
        date_str, year, month, day = _parse_date_str(date_raw)
        if not year:
            continue
        records.append({
            "date_str":           date_str,
            "year":               year,
            "month":              month,
            "day":                day,
            "followers":          _safe_float(r[0]),
            "page_views":         _safe_float(r[1]),
            "page_media_view":    _safe_float(r[2]),
            "followers_acquired": _safe_float(r[3]),
            "followers_lost":     _safe_float(r[4]),
            "updated_at":         NOW.isoformat(),
        })

    log.info(f"     fb_daily: {len(records)} registros válidos de {len(rows)} filas")
    _upsert_supabase("fb_daily", records, "date_str")

# ─────────────────────────────────────────────
# SYNC — TikTok daily (tk_daily)
# ─────────────────────────────────────────────

def sync_tk_daily(from_date: str, to_date: str):
    """
    Métricas: TKEV07=followers, TKEV12=account_views, TKEV11=reach,
              TKEV06=interactions, TKEV01=videos, TKEV08=new_followers,
              TKEV09=profile_views, [date]
    Columnas: [followers, account_views, reach, interactions, videos,
               new_followers, profile_views, date]
    Ignorar filas donde r[0]==None o r[7] no tiene 8 dígitos
    """
    metrics = ["TKEV07", "TKEV12", "TKEV11", "TKEV06", "TKEV01", "TKEV08", "TKEV09"]
    rows    = _call_metricool("tiktok", "evolution", metrics, from_date, to_date)

    records = []
    for r in rows:
        if not r or r[0] is None:
            continue
        date_raw = r[7] if len(r) > 7 else ""
        date_str, year, month, day = _parse_date_str(date_raw)
        if not year:
            continue
        records.append({
            "date_str":      date_str,
            "year":          year,
            "month":         month,
            "day":           day,
            "followers":     _safe_float(r[0]),
            "account_views": _safe_float(r[1]),
            "reach":         _safe_float(r[2]),
            "interactions":  _safe_float(r[3]),
            "videos":        _safe_float(r[4]),
            "new_followers": _safe_float(r[5]),
            "profile_views": _safe_float(r[6]),
            "updated_at":    NOW.isoformat(),
        })

    log.info(f"     tk_daily: {len(records)} registros válidos de {len(rows)} filas")
    _upsert_supabase("tk_daily", records, "date_str")

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    if not METRICOOL_TOKEN:
        log.error("METRICOOL_TOKEN no está definido. Abortando.")
        raise SystemExit(1)

    log.info("=" * 60)
    log.info("  BVS Analytics — Social Media Sync v1.0")
    log.info(f"  {NOW.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    log.info(f"  Brand ID: {METRICOOL_BRAND_ID}")
    log.info("=" * 60)

    to_date, from_60, from_180 = _date_ranges()
    log.info(f"\n  Período evolución: {from_60[:10]} → {to_date[:10]} (60 días)")
    log.info(f"  Período reels:     {from_180[:10]} → {to_date[:10]} (180 días)")

    log.info("\n[1/4] Instagram — evolución diaria (ig_daily)...")
    sync_ig_daily(from_60, to_date)

    log.info("\n[2/4] Instagram — reels individuales (ig_reels)...")
    sync_ig_reels(from_180, to_date)

    log.info("\n[3/4] Facebook — evolución diaria (fb_daily)...")
    sync_fb_daily(from_60, to_date)

    log.info("\n[4/4] TikTok — evolución diaria (tk_daily)...")
    sync_tk_daily(from_60, to_date)

    log.info("\n" + "=" * 60)
    log.info("  ✅ Sincronización completada — historial acumulado intacto")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
