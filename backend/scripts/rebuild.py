from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Rebuild local snapshots from bundled JSON without replacing prior snapshots."""
import json
import sqlite3
from contextlib import closing
from pathlib import Path
from app.services.data_store import import_bundle,require
from app.services.directory_service import add_directory

ROOT=BACKEND_ROOT
def rebuild(output=None):
    output=Path(output or ROOT/'.local').resolve()
    output.mkdir(parents=True,exist_ok=True)
    base=output/'healthcare-pilot.sqlite';directory=output/'healthcare-directory-v3.sqlite'
    imported=import_bundle(DATA_ROOT,base)
    expected=json.loads((DATA_ROOT/'hospital-specialties-v3.json').read_text(encoding='utf-8'))
    if directory.exists():
        with closing(sqlite3.connect(directory.as_uri()+'?mode=ro',uri=True)) as con:
            actual=[json.loads(r[0]) for r in con.execute('SELECT payload FROM directory_specialties_v3')]
            fingerprint=con.execute("SELECT value FROM metadata WHERE key='fingerprint'").fetchone()[0]
            require(fingerprint==imported['fingerprint'],'Directory snapshot has different source data; choose a new output folder')
        normalize=lambda rows:sorted(json.dumps(r,sort_keys=True) for r in rows)
        require(normalize(expected)==normalize(actual),'Directory sources changed; choose a new output folder')
        status='already_built'
    else:add_directory(base,directory,expected);status='built'
    return {'status':status,'base':str(base),'directory':str(directory),'source_fingerprint':imported['fingerprint']}

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path)
    print(json.dumps(rebuild(parser.parse_args().output),indent=2))
