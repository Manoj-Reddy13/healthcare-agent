param([string]$Python='python')
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$extensionPython=Join-Path (Get-Location) '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $extensionPython)) {
    & $Python -m venv .local/runtime
    if ($LASTEXITCODE -ne 0) {throw 'Could not create the extension Python environment.'}
}
& $extensionPython -m pip install -r requirements-integration.txt
if ($LASTEXITCODE -ne 0) {throw 'Dependency installation failed.'}
& $extensionPython -m scripts.rebuild
if ($LASTEXITCODE -ne 0) {throw 'Snapshot rebuild failed.'}
& $extensionPython -m scripts.doctor
if ($LASTEXITCODE -ne 0) {throw 'Setup checks failed; see the diagnostics above.'}
