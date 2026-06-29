# Compiles tools/EditorLauncher.cs into editor.exe at the project root using the
# .NET Framework C# compiler that ships with Windows (no extra toolchain).
$ErrorActionPreference = 'Stop'

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path $csc)) {
    Write-Error 'csc.exe (.NET Framework 4.x compiler) was not found under %WINDIR%\Microsoft.NET. Install the .NET Framework or build editor.exe another way.'
    exit 1
}

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $PSScriptRoot 'EditorLauncher.cs'
$out  = Join-Path $root 'editor.exe'

& $csc /nologo /target:exe /out:"$out" "$src"
if ($LASTEXITCODE -ne 0) {
    Write-Error "csc.exe failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Built $out"
