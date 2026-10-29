param([int]$Port=8001)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$livePython=Join-Path (Get-Location) '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $livePython)) {throw 'Run setup.ps1 first.'}
Write-Host "Live-source API: http://127.0.0.1:$Port/docs . No demo fallback is served."
& $livePython -m uvicorn app.api.live_sources:app --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
