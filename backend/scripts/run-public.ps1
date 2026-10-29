param([int]$Port=8001)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$publicPython=Join-Path (Get-Location) '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $publicPython)) {
    & (Join-Path $PSScriptRoot 'setup.ps1')
    if ($LASTEXITCODE -ne 0) {throw 'Setup failed.'}
}
Write-Host "Open http://127.0.0.1:$Port/docs for the public-source edition. No API keys are needed for these public pages."
& $publicPython -m uvicorn app.public_main:app --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
