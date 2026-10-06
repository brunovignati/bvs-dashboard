"""
BVS Analytics — Crea los exports de Data Explorer en Connectif vía API.

Antes, los exports se creaban a mano en la UI de Connectif y el sync solo
descargaba "lo que hubiera". Este script los crea solo, cada semana, para que
sync_connectif_to_supabase.py tenga siempre datos frescos.

API: POST https://api.connectif.cloud/exports/type/data-explorer
     body {"delimiter": ",", "filters": {"reportId", "fromDate", "toDate"}}
     Límite: el rango fromDate–toDate no puede superar 31 días.

Por eso se crean DOS exports por informe:
  1. Mes anterior completo  (día 1 → último día)   → cierra el mes pasado
  2. Mes en curso hasta hoy (día 1 → hoy)          → avanza el mes actual
Ambos caben en 31 días y, al hacer upsert por (year, month[, day]), el mes
cerrado queda definitivo y el mes en curso se va sobrescribiendo cada semana.

Variables de entorno: CONNECTIF_API_KEY (secreto del repo, obligatorio).
"""

import os
import sys
import time
import calendar
import logging
from datetime import date, timedelta

import requests

CONNECTIF_API_KEY = os.environ.get("CONNECTIF_API_KEY", "")
if not CONNECTIF_API_KEY:
    print("Falta la variable CONNECTIF_API_KEY (secreto del repo).")
    sys.exit(1)
BASE = "https://api.connectif.cloud"
HEADERS = {"Authorization": f"apiKey {CONNECTIF_API_KEY}", "Content-Type": "application/json"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("bvs-exports")

# Informes de Data Explorer (store 60c9e5f286eea5ff392487f3). IDs leídos de la UI el 2026-10-06.
# clave = nombre tal y como aparece en Connectif; valor = reportId
REPORTS = {
    "V! Ventas Diarias":                              "6a393bd445d5668a52fcf7fb",
    "V! Email Diario":                                "6a393e1045d5668a52fd9594",
    "V! Push Diario":                                 "6a3943e945d5668a52ff42b5",
    "V! Contenido Web Diario":                        "6a39450745d5668a52ff90bf",
    "V! Compradores por Origen":                      "6a4cc470a51a052948591435",
    "Informe de compras mensual de nutraceúticos BVS": "6a032974c35f2ee526569182",
    "Sticky":                                         "69c2472808d66e46cb7d96ad",
    "v! Compradores mensuales de la Marca BVS":       "698384983f3617fb297eaaa2",
    "V! Evolutivo suscritos (Looker)":                "67eb9249be76ca1aac769e3d",
    "V! Envíos/Día":                                  "67cff58bf510fd1692c18874",
    "V! Métricas PUSH DS (Looker)":                   "67b598b10c57a65bf5ab7e1e",
    "V! Ventas Push":                                 "67979330d9db8180adc0b317",
    "V! Rendimiento push":                            "67979275d9db8180adc09453",
    "V! Carrito":                                     "678a0c19159c1febb323192c",
    "V! Primerizos VS. Recurrentes":                  "677eb5251fbd3645a8f304dc",
    "V! Métricas looker":                             "677eac5d1fbd3645a8f198fe",
    "V! Evolución de suscriptores push":              "67779b75a9907a7cf6f9ff68",
}

POLL_SECONDS = 10
TIMEOUT_SECONDS = 20 * 60


def windows(today: date):
    """Dos ventanas ≤ 31 días: mes anterior completo y mes en curso hasta hoy."""
    first_cur = today.replace(day=1)
    last_prev = first_cur - timedelta(days=1)
    first_prev = last_prev.replace(day=1)
    return [(first_prev, last_prev), (first_cur, today)]


def create_export(report_id, d_from, d_to):
    body = {"delimiter": ",", "filters": {"reportId": report_id,
                                          "fromDate": d_from.isoformat(), "toDate": d_to.isoformat()}}
    for attempt in range(5):
        r = requests.post(f"{BASE}/exports/type/data-explorer", headers=HEADERS, json=body, timeout=30)
        if r.status_code == 429:
            wait = 15 * (attempt + 1)
            log.warning(f"    429 rate limit, espero {wait}s")
            time.sleep(wait)
            continue
        if r.status_code not in (200, 201):
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:300]}")
        return r.json()
    raise RuntimeError("rate limit persistente")


def wait_all(ids):
    pending = set(ids)
    t0 = time.time()
    while pending and time.time() - t0 < TIMEOUT_SECONDS:
        for eid in list(pending):
            r = requests.get(f"{BASE}/exports/{eid}", headers=HEADERS, timeout=30)
            if r.status_code == 429:
                time.sleep(15)
                continue
            if r.status_code != 200:
                log.warning(f"    {eid}: HTTP {r.status_code}")
                continue
            st = r.json().get("status")
            if st == "finished":
                pending.discard(eid)
            elif st in ("error", "failed", "cancelled"):
                log.error(f"    export {eid} terminó en estado {st}")
                pending.discard(eid)
            time.sleep(0.3)
        if pending:
            log.info(f"  esperando {len(pending)} exports...")
            time.sleep(POLL_SECONDS)
    return pending


def main():
    today = date.today()
    log.info("=" * 60)
    log.info("  Creando exports Data Explorer en Connectif")
    for a, b in windows(today):
        log.info(f"  ventana {a} → {b} ({(b - a).days + 1} días)")
    log.info("=" * 60)

    created, failed = [], []
    for name, rid in REPORTS.items():
        for d_from, d_to in windows(today):
            try:
                exp = create_export(rid, d_from, d_to)
                created.append(exp["id"])
                log.info(f"  ✓ {name} [{d_from}→{d_to}] → {exp['id']}")
            except Exception as e:
                failed.append((name, d_from, d_to, str(e)))
                log.error(f"  ✗ {name} [{d_from}→{d_to}]: {e}")
            time.sleep(0.5)

    log.info(f"\n  {len(created)} exports creados, {len(failed)} fallos. Esperando a que terminen...")
    still = wait_all(created)
    if still:
        log.warning(f"  {len(still)} exports no terminaron a tiempo: {sorted(still)}")

    if failed and not created:
        log.error("  Ningún export creado — abortando")
        sys.exit(1)
    if failed:
        log.warning("  Fallos parciales (el sync seguirá con lo disponible):")
        for f in failed:
            log.warning(f"    {f}")
    log.info("  Listo.")


if __name__ == "__main__":
    main()
