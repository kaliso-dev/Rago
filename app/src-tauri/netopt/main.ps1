# Network Optimizer engine, entry point: runs the action netopt.rs asked for (RN_ACTION).
if (-not (Test-Path -LiteralPath $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
if ((Get-Item -LiteralPath $LogF -ErrorAction SilentlyContinue).Length -gt 1MB) { Remove-Item -LiteralPath $LogF -ErrorAction SilentlyContinue }
$rc = 0
switch (EnvStr 'RN_ACTION' '') {
    'apply'    { $rc = Do-Apply | Select-Object -Last 1 }
    'restore'  { $rc = Do-Restore | Select-Object -Last 1 }
    'defaults' { $rc = Do-Defaults | Select-Object -Last 1 }
    'quality'  { $rc = Do-Quality | Select-Object -Last 1 }
    'loaded'   { $rc = Do-Loaded | Select-Object -Last 1 }
    'mtu'      { $rc = Do-Mtu | Select-Object -Last 1 }
    'detect'   { $rc = Do-Detect | Select-Object -Last 1 }
    'status'   { $rc = Do-Status | Select-Object -Last 1 }
    default    { Log 'X' 'Unknown action'; $rc = 1 }
}
if ($rc -isnot [int]) { $rc = 0 }
exit $rc
