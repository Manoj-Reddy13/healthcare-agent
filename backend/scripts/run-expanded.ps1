param([int]$Port=8000)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$extensionPython=Join-Path (Get-Location) '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $extensionPython)) {throw 'Run setup.ps1 first.'}
& $extensionPython -m scripts.doctor
if ($LASTEXITCODE -ne 0) {throw 'Setup checks failed.'}
& $extensionPython -m uvicorn app.api.treatment_references:app_factory --factory --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
