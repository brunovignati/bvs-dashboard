"""
BVS Analytics â Sync Mi Compi registrations: Connectif â Supabase

Crea un export de contactos en Connectif, lo descarga, filtra los contactos
con datos Mi Compi (nombre-mascota-1 relleno), y hace upsert en la tabla
mi_compi_registrations de Supabase.

Corre vÃ­a GitHub Actions (cada 6h) o manualmente.
"""

import requests
import zipfile
import io
import csv
import json
import re
import time
import logging
import os
from datetime import datetime

# ââ ConfiguraciÃ³n ââââââââââââââââââââââââââââââââââââââââââââ
CONNECTIF_API_KEY  = os.environ["CONNECTIF_API_KEY"]
CONNECTIF_BASE_URL = "https://api.connectif.cloud"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CONNECTIF_HEADERS = {"Authorization": f"apiKey {CONNECTIF_API_KEY}"}
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

POLL_INTERVAL = 30   # seconds
MAX_WAIT      = 1800 # 30 min

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("mi-compi-sync")


# ââ Connectif helpers ââââââââââââââââââââââââââââââââââââââââ

def create_contacts_export():
    """Create a contacts export. Returns export ID."""
    resp = requests.post(
        f"{CONNECTIF_BASE_URL}/exports/",
        headers={**CONNECTIF_HEADERS, "Content-Type": "application/json"},
        json={"exportType": "contacts", "delimiter": ",", "dateFormat": "ISO", "version": "v6"},
        timeout=30,
    )
    if resp.status_code not in (200, 201):
        raise Exception(f"Create export failed: {resp.status_code} â {resp.text[:300]}")
    data = resp.json()
    export_id = data.get("id")
    log.info(f"Export creado: {export_id}")
    return export_id


def wait_for_export(export_id):
    """Poll until export finishes. Returns fileUrl."""
    elapsed = 0
    while elapsed < MAX_WAIT:
        resp = requests.get(
            f"{CONNECTIF_BASE_URL}/exports/{export_id}",
            headers=CONNECTIF_HEADERS, timeout=30,
        )
        data = resp.json()
        status = data.get("status", "unknown")
        progress = data.get("progress", 0)
        total = data.get("total", "?")
        log.info(f"  Export {export_id}: {status} ({progress}/{total})")

        if status == "finished":
            url = data.get("fileUrl")
            if not url:
                raise Exception("Export finished but no fileUrl")
            return url

        if status == "error":
            raise Exception(f"Export error: {data}")

        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

    raise Exception(f"Export timed out ({MAX_WAIT}s)")


def download_export(file_url):
    """Download and parse export CSV (inside a ZIP). Returns list of dicts."""
    log.info("Descargando export...")
    resp = requests.get(file_url, timeout=120)
    if resp.status_code != 200:
        raise Exception(f"Download error: {resp.status_code}")

    content_type = resp.headers.get("Content-Type", "")
    raw = resp.content

    # Connectif exports come as ZIP containing a CSV
    if file_url.endswith(".zip") or "zip" in content_type or raw[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            csv_names = [n for n in z.namelist() if n.lower().endswith(".csv")]
            fname = csv_names[0] if csv_names else z.namelist()[0]
            with z.open(fname) as f:
                text = f.read().decode("utf-8-sig")
    else:
        text = raw.decode("utf-8-sig")

    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines = [l for l in lines if l.strip()]
    if not lines:
        return []
    reader = csv.DictReader(lines)
    rows = list(reader)
    log.info(f"  {len(rows)} contactos descargados")
    return rows


# ââ Transform ââââââââââââââââââââââââââââââââââââââââââââââââ

def get_field(row, field_name):
    """Get a field value, trying original and normalized headers."""
    if field_name in row:
        return (row[field_name] or "").strip()
    norm = field_name.lower().replace(" ", "-")
    for key in row:
        if key.lower().replace(" ", "-") == norm:
            return (row[key] or "").strip()
    return ""


def parse_array(val):
    """Parse comma/semicolon-separated or JSON array."""
    if not val:
        return []
    val = val.strip()
    if val.startswith("["):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, ValueError):
            pass
    sep = ";" if ";" in val else ","
    return [v.strip() for v in val.split(sep) if v.strip()]


def parse_date(val):
    """Parse date to YYYY-MM-DD or None."""
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.strptime(val.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def transform_contact(row):
    """Transform a CSV row into a Supabase record. Returns None if no Mi Compi data."""
    nombre_1 = get_field(row, "nombre-mascota-1")
    if not nombre_1:
        return None

    email = get_field(row, "email") or get_field(row, "Email")
    if not email:
        return None

    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    record = {
        "email": email.lower().strip(),
        "last_synced": now_iso,
    }

    # Connectif updatedAt
    for key in ("updatedAt", "updated_at", "Updated At"):
        val = get_field(row, key)
        if val:
            record["connectif_updated_at"] = val
            break

    # ââ Slot 1 (full detail) ââ
    record["nombre_1"] = nombre_1
    record["especie_1"] = get_field(row, "tipo-de-mascota-1") or None
    record["raza_1"] = get_field(row, "raza-perro-1") or get_field(row, "raza-gato-1") or None
    record["sexo_1"] = get_field(row, "sexo-mascota-1") or None

    nac = get_field(row, "fecha-de-nacimiento-mascota-1")
    record["nacimiento_1"] = parse_date(nac)

    record["talla_peso_1"] = get_field(row, "talla-peso-perro-1") or get_field(row, "talla-peso-gato-1") or None
    record["esterilizado_1"] = get_field(row, "estado-reproductivo-mascota-1") or None
    record["actividad_1"] = get_field(row, "nivel-de-actividad-mascota-1") or None
    record["pelaje_1"] = get_field(row, "pelaje-mascota-1") or None
    record["color_pelaje_1"] = get_field(row, "color-pelaje-mascota-1") or None

    alergias = parse_array(get_field(row, "alergia-mascota-1"))
    if alergias:
        record["alergias_1"] = alergias
    enfermedades = parse_array(get_field(row, "enfermedad-mascota-1"))
    if enfermedades:
        record["enfermedades_1"] = enfermedades

    # ââ Slots 2-4 (basic) ââ
    for slot in range(2, 5):
        nombre = get_field(row, f"nombre-mascota-{slot}")
        if not nombre:
            continue
        record[f"nombre_{slot}"] = nombre
        record[f"especie_{slot}"] = get_field(row, f"tipo-de-mascota-{slot}") or None
        record[f"raza_{slot}"] = (
            get_field(row, f"raza-perro-{slot}") or
            get_field(row, f"raza-gato-{slot}") or None
        )
        record[f"sexo_{slot}"] = get_field(row, f"sexo-mascota-{slot}") or None
        nac = get_field(row, f"fecha-de-nacimiento-mascota-{slot}")
        record[f"nacimiento_{slot}"] = parse_date(nac)

    # Clean None values (Supabase REST API doesn't like explicit None for non-nullable)
    return {k: v for k, v in record.items() if v is not None}


# ââ Supabase upsert ââââââââââââââââââââââââââââââââââââââââââ

def upsert_supabase(records):
    """Upsert records into mi_compi_registrations."""
    table = "mi_compi_registrations"
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict=email"
    batch_size = 500

    for i in range(0, len(records), batch_size):
        chunk = records[i:i+batch_size]
        resp = requests.post(url, headers=SUPABASE_HEADERS, json=chunk, timeout=60)
        if resp.status_code not in (200, 201):
            log.error(f"Upsert error batch {i}: {resp.status_code} â {resp.text[:300]}")
            raise Exception(f"Upsert failed: {resp.status_code}")
        log.info(f"  â Upserted {i+1}â{min(i+batch_size, len(records))}")


# ââ Main âââââââââââââââââââââââââââââââââââââââââââââââââââââ

def main():
    log.info("=" * 60)
    log.info("Mi Compi Sync â Connectif â Supabase")
    log.info("=" * 60)

    # 1. Create export
    export_id = os.environ.get("CONNECTIF_EXPORT_ID") or create_contacts_export()

    # 2. Wait for export
    file_url = wait_for_export(export_id)

    # 3. Download
    contacts = download_export(file_url)

    # 4. Transform
    log.info("Filtrando contactos con datos Mi Compi...")
    records = []
    for row in contacts:
        record = transform_contact(row)
        if record:
            records.append(record)

    log.info(f"â {len(records)} contactos Mi Compi (de {len(contacts)} total)")

    if not records:
        log.info("Sin registros Mi Compi. Fin.")
        return

    # Stats
    species = {}
    for r in records:
        sp = r.get("especie_1", "Sin especie")
        species[sp] = species.get(sp, 0) + 1
    log.info("Desglose por especie (compi 1):")
    for sp, n in sorted(species.items(), key=lambda x: -x[1]):
        log.info(f"  {sp}: {n}")
    multi = sum(1 for r in records if r.get("nombre_2"))
    log.info(f"Con 2+ compis: {multi}")

    # 5. Upsert
    upsert_supabase(records)

    log.info(f"â Sync Mi Compi completo: {len(records)} registros")


if __name__ == "__main__":
    main()
