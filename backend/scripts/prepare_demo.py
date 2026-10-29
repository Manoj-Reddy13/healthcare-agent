from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Build the original frontend in an isolated copy; never edit the original files."""
import argparse,hashlib,json,os,shutil,subprocess
from pathlib import Path
from app.services.demo_data_service import build_demo_database

ROOT=BACKEND_ROOT
def prepare(frontend=None,output=None):
    frontend=Path(frontend or ROOT.parent/'frontend').resolve()
    output=Path(output or ROOT/'.local'/'demo-ui').resolve()
    if not (frontend/'package-lock.json').is_file():raise ValueError('Original frontend and package-lock.json are required')
    files=[p for p in frontend.rglob('*') if p.is_file() and not any(x in p.relative_to(frontend).parts for x in ['node_modules','dist','.git']) and not p.name.startswith('.env')]
    digest=hashlib.sha256()
    for path in sorted(files):digest.update(str(path.relative_to(frontend)).encode()+b'\0'+path.read_bytes()+b'\0')
    fingerprint=digest.hexdigest();manifest=output/'demo-build.json'
    if output.exists():
        if not manifest.exists():raise ValueError('Existing output has no build receipt; choose a new --output folder')
        receipt=json.loads(manifest.read_text())
        if receipt['source_fingerprint']!=fingerprint:raise ValueError('Frontend changed; use a new --output folder')
        if not (output/'dist'/'index.html').is_file():raise ValueError('Prepared frontend output is missing')
        return receipt
    output.mkdir(parents=True,exist_ok=False)
    for path in files:
        dest=output/path.relative_to(frontend);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,dest)
    npm=shutil.which('npm.cmd') or shutil.which('npm')
    if npm is None:raise ValueError('Node.js and npm are required')
    env=dict(os.environ,VITE_API_BASE_URL='.',VITE_USE_MOCK='false')
    for args in [['ci','--ignore-scripts','--no-audit','--no-fund'],['run','build']]:
        process=subprocess.run([npm,*args],cwd=output,env=env,timeout=300)
        if process.returncode:raise RuntimeError('Original frontend build failed in the isolated copy')
    receipt={'source_fingerprint':fingerprint,'original_frontend_files_modified':False,'api_base':'.','frontend_mock_fallback_forced':False,'build':'passed','source_files_copied':len(files)}
    manifest.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    return receipt

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--frontend',type=Path);parser.add_argument('--output',type=Path)
    args=parser.parse_args();build_demo_database();print(json.dumps(prepare(args.frontend,args.output),indent=2))
