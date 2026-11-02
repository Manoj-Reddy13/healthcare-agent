import csv
import sqlite3
from collections import Counter
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BACKEND_DIR / "app" / "data" / "hospital.csv"
if not CSV_PATH.exists():
    CSV_PATH = BACKEND_DIR.parent / "data" / "hospital.csv"
DB_PATH = BACKEND_DIR / "app" / "data" / "hospital_directory.sqlite"

def generate_report():
    print(f"Reading CSV: {CSV_PATH}")
    csv_states = Counter()
    missing_state_csv = 0
    duplicate_rows_csv = 0
    seen_csv_hashes = set()
    total_csv = 0

    with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for r in reader:
            total_csv += 1
            st = (r.get('State') or '').strip()
            name = (r.get('Hospital_Name') or '').strip()
            dist = (r.get('District') or '').strip()
            pin = (r.get('Pincode') or '').strip()
            addr = (r.get('Address_Original_First_Line') or '').strip()

            if not st:
                missing_state_csv += 1
            else:
                csv_states[st] += 1

            row_key = f"{name.lower()}|{st.lower()}|{dist.lower()}|{pin}|{addr.lower()}"
            if row_key in seen_csv_hashes:
                duplicate_rows_csv += 1
            else:
                seen_csv_hashes.add(row_key)

    print(f"Reading DB: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM hospitals")
    total_db = cur.fetchone()[0]

    cur.execute("SELECT state, COUNT(*) FROM hospitals GROUP BY state")
    db_states = dict(cur.fetchall())

    cur.execute("SELECT COUNT(*) FROM hospitals WHERE state IS NULL OR state = ''")
    missing_state_db = cur.fetchone()[0]

    cur.execute("SELECT key, value FROM import_metadata")
    meta = dict(cur.fetchall())
    conn.close()

    all_states = sorted(set(csv_states.keys()) | set(db_states.keys()))

    print("\n" + "="*80)
    print("CARENAV AI — HOSPITAL DIRECTORY DATA INTEGRITY DIAGNOSTIC REPORT")
    print("="*80)
    print(f"Total CSV Records:            {total_csv:,}")
    print(f"Successfully Imported Records:{int(meta.get('successfully_imported_records', total_db)):,}")
    print(f"Total Database Records:       {total_db:,}")
    print(f"Missing State Records (CSV):  {missing_state_csv}")
    print(f"Missing State Records (DB):   {missing_state_db}")
    print(f"Exact Duplicate CSV Records:  {duplicate_rows_csv}")
    print(f"Distinct States in CSV:       {len(csv_states)}")
    print(f"Distinct States in Database:  {len(db_states)}")
    print("="*80)

    print(f"\n| {'State':<32} | {'CSV Records':>12} | {'Imported':>12} | {'Database Records':>16} | {'Status':>8} |")
    print(f"|{'-'*34}|{'-'*14}|{'-'*14}|{'-'*18}|{'-'*10}|")

    match_count = 0
    for st in all_states:
        c_cnt = csv_states.get(st, 0)
        d_cnt = db_states.get(st, 0)
        status = "MATCH" if c_cnt == d_cnt else "MISMATCH"
        if status == "MATCH":
            match_count += 1
        print(f"| {st:<32} | {c_cnt:>12} | {d_cnt:>12} | {d_cnt:>16} | {status:>8} |")

    print(f"\nState Integrity Verification: {match_count}/{len(all_states)} states exactly matched.")

if __name__ == '__main__':
    generate_report()

