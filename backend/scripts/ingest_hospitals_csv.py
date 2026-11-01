import csv
import json
import os
import re
import sqlite3
import sys
import hashlib
from datetime import datetime
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BACKEND_DIR / "app" / "data" / "hospital.csv"
DB_PATH = BACKEND_DIR / "app" / "data" / "hospital_directory.sqlite"

def clean_val(val):
    if val is None:
        return None
    val = str(val).strip()
    if val in ('0', '0.0', '', 'NA', 'N/A', 'None', 'null', 'NONE', 'na'):
        return None
    return val

def parse_coords(val):
    val = clean_val(val)
    if not val:
        return None, None
    parts = val.split(',')
    if len(parts) == 2:
        try:
            lat = float(parts[0].strip())
            lng = float(parts[1].strip())
            if -90 <= lat <= 90 and -180 <= lng <= 180 and not (lat == 0 and lng == 0):
                return lat, lng
        except ValueError:
            pass
    return None, None

def parse_specialties(val):
    val = clean_val(val)
    if not val:
        return []
    # Replace newlines and extra punctuation
    clean_text = val.replace('\\n', ' ').replace('\n', ' ').replace('\r', ' ')
    parts = [re.sub(r'^[,\s\-•]+', '', p).strip() for p in re.split(r'[,;/]', clean_text) if p.strip()]
    specs = []
    seen = set()
    for p in parts:
        p_clean = ' '.join(p.split())
        if len(p_clean) > 2 and p_clean.lower() not in seen and p_clean != '0':
            seen.add(p_clean.lower())
            specs.append(p_clean)
    return specs

def parse_facilities(val):
    val = clean_val(val)
    if not val:
        return []
    clean_text = val.replace('\\n', ' ').replace('\n', ' ').replace('\r', ' ')
    parts = [re.sub(r'^[,\s\-•]+', '', p).strip() for p in re.split(r'[,;/]', clean_text) if p.strip()]
    facs = []
    seen = set()
    for p in parts:
        p_clean = ' '.join(p.split())
        if len(p_clean) > 2 and p_clean.lower() not in seen and p_clean != '0':
            seen.add(p_clean.lower())
            facs.append(p_clean)
    return facs

def ingest():
    print(f"Reading CSV from {CSV_PATH}...")
    if not CSV_PATH.is_file():
        raise FileNotFoundError(f"CSV not found at {CSV_PATH}")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Create tables
    cur.execute("""
    CREATE TABLE IF NOT EXISTS hospitals (
        id TEXT PRIMARY KEY,
        sr_no INTEGER,
        name TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        subdistrict TEXT,
        pincode TEXT,
        location TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        care_type TEXT,
        category TEXT,
        discipline TEXT,
        telephone TEXT,
        mobile_number TEXT,
        emergency_num TEXT,
        ambulance_phone TEXT,
        bloodbank_phone TEXT,
        tollfree TEXT,
        helpline TEXT,
        email TEXT,
        website TEXT,
        specialties TEXT,
        facilities TEXT,
        accreditation TEXT,
        established_year INTEGER,
        total_beds INTEGER,
        data_source TEXT,
        import_date TEXT,
        dedup_hash TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS import_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)

    # Indexes
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_state ON hospitals(state);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_district ON hospitals(district);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_pincode ON hospitals(pincode);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_care_type ON hospitals(care_type);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_category ON hospitals(category);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_name ON hospitals(name);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hosp_dedup ON hospitals(dedup_hash);")

    # Read CSV
    total_csv_records = 0
    duplicate_records = 0
    invalid_records = 0
    imported_records = 0
    updated_records = 0

    seen_hashes = set()
    import_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Load existing dedup hashes from DB if any
    cur.execute("SELECT dedup_hash FROM hospitals WHERE dedup_hash IS NOT NULL")
    for row in cur.fetchall():
        seen_hashes.add(row[0])

    batch = []
    with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for r in reader:
            total_csv_records += 1
            name = clean_val(r.get('Hospital_Name'))
            state = clean_val(r.get('State'))
            district = clean_val(r.get('District')) or "Not specified"

            if not name or not state:
                invalid_records += 1
                continue

            sr_no = int(r.get('Sr_No', 0)) if clean_val(r.get('Sr_No')) else total_csv_records
            hosp_id = f"nhp-{sr_no}"

            pin = clean_val(r.get('Pincode'))
            addr = clean_val(r.get('Address_Original_First_Line')) or clean_val(r.get('Location'))
            loc = clean_val(r.get('Location'))
            subdistrict = clean_val(r.get('Subdistrict'))

            # Check duplicate hash (Name + State + District + Pincode + Address)
            hash_str = f"{name.lower()}|{state.lower()}|{district.lower()}|{pin or ''}|{addr or ''}"
            dedup_hash = hashlib.sha256(hash_str.encode('utf-8')).hexdigest()

            if dedup_hash in seen_hashes:
                duplicate_records += 1
            else:
                seen_hashes.add(dedup_hash)

            lat, lng = parse_coords(r.get('Location_Coordinates'))
            care_type = clean_val(r.get('Hospital_Care_Type')) or "Not available"
            category = clean_val(r.get('Hospital_Category')) or "Not available"
            discipline = clean_val(r.get('Discipline_Systems_of_Medicine')) or "Not available"
            phone = clean_val(r.get('Telephone'))
            mobile = clean_val(r.get('Mobile_Number'))
            emergency = clean_val(r.get('Emergency_Num'))
            ambulance = clean_val(r.get('Ambulance_Phone_No'))
            bloodbank = clean_val(r.get('Bloodbank_Phone_No'))
            tollfree = clean_val(r.get('Tollfree'))
            helpline = clean_val(r.get('Helpline'))
            email = clean_val(r.get('Hospital_Primary_Email_Id'))
            website = clean_val(r.get('Website'))

            specs = parse_specialties(r.get('Specialties'))
            facs = parse_facilities(r.get('Facilities'))
            accreditation = clean_val(r.get('Accreditation')) or "Not available"

            est_year = None
            if clean_val(r.get('Establised_Year')):
                try:
                    est_year = int(float(r['Establised_Year']))
                except ValueError:
                    pass

            beds = None
            if clean_val(r.get('Total_Num_Beds')):
                try:
                    beds = int(float(r['Total_Num_Beds']))
                except ValueError:
                    pass

            data_source = "National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)"

            batch.append((
                hosp_id,
                sr_no,
                name,
                state,
                district,
                subdistrict,
                pin,
                loc,
                addr,
                lat,
                lng,
                care_type,
                category,
                discipline,
                phone,
                mobile,
                emergency,
                ambulance,
                bloodbank,
                tollfree,
                helpline,
                email,
                website,
                json.dumps(specs),
                json.dumps(facs),
                accreditation,
                est_year,
                beds,
                data_source,
                import_date,
                dedup_hash
            ))

            if len(batch) >= 2000:
                cur.executemany("""
                INSERT OR REPLACE INTO hospitals (
                    id, sr_no, name, state, district, subdistrict, pincode, location, address,
                    latitude, longitude, care_type, category, discipline, telephone, mobile_number,
                    emergency_num, ambulance_phone, bloodbank_phone, tollfree, helpline, email,
                    website, specialties, facilities, accreditation, established_year, total_beds,
                    data_source, import_date, dedup_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, batch)
                conn.commit()
                imported_records += len(batch)
                batch = []
                print(f"Processed {imported_records} records...")

    if batch:
        cur.executemany("""
        INSERT OR REPLACE INTO hospitals (
            id, sr_no, name, state, district, subdistrict, pincode, location, address,
            latitude, longitude, care_type, category, discipline, telephone, mobile_number,
            emergency_num, ambulance_phone, bloodbank_phone, tollfree, helpline, email,
            website, specialties, facilities, accreditation, established_year, total_beds,
            data_source, import_date, dedup_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, batch)
        conn.commit()
        imported_records += len(batch)

    # Store metadata
    metadata = {
        "source_file": "data/hospital.csv",
        "publisher": "Ministry of Health and Family Welfare (MoHFW) / National Health Portal (NHP)",
        "total_csv_records": total_csv_records,
        "successfully_imported_records": imported_records,
        "duplicate_records_detected": duplicate_records,
        "invalid_records": invalid_records,
        "import_timestamp": import_date,
        "status": "active"
    }

    for k, v in metadata.items():
        cur.execute("INSERT OR REPLACE INTO import_metadata (key, value) VALUES (?, ?);", (k, str(v)))
    conn.commit()
    conn.close()

    print("\n=== Ingestion Complete ===")
    print(f"Total CSV records: {total_csv_records}")
    print(f"Successfully imported: {imported_records}")
    print(f"Duplicate records handled: {duplicate_records}")
    print(f"Invalid records skipped: {invalid_records}")
    print(f"Database saved to: {DB_PATH}")

if __name__ == '__main__':
    ingest()
