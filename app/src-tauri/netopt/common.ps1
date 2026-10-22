# Network Optimizer engine, ported from network_optimizer.bat v2 (Minecraft PvP: hitreg and knockback).
# Rago Optimizer writes it in run\ for one action, runs it, then deletes it (netopt.rs). This part runs without a
# licence: restore, Windows defaults, tests. The apply part (apply.ps1) is sealed with the Premium scripts.
# Options come from the environment: O_* are the page choices, C_* the exact values netopt.rs computed from them.
# Output: one line per event, "@@NO|<tag>|<text>" (OK, !, X, .. log lines; # title; % progress; = JSON result).
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$Dir    = $env:RN_DIR
$Snap   = Join-Path $Dir 'snapshot.json'
$LogF   = Join-Path $Dir 'log.txt'
$Games  = @('javaw.exe', 'java.exe', 'Minecraft.Windows.exe')
$BgApps = @('steam.exe', 'EpicGamesLauncher.exe', 'OneDrive.exe', 'Dropbox.exe', 'GoogleDriveFS.exe',
            'qbittorrent.exe', 'uTorrent.exe', 'BitTorrent.exe', 'Battle.net.exe')
$QosTag = 'Rago_Net_'
$MM     = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'
$GTask  = $MM + '\Tasks\Games'
$IFEO   = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options'
$TcpIf  = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'
$QosK   = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\QoS'
$PrioK  = 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl'
$DoK    = 'Registry::HKEY_USERS\S-1-5-20\Software\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Settings'
$DvrK   = 'HKCU:\System\GameConfigStore'
$CapK   = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR'
$GbK    = 'HKCU:\Software\Microsoft\GameBar'
$HighPerf   = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
$Balanced   = '381b4222-f694-41f0-9685-ff5bb260df2e'
$PowerSaver = 'a1841308-3541-4fab-bc81-f71556f20b4a'
$WifiSub  = '19cbb8fa-5279-450e-9fac-8a3d5fedd0c1'
$WifiSet  = '12bbebe6-58d6-4636-95bb-3217ef867c1a'
$GuidRx   = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

# Driver keywords (language independent). Standard NDIS keywords start with *.
$KwLatency = @('*InterruptModeration', 'ITR', '*FlowControl', '*LsoV2IPv4', '*LsoV2IPv6', '*LsoV1IPv4',
               '*PacketCoalescing', '*RscIPv4', '*RscIPv6')
$KwPower   = @('*EEE', 'EEE', 'EEELinkAdvertisement', 'AdvancedEEE', 'EnableGreenEthernet', 'GigaLite',
               'PowerSavingMode', 'ULPMode', 'SipsEnabled', 'ReduceSpeedOnPowerDown', 'AutoPowerSaveModeEnabled',
               '*SelectiveSuspend')
$KwWifi    = @('RoamAggressiveness', 'uAPSDSupport', 'MIMOPowerSaveMode')
$AllKw     = $KwLatency + $KwPower + $KwWifi
$KwNames = @{
    '*InterruptModeration' = 'interrupt moderation'; 'ITR' = 'interrupt moderation rate'; '*FlowControl' = 'flow control'
    '*LsoV2IPv4' = 'large send offload IPv4'; '*LsoV2IPv6' = 'large send offload IPv6'; '*LsoV1IPv4' = 'large send offload v1'
    '*PacketCoalescing' = 'packet coalescing'; '*RscIPv4' = 'receive segment coalescing IPv4'; '*RscIPv6' = 'receive segment coalescing IPv6'
    '*EEE' = 'Energy Efficient Ethernet'; 'EEE' = 'Energy Efficient Ethernet'; 'EEELinkAdvertisement' = 'Energy Efficient Ethernet'
    'AdvancedEEE' = 'Advanced EEE'; 'EnableGreenEthernet' = 'Green Ethernet'; 'GigaLite' = 'Gigabit Lite'
    'PowerSavingMode' = 'power saving mode'; 'ULPMode' = 'ultra low power mode'; 'SipsEnabled' = 'system idle power saver'
    'ReduceSpeedOnPowerDown' = 'reduce speed on power down'; 'AutoPowerSaveModeEnabled' = 'auto power save'
    '*SelectiveSuspend' = 'selective suspend'; 'RoamAggressiveness' = 'roaming aggressiveness'
    'uAPSDSupport' = 'U-APSD power save'; 'MIMOPowerSaveMode' = 'MIMO power save'
}

$script:nOk = 0; $script:nWarn = 0; $script:nFail = 0
$script:restartNic = @{}
$script:S = $null
$script:nsOut = ''

# ---------------------------------------------------------------- output
function Say([string]$s) { [Console]::Out.WriteLine($s); [Console]::Out.Flush() }
function Log([string]$tag, [string]$msg) {
    switch ($tag) {
        'OK' { $script:nOk++ }
        '!'  { $script:nWarn++ }
        'X'  { $script:nFail++ }
    }
    Say ('@@NO|' + $tag + '|' + $msg)
    try { Add-Content -LiteralPath $LogF -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' [' + $tag + '] ' + $msg) } catch { }
}
function Title([string]$t) { Say ('@@NO|#|' + $t) }
function Result($o) { Say ('@@NO|=|' + (ConvertTo-Json -InputObject $o -Compress -Depth 5)) }
function Step([int]$i, [int]$n) { Say ('@@NO|%|' + $i + '|' + $n) }
function Summary { Say ('@@NO|sum|' + $script:nOk + '|' + $script:nWarn + '|' + $script:nFail) }

function EnvStr([string]$n, [string]$d) {
    $v = [Environment]::GetEnvironmentVariable($n)
    if ([string]::IsNullOrEmpty($v)) { return $d }
    return $v
}
function EnvInt([string]$n, [int]$d) {
    $v = [Environment]::GetEnvironmentVariable($n)
    if ($v -match '^-?\d{1,6}$') { return [int]$v }
    return $d
}
function On([string]$n) { return ((EnvStr $n '0') -eq '1') }
function KwName([string]$k) { if ($KwNames.ContainsKey($k)) { return $KwNames[$k] } return $k }

function NS([string[]]$a) {
    $out = & netsh.exe @a 2>&1
    $script:nsOut = (($out | Out-String) -replace '\s+', ' ').Trim()
    return ($LASTEXITCODE -eq 0)
}
function CmdLine([string]$line) {
    $out = & cmd.exe /d /c $line 2>&1
    $script:nsOut = (($out | Out-String) -replace '\s+', ' ').Trim()
    return ($LASTEXITCODE -eq 0)
}

function RGet([string]$p, [string]$n) {
    try { $i = Get-ItemProperty -LiteralPath $p -Name $n -ErrorAction Stop; return $i.$n } catch { return $null }
}
function RSet([string]$p, [string]$n, $v, [string]$t) {
    try {
        if (-not (Test-Path -LiteralPath $p)) { New-Item -Path $p -Force -ErrorAction Stop | Out-Null }
        New-ItemProperty -LiteralPath $p -Name $n -Value $v -PropertyType $t -Force -ErrorAction Stop | Out-Null
        return $true
    } catch { return $false }
}
function RDel([string]$p, [string]$n) { Remove-ItemProperty -LiteralPath $p -Name $n -Force -ErrorAction SilentlyContinue }
function Conv([string]$v, [string]$t) { if ($t -eq 'DWord') { return [int]$v } return $v }

function TR([string]$p, [string]$n, [string]$t) { return [pscustomobject]@{ P = $p; N = $n; T = $t } }
# every registry value the apply can change: saved before the first apply, put back by the restore
function Get-Tracked {
    $l = New-Object System.Collections.Generic.List[object]
    $l.Add((TR $MM 'NetworkThrottlingIndex' 'DWord'))
    $l.Add((TR $MM 'SystemResponsiveness' 'DWord'))
    $l.Add((TR $GTask 'GPU Priority' 'DWord'))
    $l.Add((TR $GTask 'Priority' 'DWord'))
    $l.Add((TR $GTask 'Scheduling Category' 'String'))
    $l.Add((TR $GTask 'SFIO Priority' 'String'))
    $l.Add((TR $PrioK 'Win32PrioritySeparation' 'DWord'))
    $l.Add((TR $DvrK 'GameDVR_Enabled' 'DWord'))
    $l.Add((TR $CapK 'AppCaptureEnabled' 'DWord'))
    $l.Add((TR $GbK 'AutoGameModeEnabled' 'DWord'))
    $l.Add((TR $QosK 'Do not use NLA' 'String'))
    $l.Add((TR $DoK 'DownloadMode' 'DWord'))
    foreach ($e in $Games) { $l.Add((TR ($IFEO + '\' + $e + '\PerfOptions') 'CpuPriorityClass' 'DWord')) }
    foreach ($k in @(Get-ChildItem -LiteralPath $TcpIf -ErrorAction SilentlyContinue)) {
        $p = $TcpIf + '\' + $k.PSChildName
        foreach ($n in @('TcpAckFrequency', 'TcpDelAckTicks', 'TCPNoDelay')) { $l.Add((TR $p $n 'DWord')) }
    }
    return $l.ToArray()
}

function Snap-Reg([string]$p, [string]$n) {
    if (-not $script:S) { return $null }
    foreach ($r in @($script:S.reg)) { if ($r.P -eq $p -and $r.N -eq $n) { return $r } }
    return $null
}
# puts one registry value back as it was before the first apply (or deletes it)
function Revert-Reg([string]$p, [string]$n, [string]$t) {
    $r = Snap-Reg $p $n
    if ($r -and $r.E) { RSet $p $n (Conv $r.V $t) $t | Out-Null } else { RDel $p $n }
}
function Clean-Ifeo([string]$e) {
    foreach ($k in @(($IFEO + '\' + $e + '\PerfOptions'), ($IFEO + '\' + $e))) {
        $it = Get-Item -LiteralPath $k -ErrorAction SilentlyContinue
        if ($it -and $it.ValueCount -eq 0 -and $it.SubKeyCount -eq 0) { Remove-Item -LiteralPath $k -ErrorAction SilentlyContinue }
    }
}

# ---------------------------------------------------------------- adapters
function Get-Nics { return @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' }) }
function Get-AllNics { return @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue) }
function Test-Wifi($a) {
    return (("$($a.PhysicalMediaType)" -match '802\.11') -or ("$($a.NdisPhysicalMedium)" -eq '9') -or
            ("$($a.InterfaceDescription)" -match 'Wireless|Wi-?Fi|WLAN|802\.11'))
}
function Get-Prop($a, [string]$kw) {
    return (Get-NetAdapterAdvancedProperty -Name $a.Name -RegistryKeyword $kw -ErrorAction SilentlyContinue | Select-Object -First 1)
}
function Set-Kw($a, [string]$kw, [string[]]$want) {
    $p = Get-Prop $a $kw
    if (-not $p) { return }
    $valid = @($p.ValidRegistryValues | Where-Object { "$_" -ne '' })
    $pick = $null
    foreach ($w in $want) { if ($valid.Count -eq 0 -or $valid -contains $w) { $pick = $w; break } }
    if ($null -eq $pick) { return }
    if ((@($p.RegistryValue) -join ',') -eq $pick) { return }
    $label = $pick
    $ix = [array]::IndexOf(@($p.ValidRegistryValues), $pick)
    if ($ix -ge 0 -and $ix -lt @($p.ValidDisplayValues).Count) { $label = "$(@($p.ValidDisplayValues)[$ix])" }
    Set-NetAdapterAdvancedProperty -Name $a.Name -RegistryKeyword $kw -RegistryValue $pick -NoRestart -ErrorAction SilentlyContinue
    if ($?) { $script:restartNic[$a.Name] = $true; Log 'OK' ($a.Name + ': ' + (KwName $kw) + ' = ' + $label) }
    else { Log '!' ($a.Name + ': the driver refused ' + (KwName $kw)) }
}
# picks the value whose label matches (used when drivers number their choices)
function Set-KwByLabel($a, [string]$kw, [string]$rx) {
    $p = Get-Prop $a $kw
    if (-not $p) { return }
    $vals = @($p.ValidRegistryValues); $disp = @($p.ValidDisplayValues)
    for ($i = 0; $i -lt [math]::Min($vals.Count, $disp.Count); $i++) {
        if ("$($disp[$i])" -match $rx) { Set-Kw $a $kw @("$($vals[$i])"); return }
    }
}
# puts a driver setting back to its value before the first apply (or the driver default)
function Revert-Kw($a, [string]$kw) {
    $p = Get-Prop $a $kw
    if (-not $p) { return }
    $want = $null
    if ($script:S) {
        foreach ($e in @($script:S.adv)) {
            if ($e.Desc -eq $a.InterfaceDescription -and $e.Kw -eq $kw) { $want = "$($e.Val)"; break }
        }
    }
    if ($null -eq $want) {
        if ($null -eq $p.DefaultRegistryValue -or "$($p.DefaultRegistryValue)" -eq '') { return }
        $want = "$($p.DefaultRegistryValue)"
    }
    if ($want -eq '') { return }
    if ((@($p.RegistryValue) -join ',') -eq $want) { return }
    Set-NetAdapterAdvancedProperty -Name $a.Name -RegistryKeyword $kw -RegistryValue ($want -split ',') -NoRestart -ErrorAction SilentlyContinue
    if ($?) { $script:restartNic[$a.Name] = $true; Log 'OK' ($a.Name + ': ' + (KwName $kw) + ' back to its original value') }
}
function Reset-Kw($a, [string]$kw) {
    $p = Get-Prop $a $kw
    if (-not $p) { return }
    if ($null -ne $p.DefaultRegistryValue -and (@($p.RegistryValue) -join ',') -eq "$($p.DefaultRegistryValue)") { return }
    Reset-NetAdapterAdvancedProperty -Name $a.Name -RegistryKeyword $kw -NoRestart -ErrorAction SilentlyContinue
    if ($?) { $script:restartNic[$a.Name] = $true; Log 'OK' ($a.Name + ': ' + (KwName $kw) + ' back to driver default') }
}
function Want-Kw($a, [string]$kw, [bool]$on, [string[]]$vals) {
    if ($on) { Set-Kw $a $kw $vals } else { Revert-Kw $a $kw }
}

$PmMap = [ordered]@{ AllowComputerToTurnOffDevice = 'Allow'; D0PacketCoalescing = 'D0'; SelectiveSuspend = 'Sel'; DeviceSleepOnDisconnect = 'Sleep' }
$PmNames = @{ AllowComputerToTurnOffDevice = 'Windows may turn the card off'; D0PacketCoalescing = 'packet coalescing while awake'
              SelectiveSuspend = 'USB selective suspend'; DeviceSleepOnDisconnect = 'sleep on disconnect' }
# mode: off = disable power management, orig = back to the backup,
# default = back to the backup, or just allow sleep again when there is none
function Set-Pm($a, [string]$mode) {
    $pm = Get-NetAdapterPowerManagement -Name $a.Name -ErrorAction SilentlyContinue
    if (-not $pm) { return }
    $sp = $null
    if ($script:S) { foreach ($e in @($script:S.pm)) { if ($e.Desc -eq $a.InterfaceDescription) { $sp = $e; break } } }
    foreach ($prop in $PmMap.Keys) {
        $cur = "$($pm.$prop)"
        if ($cur -ne 'Enabled' -and $cur -ne 'Disabled') { continue }
        $want = 'Enabled'
        if ($mode -eq 'off') { $want = 'Disabled' }
        elseif ($sp) { $want = "$($sp.($PmMap[$prop]))" }
        elseif ($mode -eq 'orig' -or $prop -ne 'AllowComputerToTurnOffDevice') { continue }
        if ($want -ne 'Enabled' -and $want -ne 'Disabled') { continue }
        if ($cur -eq $want) { continue }
        $splat = @{ Name = $a.Name; NoRestart = $true; ErrorAction = 'Stop' }
        $splat[$prop] = $want
        try {
            Set-NetAdapterPowerManagement @splat
            $script:restartNic[$a.Name] = $true
            Log 'OK' ($a.Name + ': ' + $PmNames[$prop] + ' = ' + $want.ToLower())
        } catch { Log '..' ($a.Name + ': ' + $PmNames[$prop] + ' is not adjustable here, kept') }
    }
}

function Restart-Nics {
    if ($script:restartNic.Count -eq 0) { return }
    $names = @($script:restartNic.Keys)
    Log '..' ('Restarting ' + ($names -join ', ') + ' to load the new driver settings...')
    foreach ($n in $names) { Restart-NetAdapter -Name $n -Confirm:$false -ErrorAction SilentlyContinue }
    $t0 = Get-Date
    do {
        Start-Sleep -Milliseconds 800
        $up = @(Get-NetAdapter -Name $names -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' }).Count
    } while ($up -lt $names.Count -and ((Get-Date) - $t0).TotalSeconds -lt 30)
    while (-not (Get-MainIf) -and ((Get-Date) - $t0).TotalSeconds -lt 45) { Start-Sleep -Milliseconds 800 }
    if ($up -ge $names.Count -and (Get-MainIf)) { Log 'OK' 'Network card back online' }
    else { Log '!' 'The network card is still reconnecting, give it a few more seconds' }
    $script:restartNic = @{}
}

# ---------------------------------------------------------------- power plan
function Get-ActiveScheme {
    $m = [regex]::Match((powercfg /getactivescheme 2>$null | Out-String), $GuidRx)
    if ($m.Success) { return $m.Value.ToLower() }
    return $null
}
function Get-Schemes {
    return @([regex]::Matches((powercfg /list 2>$null | Out-String), $GuidRx) | ForEach-Object { $_.Value.ToLower() } | Select-Object -Unique)
}
function Get-WifiPow([string]$g) {
    $m = [regex]::Matches((powercfg /query $g $WifiSub $WifiSet 2>$null | Out-String), '0x[0-9a-fA-F]{8}')
    if ($m.Count -ge 2) { return @($m[$m.Count - 2].Value, $m[$m.Count - 1].Value) }
    return $null
}
function Set-WifiPow([string]$g, [int]$ac, [int]$dc) {
    powercfg /setacvalueindex $g $WifiSub $WifiSet $ac 2>$null | Out-Null
    powercfg /setdcvalueindex $g $WifiSub $WifiSet $dc 2>$null | Out-Null
}
function Refresh-Scheme { $g = Get-ActiveScheme; if ($g) { powercfg /setactive $g 2>$null | Out-Null } }

# ---------------------------------------------------------------- network targets
function Get-MainIf {
    $best = $null; $bm = [int]::MaxValue
    foreach ($r in @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue)) {
        $i = Get-NetIPInterface -InterfaceIndex $r.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
        if (-not $i -or "$($i.ConnectionState)" -ne 'Connected') { continue }
        $m = [int]$r.RouteMetric + [int]$i.InterfaceMetric
        if ($m -lt $bm) { $bm = $m; $best = $i }
    }
    return $best
}
# game server of the page (hypixel.net, play.server.fr:25565, an IP), through its Minecraft SRV record when it has one
function Get-Target {
    $t = (EnvStr 'O_TARGET' '1.1.1.1').Trim()
    if ($t -match '^([^:]+):\d+$') { $t = $Matches[1] }
    $ip = $null
    if ($t -match '^\d{1,3}(\.\d{1,3}){3}$') { return $t }
    try {
        $srv = Resolve-DnsName -Name ('_minecraft._tcp.' + $t) -Type SRV -ErrorAction Stop | Where-Object { $_.Type -eq 'SRV' } | Select-Object -First 1
        if ($srv -and $srv.NameTarget) { $t = $srv.NameTarget.TrimEnd('.') }
    } catch { }
    try {
        $ip = [System.Net.Dns]::GetHostAddresses($t) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1
    } catch { }
    if ($ip) { return $ip.ToString() }
    return $null
}
function Find-Mtu([string]$ip) {
    $png = [System.Net.NetworkInformation.Ping]::new()
    $opt = [System.Net.NetworkInformation.PingOptions]::new(64, $true)
    $fits = {
        param([int]$size)
        for ($k = 0; $k -lt 2; $k++) {
            try {
                $r = $png.Send($ip, 1200, [byte[]]::new($size), $opt)
                if ($r.Status -eq 'Success') { return $true }
                if ("$($r.Status)" -eq 'PacketTooBig') { return $false }
            } catch { }
        }
        return $false
    }
    if (-not (& $fits 548)) { return $null }
    if (& $fits 1472) { return 1500 }
    $lo = 548; $hi = 1472
    while ($hi - $lo -gt 1) {
        $mid = [int][math]::Floor(($lo + $hi) / 2)
        if (& $fits $mid) { $lo = $mid } else { $hi = $mid }
    }
    return ($lo + 28)
}
function Ping-Series([string]$ip, [int]$count, [int]$gapMs, [scriptblock]$keepGoing, [int]$base, [int]$total) {
    $png = [System.Net.NetworkInformation.Ping]::new()
    $buf = [byte[]]::new(32)
    $rtt = New-Object System.Collections.Generic.List[int]
    $sent = 0; $lost = 0
    for ($i = 1; $i -le $count; $i++) {
        if ($keepGoing -and -not (& $keepGoing)) { break }
        $sent++
        try { $r = $png.Send($ip, 1000, $buf); if ($r.Status -eq 'Success') { $rtt.Add([int]$r.RoundtripTime) } else { $lost++ } } catch { $lost++ }
        if ($i % 5 -eq 0) { Step ($base + $i) $total }
        Start-Sleep -Milliseconds $gapMs
    }
    return [pscustomobject]@{ Rtt = $rtt.ToArray(); Sent = $sent; Lost = $lost }
}
function Stats($s) {
    $a = @($s.Rtt)
    if ($a.Count -eq 0) { return $null }
    $sorted = @($a | Sort-Object)
    $avg = ($a | Measure-Object -Average).Average
    $jit = 0.0
    for ($i = 1; $i -lt $a.Count; $i++) { $jit += [math]::Abs($a[$i] - $a[$i - 1]) }
    if ($a.Count -gt 1) { $jit = $jit / ($a.Count - 1) }
    $p95 = $sorted[[math]::Max(0, [int][math]::Ceiling($sorted.Count * 0.95) - 1)]
    $med = $sorted[[int][math]::Floor(($sorted.Count - 1) / 2)]
    $loss = 0.0
    if ($s.Sent -gt 0) { $loss = 100.0 * $s.Lost / $s.Sent }
    $spikes = @($a | Where-Object { $_ -gt $sorted[0] + 30 }).Count
    return [pscustomobject]@{
        Min = $sorted[0]; Max = $sorted[-1]; Avg = [math]::Round($avg, 1); Med = $med; P95 = $p95
        Jitter = [math]::Round($jit, 1); Loss = [math]::Round($loss, 1); Spikes = $spikes
    }
}

# ---------------------------------------------------------------- backup
function Load-Snapshot {
    if (Test-Path -LiteralPath $Snap) {
        try { $script:S = Get-Content -LiteralPath $Snap -Raw | ConvertFrom-Json } catch { $script:S = $null }
    }
}
function Remove-QosOurs {
    foreach ($q in @(Get-NetQosPolicy -ErrorAction SilentlyContinue | Where-Object { $_.Name -like ($QosTag + '*') })) {
        Remove-NetQosPolicy -Name $q.Name -Confirm:$false -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------- RESTORE (exact backup)
function Do-Restore {
    Load-Snapshot
    if (-not $script:S) { Log 'X' 'No readable backup found. Use Reset to Windows defaults instead.'; Summary; return 1 }
    Title ('Restoring the settings saved on ' + $script:S.date)
    Remove-QosOurs
    $t = $script:S.tcp
    if ($t) {
        $pairs = [ordered]@{ autotuninglevel = $t.Tune; initialrto = $t.IRto; timestamps = $t.Ts; ecncapability = $t.Ecn; nonsackrttresiliency = $t.NonSack }
        foreach ($k in $pairs.Keys) {
            $v = "$($pairs[$k])".ToLower()
            if ($v -eq '') { continue }
            if (NS @('int', 'tcp', 'set', 'global', ($k + '=' + $v))) { Log 'OK' ($k + ': ' + $v) } else { Log '!' ($k + ' could not be set back to ' + $v) }
        }
        $cc = "$($t.Ccp)".ToLower()
        if ($cc -and $cc -ne 'default') { if (NS @('int', 'tcp', 'set', 'supplemental', 'template=internet', ('congestionprovider=' + $cc))) { Log 'OK' ('congestion provider: ' + $cc) } }
        $cur = Get-NetTCPSetting -SettingName Internet -ErrorAction SilentlyContinue | Select-Object -First 1
        $sup = @(@('minrto', $t.MinRto, "$($cur.MinRtoMs)"), @('delayedacktimeout', $t.AckTo, "$($cur.DelayedAckTimeoutMs)"),
                 @('delayedackfrequency', $t.AckFreq, "$($cur.DelayedAckFrequency)"), @('icw', $t.Icw, "$($cur.InitialCongestionWindowMss)"))
        foreach ($s in $sup) {
            if ("$($s[1])" -ne '' -and "$($s[1])" -ne $s[2]) {
                if (NS @('int', 'tcp', 'set', 'supplemental', 'template=internet', ($s[0] + '=' + $s[1]))) { Log 'OK' ($s[0] + ': ' + $s[1]) }
            }
        }
    }
    if ($script:S.offload.Rsc) { Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing $script:S.offload.Rsc -ErrorAction SilentlyContinue }
    if ($script:S.offload.Pcf) { Set-NetOffloadGlobalSetting -PacketCoalescingFilter $script:S.offload.Pcf -ErrorAction SilentlyContinue }
    Log 'OK' 'Offload settings restored'

    foreach ($r in @(Get-Tracked)) { Revert-Reg $r.P $r.N $r.T }
    foreach ($e in $Games) { Clean-Ifeo $e }
    Log 'OK' 'Registry values restored (ACK, scheduler, priority, Game DVR, QoS, Delivery Optimization)'

    foreach ($a in (Get-AllNics)) {
        foreach ($kw in $AllKw) { Revert-Kw $a $kw }
        Set-Pm $a 'orig'
    }
    foreach ($b in @($script:S.pacer)) {
        $now = Get-NetAdapterBinding -Name $b.Name -ComponentID ms_pacer -ErrorAction SilentlyContinue
        if ($now -and [bool]$now.Enabled -ne [bool]$b.On) {
            if ($b.On) { Enable-NetAdapterBinding -Name $b.Name -ComponentID ms_pacer } else { Disable-NetAdapterBinding -Name $b.Name -ComponentID ms_pacer }
        }
    }
    Restart-Nics

    foreach ($m in @($script:S.mtu)) {
        $now = Get-NetIPInterface -InterfaceAlias $m.Alias -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($now -and "$($now.NlMtu)" -ne "$($m.Mtu)" -and "$($m.Mtu)" -match '^\d+$') {
            if (NS @('interface', 'ipv4', 'set', 'subinterface', $m.Alias, ('mtu=' + $m.Mtu), 'store=persistent')) { Log 'OK' ('MTU ' + $m.Mtu + ' on ' + $m.Alias) }
        }
    }
    foreach ($w in @($script:S.wifipow)) { Set-WifiPow $w.G ([Convert]::ToInt32($w.AC, 16)) ([Convert]::ToInt32($w.DC, 16)) }
    if ($script:S.scheme -and (Get-ActiveScheme) -ne $script:S.scheme) { powercfg /setactive $script:S.scheme 2>$null | Out-Null; Log 'OK' 'Power plan restored' }
    else { Refresh-Scheme }
    Restart-Service -Name DoSvc -Force -ErrorAction SilentlyContinue
    ipconfig /flushdns 2>$null | Out-Null
    $old = Join-Path $Dir ('snapshot-restored-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
    Move-Item -LiteralPath $Snap -Destination $old -ErrorAction SilentlyContinue
    Log 'OK' 'Backup used and archived. The next apply saves a fresh one.'
    Summary
    return 0
}

# ---------------------------------------------------------------- RESET TO WINDOWS DEFAULTS
function Do-Defaults {
    Load-Snapshot
    Title 'Resetting to Windows defaults'
    Remove-QosOurs
    $g = [ordered]@{ autotuninglevel = 'normal'; rss = 'enabled'; initialrto = '1000'; timestamps = 'disabled'; ecncapability = 'default'; nonsackrttresiliency = 'disabled' }
    foreach ($k in $g.Keys) {
        if (NS @('int', 'tcp', 'set', 'global', ($k + '=' + $g[$k]))) { Log 'OK' ($k + ': ' + $g[$k]) }
        else { Log '!' ($k + ' could not be set to ' + $g[$k] + ': ' + $script:nsOut) }
    }
    NS @('int', 'tcp', 'set', 'supplemental', 'template=internet', 'congestionprovider=cubic') | Out-Null
    $cur = Get-NetTCPSetting -SettingName Internet -ErrorAction SilentlyContinue | Select-Object -First 1
    foreach ($s in @(@('minrto', '300', "$($cur.MinRtoMs)"), @('delayedacktimeout', '40', "$($cur.DelayedAckTimeoutMs)"),
                     @('delayedackfrequency', '2', "$($cur.DelayedAckFrequency)"), @('icw', '10', "$($cur.InitialCongestionWindowMss)"))) {
        if ($s[2] -ne '' -and $s[1] -ne $s[2]) { NS @('int', 'tcp', 'set', 'supplemental', 'template=internet', ($s[0] + '=' + $s[1])) | Out-Null }
    }
    Log 'OK' 'Congestion provider: cubic'
    Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Enabled -ErrorAction SilentlyContinue
    if ($script:S -and $script:S.offload.Pcf) { Set-NetOffloadGlobalSetting -PacketCoalescingFilter $script:S.offload.Pcf -ErrorAction SilentlyContinue }

    foreach ($k in @(Get-ChildItem -LiteralPath $TcpIf -ErrorAction SilentlyContinue)) {
        foreach ($v in @('TcpAckFrequency', 'TcpDelAckTicks', 'TCPNoDelay')) { RDel ($TcpIf + '\' + $k.PSChildName) $v }
    }
    RSet $MM 'NetworkThrottlingIndex' 10 'DWord' | Out-Null
    RSet $MM 'SystemResponsiveness' 20 'DWord' | Out-Null
    RSet $GTask 'GPU Priority' 8 'DWord' | Out-Null
    RSet $GTask 'Priority' 2 'DWord' | Out-Null
    RSet $GTask 'Scheduling Category' 'Medium' 'String' | Out-Null
    RSet $GTask 'SFIO Priority' 'Normal' 'String' | Out-Null
    RSet $PrioK 'Win32PrioritySeparation' 2 'DWord' | Out-Null
    RSet $DvrK 'GameDVR_Enabled' 1 'DWord' | Out-Null
    RDel $CapK 'AppCaptureEnabled'
    RDel $GbK 'AutoGameModeEnabled'
    RDel $QosK 'Do not use NLA'
    RDel $DoK 'DownloadMode'
    foreach ($e in $Games) { RDel ($IFEO + '\' + $e + '\PerfOptions') 'CpuPriorityClass'; Clean-Ifeo $e }
    Log 'OK' 'ACK, scheduler, priority, Game DVR and QoS values back to Windows defaults'

    foreach ($a in (Get-AllNics)) {
        foreach ($kw in $AllKw) { Reset-Kw $a $kw }
        Set-Pm $a 'default'
    }
    Restart-Nics
    if ($script:S) {
        foreach ($m in @($script:S.mtu)) {
            $now = Get-NetIPInterface -InterfaceAlias $m.Alias -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($now -and "$($now.NlMtu)" -ne "$($m.Mtu)" -and "$($m.Mtu)" -match '^\d+$') {
                NS @('interface', 'ipv4', 'set', 'subinterface', $m.Alias, ('mtu=' + $m.Mtu), 'store=persistent') | Out-Null
            }
        }
        Log 'OK' 'MTU back to the values found before the first apply'
    } else { Log '..' 'MTU left as is (no backup to compare with)' }
    Set-WifiPow $Balanced 0 2
    Set-WifiPow $HighPerf 0 0
    # only the plans Windows ships: a custom plan (Rago Low Latency) set by the player stays active
    $act = Get-ActiveScheme
    if ($act -eq $HighPerf) { powercfg /setactive $Balanced 2>$null | Out-Null; Log 'OK' 'Power plan: Balanced' }
    else { Refresh-Scheme }
    Log 'OK' 'Wi-Fi power saving: Windows default'
    Restart-Service -Name DoSvc -Force -ErrorAction SilentlyContinue
    ipconfig /flushdns 2>$null | Out-Null
    Summary
    return 0
}

# ---------------------------------------------------------------- TOOLS
function Do-Quality {
    $ip = Get-Target
    if (-not $ip) { Log 'X' ('Cannot find the address of ' + $env:O_TARGET); return 1 }
    Title ('Connection test towards ' + $env:O_TARGET + ' (' + $ip + '): 100 pings')
    $st = Stats (Ping-Series $ip 100 100 $null 0 100)
    if (-not $st) { Log 'X' 'No answer: this server blocks ping. Try its IP, or 1.1.1.1 for your line only.'; Result @{ kind = 'quality'; ip = $ip; noAnswer = $true }; return 1 }
    $stable = ($st.Loss -le 1 -and $st.Jitter -le 5 -and ($st.P95 - $st.Min) -le 25)
    Result @{ kind = 'quality'; ip = $ip; min = $st.Min; avg = $st.Avg; p95 = $st.P95; max = $st.Max; jitter = $st.Jitter
              loss = $st.Loss; spikes = $st.Spikes; stable = $stable }
    return 0
}
function Do-Loaded {
    $ip = Get-Target
    if (-not $ip) { Log 'X' ('Cannot find the address of ' + $env:O_TARGET); return 1 }
    $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
    if (-not (Test-Path -LiteralPath $curl)) { Log 'X' 'curl.exe is missing (Windows 10 1803 or newer needed)'; return 1 }
    Title 'Idle latency, 30 pings'
    $idle = Stats (Ping-Series $ip 30 100 $null 0 130)
    if (-not $idle) { Log 'X' 'No answer from the server: set another game server, for example 1.1.1.1'; Result @{ kind = 'loaded'; ip = $ip; noAnswer = $true }; return 1 }
    Title 'Latency while downloading, about 12 seconds'
    $procs = @()
    foreach ($i in 1..2) {
        $procs += Start-Process -FilePath $curl -ArgumentList @('-s', '-o', 'NUL', '--max-time', '12', 'https://speed.cloudflare.com/__down?bytes=100000000') -WindowStyle Hidden -PassThru
    }
    Start-Sleep -Milliseconds 1500
    $busy = Stats (Ping-Series $ip 100 100 { @($procs | Where-Object { -not $_.HasExited }).Count -gt 0 } 30 130)
    foreach ($p in $procs) { if (-not $p.HasExited) { try { $p.Kill() } catch { } } }
    if (-not $busy) { Log 'X' 'No answer during the download'; Result @{ kind = 'loaded'; ip = $ip; noAnswer = $true }; return 1 }
    $delta = [math]::Max(0, $busy.Med - $idle.Med)
    $grade = 'F'
    if ($delta -lt 400) { $grade = 'D' }
    if ($delta -lt 200) { $grade = 'C' }
    if ($delta -lt 60) { $grade = 'B' }
    if ($delta -lt 30) { $grade = 'A' }
    if ($delta -lt 5) { $grade = 'A+' }
    Result @{ kind = 'loaded'; ip = $ip; idleMed = $idle.Med; idleJitter = $idle.Jitter; busyMed = $busy.Med; busyJitter = $busy.Jitter
              busyLoss = $busy.Loss; delta = $delta; grade = $grade }
    return 0
}
function Do-Mtu {
    $ip = Get-Target
    if (-not $ip) { $ip = '1.1.1.1' }
    Title ('Measuring the MTU towards ' + $ip)
    $m = Find-Mtu $ip
    if (-not $m -and $ip -ne '1.1.1.1') { $ip = '1.1.1.1'; $m = Find-Mtu $ip }
    $ifc = Get-MainIf
    $cur = $null; $alias = $null
    if ($ifc) { $cur = [int]$ifc.NlMtu; $alias = $ifc.InterfaceAlias }
    if (-not $m) { Log '!' 'Could not measure: ping is blocked on the way.' }
    Result @{ kind = 'mtu'; ip = $ip; mtu = $m; current = $cur; alias = $alias }
    return 0
}
function Do-Detect {
    $ifc = Get-MainIf
    $wifi = $false; $alias = $null; $desc = $null; $speed = $null
    if ($ifc) {
        $a = Get-NetAdapter -InterfaceIndex $ifc.ifIndex -ErrorAction SilentlyContinue
        $alias = $ifc.InterfaceAlias
        if ($a) { $wifi = [bool](Test-Wifi $a); $desc = $a.InterfaceDescription; $speed = "$($a.LinkSpeed)" }
    }
    $last = $null
    if (Test-Path -LiteralPath $Snap) { try { $last = (Get-Content -LiteralPath $Snap -Raw | ConvertFrom-Json).date } catch { } }
    Result @{ kind = 'detect'; connected = [bool]$ifc; wifi = $wifi; alias = $alias; desc = $desc; speed = $speed; backup = $last }
    return 0
}
function Show($v) { if ($null -eq $v -or "$v" -eq '') { return 'Windows default' } return "$v" }
function Do-Status {
    $rows = New-Object System.Collections.Generic.List[object]
    $add = { param($sec, $k, $v) $rows.Add([ordered]@{ s = $sec; k = $k; v = "$v" }) }
    $t = Get-NetTCPSetting -SettingName Internet -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($t) {
        & $add 'tcp' 'Receive window tuning' $t.AutoTuningLevelLocal
        & $add 'tcp' 'Congestion provider' $t.CongestionProvider
        & $add 'tcp' 'Initial RTO, ms' $t.InitialRtoMs
        & $add 'tcp' 'Minimum RTO, ms' $t.MinRtoMs
        & $add 'tcp' 'Delayed ACK timeout, ms' $t.DelayedAckTimeoutMs
        & $add 'tcp' 'Delayed ACK frequency' $t.DelayedAckFrequency
        & $add 'tcp' 'Timestamps' $t.Timestamps
        & $add 'tcp' 'ECN' $t.EcnCapability
        & $add 'tcp' 'RTT resiliency' $t.NonSackRttResiliency
    }
    $o = Get-NetOffloadGlobalSetting -ErrorAction SilentlyContinue
    if ($o) {
        & $add 'tcp' 'Receive side scaling' $o.ReceiveSideScaling
        & $add 'tcp' 'Receive segment coalescing' $o.ReceiveSegmentCoalescing
        & $add 'tcp' 'Packet coalescing filter' $o.PacketCoalescingFilter
    }
    $ifc = Get-MainIf
    if ($ifc) {
        $p = $TcpIf + '\' + (Get-NetAdapter -InterfaceIndex $ifc.ifIndex -ErrorAction SilentlyContinue).InterfaceGuid
        & $add 'main' $ifc.InterfaceAlias ''
        & $add 'main' 'MTU' $ifc.NlMtu
        & $add 'main' 'TcpAckFrequency' (Show (RGet $p 'TcpAckFrequency'))
        & $add 'main' 'TcpDelAckTicks' (Show (RGet $p 'TcpDelAckTicks'))
    }
    foreach ($a in (Get-Nics)) {
        & $add 'nic' ($a.Name + ' - ' + $a.InterfaceDescription) $a.LinkSpeed
        foreach ($pr in @(Get-NetAdapterAdvancedProperty -Name $a.Name -ErrorAction SilentlyContinue | Where-Object { $AllKw -contains $_.RegistryKeyword })) {
            & $add 'nic' ('  ' + $pr.DisplayName) $pr.DisplayValue
        }
    }
    foreach ($q in @(Get-NetQosPolicy -ErrorAction SilentlyContinue | Where-Object { $_.Name -like ($QosTag + '*') })) {
        & $add 'qos' ($q.Name.Substring($QosTag.Length)) ('DSCP ' + $q.DSCPAction)
    }
    $plan = Get-CimInstance -Namespace 'root\cimv2\power' -ClassName Win32_PowerPlan -Filter 'IsActive=True' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($plan -and $plan.ElementName) { & $add 'power' 'Active power plan' $plan.ElementName } else { & $add 'power' 'Active power plan' (Get-ActiveScheme) }
    & $add 'power' 'Network throttling index' (Show (RGet $MM 'NetworkThrottlingIndex'))
    & $add 'power' 'System responsiveness' (Show (RGet $MM 'SystemResponsiveness'))
    $cp = RGet ($IFEO + '\javaw.exe\PerfOptions') 'CpuPriorityClass'
    $cpTxt = 'normal'
    if ("$cp" -eq '3') { $cpTxt = 'high' }
    & $add 'power' 'Minecraft CPU priority' $cpTxt
    Result @{ kind = 'status'; rows = $rows.ToArray() }
    return 0
}
