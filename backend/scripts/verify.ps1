$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$extensionPython=Join-Path (Get-Location) '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $extensionPython)) {throw 'Run setup.ps1 first.'}
& $extensionPython -m scripts.rebuild
if ($LASTEXITCODE -ne 0) {throw 'Snapshot rebuild failed.'}
& $extensionPython -m unittest discover -s tests/data_services -v
exit $LASTEXITCODE
