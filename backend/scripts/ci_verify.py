from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Run the Member 4 backend checks locally or on CI and save reviewable reports."""
import argparse,hashlib,json,os,re,subprocess,sys
from pathlib import Path
from scripts.rebuild import rebuild
from scripts.doctor import diagnose
from app.api.treatment_references import load_guides,coverage
from scripts.compatibility_audit import audit

ROOT=BACKEND_ROOT
BACKEND=ROOT
def source_hashes():
    paths=list((BACKEND/'app').rglob('*.py'))
    paths.extend(p for p in (BACKEND.parent/'frontend'/'src').rglob('*') if p.is_file())
    for path in [BACKEND/'requirements.txt',BACKEND.parent/'frontend'/'package.json']:
        if path.is_file():paths.append(path)
    return {str(p.resolve()):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if '__pycache__' not in p.parts}

def verify(reports):
    reports=Path(reports).resolve();reports.mkdir(parents=True,exist_ok=True)
    before=source_hashes();checks=[]
    def save(name,obj):(reports/name).write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8')
    try:
        save('rebuild.json',rebuild())
        diagnostics=diagnose();save('diagnostics.json',diagnostics)
        checks.append({'check':'Local setup and database','passed':diagnostics['ready']})
        save('coverage.json',coverage(load_guides()))
        compatibility=audit();save('compatibility.json',compatibility)
        # The known UI contract gap is reported, not falsely treated as completed integration.
        for name,cwd,args in [('extension',ROOT,['-m','unittest','discover','-s','tests/data_services','-v']),
                              ('original-backend',BACKEND,['-m','pytest','tests/test_api.py','tests/test_agent.py','tests/test_services.py','-q','-p','no:cacheprovider','--junitxml='+str(reports/'original-backend.xml')])]:
            process=subprocess.run([sys.executable,*args],cwd=cwd,capture_output=True,text=True,timeout=180,
                                   env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'))
            log=process.stdout+'\n'+process.stderr
            (reports/(name+'.txt')).write_text(log,encoding='utf-8')
            match=re.search(r'Ran (\d+) tests',log) if name=='extension' else re.search(r'(\d+) passed',log)
            count=int(match.group(1)) if match else 0
            checks.append({'check':name+' tests','passed':process.returncode==0 and count>0,'tests_reported':count})
    except Exception as exc:
        checks.append({'check':'Verification execution','passed':False,'reason':str(exc)})
    after=source_hashes()
    changed=[p for p,digest in before.items() if after.get(p)!=digest]
    checks.append({'check':'Original source files preserved','passed':not changed,'changed_files':changed})
    summary={'checks':checks,'passed':all(c['passed'] for c in checks),'source_files_checked':len(before),
             'data_collection_complete':False,'sourced_ui_agent_connection_complete':False,
             'scope':'Backend automated checks. Frontend compilation is a separate CI job; no full UI browser test or release certification.'}
    save('summary.json',summary);print(json.dumps(summary,indent=2))
    return 0 if summary['passed'] else 1

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reports',type=Path,default=ROOT/'.local'/'ci-reports')
    sys.exit(verify(parser.parse_args().reports))
