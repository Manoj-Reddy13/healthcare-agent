param([int]$Port=8001)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$publicPython=Join-Path (Get-Location) '.local/public-venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $publicPython)) {
    & (Join-Path $PSScriptRoot 'setup-public.ps1')
    if ($LASTEXITCODE -ne 0) {throw 'Public-source setup failed.'}
}
Write-Host "Open http://127.0.0.1:$Port/docs . Public sources only; no sample fallback."
& $publicPython -m uvicorn app.public_main:app --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
