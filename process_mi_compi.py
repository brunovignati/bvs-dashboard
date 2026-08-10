"""
Process Connectif contacts export CSV to extract Mi Compi registrations
and output JSON ready for Supabase upsert.
"""
import csv
import json
import sys
from datetime import datetime

csv.field_size_limit(sys.maxsize)

CSV_PATH = "mi_compi_export/export-contacts-e0e15c4e-5dbe-4600-8f54-13a1daf00d17.csv"
OUTPUT_PATH = "mi_compi_records.json"


def get_field(row, name):
    """Get field value, trying exact match first."""
    val = row.get(name, "")
    return (val or "").strip()


def parse_array(val):
    """Parse comma/semicolon/pipe-separated or JSON array."""
    if not val:
        return []
    val = val.strip()
    if val.startswith("["):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, ValueError):
            pass
    # Try pipe first (Connectif uses pipe for multi-value fields)
    if "|" in val:
        return [v.strip() for v in val.split("|") if v.strip()]
    sep = ";" if ";" in val else ","
    return [v.strip() for v in val.split(sep) if v.strip()]


def parse_date(val):
    """Parse date to YYYY-MM-DD or None."""
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S.%f"):
        try:
            return datetime.strptime(val.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def transform_contact(row):
    """Transform a CSV row into a Supabase record. Returns None if no Mi Compi data."""
    nombre_1 = get_field(row, "Nombre Mascota 1")
    if not nombre_1:
        return None

    email = get_field(row, "Email")
    if not email:
        return None

    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    record = {
        "email": email.lower().strip(),
        "last_synced": now_iso,
    }

    # Connectif updatedAt
    val = get_field(row, "Last update date")
    if val:
        record["connectif_updated_at"] = val

    # ── Slot 1 (full detail) ──
    record["nombre_1"] = nombre_1
    record["especie_1"] = get_field(row, "Tipo de Mascota 1") or None
    record["raza_1"] = get_field(row, "Raza Perro 1") or get_field(row, "Raza Gato 1") or None
    record["sexo_1"] = get_field(row, "Sexo Mascota 1") or None

    nac = get_field(row, "Fecha de Nacimiento Mascota 1")
    record["nacimiento_1"] = parse_date(nac)

    record["talla_peso_1"] = (get_field(row, "Tamaño-Peso Perro 1") or
                               get_field(row, "Tamaño-Peso Gato 1") or None)
    record["esterilizado_1"] = get_field(row, "Estado Reproductivo Mascota 1") or None
    record["actividad_1"] = get_field(row, "Nivel de Actividad Mascota 1") or None
    record["pelaje_1"] = get_field(row, "Pelaje Mascota 1") or None
    record["color_pelaje_1"] = get_field(row, "Color Pelaje Mascota 1") or None

    alergias = parse_array(get_field(row, "Alergia-mascota-1"))
    if alergias:
        record["alergias_1"] = alergias
    enfermedades = parse_array(get_field(row, "Enfermedad Mascota 1"))
    if enfermedades:
        record["enfermedades_1"] = enfermedades

    # ── Slots 2-4 (basic) ──
    for slot in range(2, 5):
        nombre = get_field(row, f"Nombre Mascota {slot}")
        if not nombre:
            continue
        record[f"nombre_{slot}"] = nombre
        record[f"especie_{slot}"] = get_field(row, f"Tipo de Mascota {slot}") or None
        record[f"raza_{slot}"] = (
            get_field(row, f"Raza Perro {slot}") or
            get_field(row, f"Raza Gato {slot}") or None
        )
        record[f"sexo_{slot}"] = get_field(row, f"Sexo Mascota {slot}") or None
        nac = get_field(row, f"Fecha de Nacimiento Mascota {slot}")
        record[f"nacimiento_{slot}"] = parse_date(nac)

    # Clean None values
    return {k: v for k, v in record.items() if v is not None}


def main():
    records = []
    total = 0
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            record = transform_contact(row)
            if record:
                records.append(record)
            if total % 200000 == 0:
                print(f"  Scanned {total:,}... {len(records)} Mi Compi", flush=True)

    print(f"\nTotal contacts scanned: {total:,}")
    print(f"Mi Compi registrations: {len(records)}")

    if records:
        # Stats
        species = {}
        for r in records:
            sp = r.get("especie_1", "Sin especie")
            species[sp] = species.get(sp, 0) + 1
        print("\nDesglose por especie (compi 1):")
        for sp, n in sorted(species.items(), key=lambda x: -x[1]):
            print(f"  {sp}: {n}")
        multi = sum(1 for r in records if r.get("nombre_2"))
        print(f"Con 2+ compis: {multi}")

        # Save
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {OUTPUT_PATH}")

        # Print first record as sample
        print("\nSample record:")
        print(json.dumps(records[0], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
