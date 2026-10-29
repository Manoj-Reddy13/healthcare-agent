param([string]$Python='python')
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$publicPython=Join-Path (Get-Location) '.local/public-venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $publicPython)) {
    & $Python -m venv .local/public-venv
    if ($LASTEXITCODE -ne 0) {throw 'Could not create the public-source environment.'}
}
& $publicPython -m pip install -r requirements-public.txt
if ($LASTEXITCODE -ne 0) {throw 'Dependency installation failed.'}
& $publicPython -m unittest discover -s tests/data_services -p test_live_public.py -v
if ($LASTEXITCODE -ne 0) {throw 'Live-source tests failed.'}
& $publicPython -m unittest discover -s tests/data_services -p test_public_access.py -v
exit $LASTEXITCODE
