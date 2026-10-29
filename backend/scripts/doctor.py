from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Read-only local setup diagnostics for the extension."""
import importlib.util,json,os,sqlite3,sys
from contextlib import closing
from pathlib import Path
ROOT=BACKEND_ROOT
def diagnose():
    checks=[{'check':'Python 3.10+','passed':sys.version_info>=(3,10)}]
    for module in ['fastapi','uvicorn','pydantic','httpx','dotenv']:
        checks.append({'check':'Dependency '+module,'passed':importlib.util.find_spec(module) is not None})
    backend=Path(os.getenv('HEALTHCARE_ORIGINAL_BACKEND',ROOT))
    checks.append({'check':'Original backend present','passed':(backend/'app'/'main.py').is_file()})
    database=Path(os.getenv('MEMBER3_DATABASE',ROOT/'.local'/'healthcare-directory-v3.sqlite')).resolve()
    try:
        with closing(sqlite3.connect(database.as_uri()+'?mode=ro',uri=True)) as con:
            integrity=con.execute('PRAGMA integrity_check').fetchone()[0]
            fk=con.execute('PRAGMA foreign_key_check').fetchall()
            counts={table:con.execute('SELECT count(*) FROM '+table).fetchone()[0] for table in ['hospitals','directory_specialties_v3','tariffs']}
        checks.append({'check':'Local snapshot integrity and relationships','passed':integrity=='ok' and not fk})
    except sqlite3.Error:
        counts={};checks.append({'check':'Local snapshot exists and is compatible; run rebuild.py','passed':False})
    return {'ready':all(c['passed'] for c in checks),'checks':checks,'database_counts':counts,'sourced_ui_agent_connection_complete':False,'data_collection_complete':False}
if __name__=='__main__':
    report=diagnose();print(json.dumps(report,indent=2));sys.exit(0 if report['ready'] else 1)
