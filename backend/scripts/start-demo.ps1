param([int]$Port=8000)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$demoPython=Join-Path (Get-Location) '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $demoPython)) {
    & (Join-Path $PSScriptRoot 'setup.ps1')
    if ($LASTEXITCODE -ne 0) {throw 'Setup did not finish successfully.'}
}
& $demoPython -m scripts.prepare_demo
if ($LASTEXITCODE -ne 0) {throw 'Demo preparation failed.'}
Write-Host "Open http://127.0.0.1:$Port for the college demo; /docs shows the APIs."
& $demoPython -m uvicorn app.demo_main:app_factory --factory --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
