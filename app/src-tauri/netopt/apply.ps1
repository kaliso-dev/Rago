# Network Optimizer engine, apply part: sealed with the Premium scripts, appended to common.ps1 by netopt.rs.

function Take-Snapshot {
    if (Test-Path -LiteralPath $Snap) { return }
    Title 'Saving your current settings (first apply only)'
    $s = [ordered]@{}
    $s.version = 2
    $s.date = (Get-Date).ToString('yyyy-MM-dd HH:mm')
    $t = Get-NetTCPSetting -SettingName Internet -ErrorAction SilentlyContinue | Select-Object -First 1
    $s.tcp = [ordered]@{
        Tune = "$($t.AutoTuningLevelLocal)"; Ccp = "$($t.CongestionProvider)"; IRto = "$($t.InitialRtoMs)"
        MinRto = "$($t.MinRtoMs)"; Icw = "$($t.InitialCongestionWindowMss)"; AckTo = "$($t.DelayedAckTimeoutMs)"
        AckFreq = "$($t.DelayedAckFrequency)"; Ts = "$($t.Timestamps)"; Ecn = "$($t.EcnCapability)"; NonSack = "$($t.NonSackRttResiliency)"
    }
    $o = Get-NetOffloadGlobalSetting -ErrorAction SilentlyContinue
    $s.offload = [ordered]@{ Rsc = "$($o.ReceiveSegmentCoalescing)"; Pcf = "$($o.PacketCoalescingFilter)" }
    $adv = New-Object System.Collections.Generic.List[object]
    $pms = New-Object System.Collections.Generic.List[object]
    foreach ($a in (Get-AllNics)) {
        foreach ($p in @(Get-NetAdapterAdvancedProperty -Name $a.Name -ErrorAction SilentlyContinue)) {
            if ($AllKw -contains $p.RegistryKeyword) {
                $adv.Add([ordered]@{ Desc = $a.InterfaceDescription; Kw = $p.RegistryKeyword; Val = (@($p.RegistryValue) -join ',') })
            }
        }
        $pm = Get-NetAdapterPowerManagement -Name $a.Name -ErrorAction SilentlyContinue
        if ($pm) {
            $pms.Add([ordered]@{ Desc = $a.InterfaceDescription; Allow = "$($pm.AllowComputerToTurnOffDevice)"; D0 = "$($pm.D0PacketCoalescing)"
                                 Sel = "$($pm.SelectiveSuspend)"; Sleep = "$($pm.DeviceSleepOnDisconnect)" })
        }
    }
    $s.adv = $adv.ToArray()
    $s.pm = $pms.ToArray()
    $s.mtu = @(Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue | ForEach-Object { [ordered]@{ Alias = $_.InterfaceAlias; Mtu = "$($_.NlMtu)" } })
    $s.pacer = @(Get-NetAdapterBinding -ComponentID ms_pacer -ErrorAction SilentlyContinue | ForEach-Object { [ordered]@{ Name = $_.Name; On = [bool]$_.Enabled } })
    $reg = New-Object System.Collections.Generic.List[object]
    foreach ($r in (Get-Tracked)) {
        $v = RGet $r.P $r.N
        $val = ''
        if ($null -ne $v) { $val = "$v" }
        $reg.Add([ordered]@{ P = $r.P; N = $r.N; T = $r.T; E = ($null -ne $v); V = $val })
    }
    $s.reg = $reg.ToArray()
    $s.scheme = Get-ActiveScheme
    $wp = New-Object System.Collections.Generic.List[object]
    foreach ($g in (Get-Schemes)) { $ix = Get-WifiPow $g; if ($ix) { $wp.Add([ordered]@{ G = $g; AC = $ix[0]; DC = $ix[1] }) } }
    $s.wifipow = $wp.ToArray()
    try {
        ConvertTo-Json -InputObject $s -Depth 6 | Set-Content -LiteralPath $Snap -Encoding UTF8 -ErrorAction Stop
        Log 'OK' 'Backup of your current settings saved'
    } catch { Log 'X' 'Could not write the backup, nothing will be changed'; Summary; exit 2 }
}

function Do-Apply {
    Take-Snapshot
    Load-Snapshot
    $nics = Get-Nics
    $n = 0; $steps = 11

    Title 'TCP'
    $cur = Get-NetTCPSetting -SettingName Internet -ErrorAction SilentlyContinue | Select-Object -First 1
    $tune = EnvStr 'C_TUNE' 'keep'
    if ($tune -ne 'keep') {
        if (NS @('int', 'tcp', 'set', 'global', ('autotuninglevel=' + $tune))) { Log 'OK' ('TCP receive window: ' + $tune) }
        else { Log '!' ('TCP receive window refused: ' + $script:nsOut) }
    }
    $g = [ordered]@{
        'initialrto'           = @((EnvStr 'C_IRTO' '1000'), 'Initial retransmission timeout, ms')
        'timestamps'           = @((EnvStr 'C_TS' 'disabled'), 'TCP timestamps')
        'nonsackrttresiliency' = @((EnvStr 'C_NONSACK' 'disabled'), 'RTT resiliency')
        'ecncapability'        = @((EnvStr 'C_ECN' 'disabled'), 'ECN')
        'rss'                  = @('enabled', 'Receive side scaling')
    }
    foreach ($k in $g.Keys) {
        if (NS @('int', 'tcp', 'set', 'global', ($k + '=' + $g[$k][0]))) { Log 'OK' ($g[$k][1] + ': ' + $g[$k][0]) }
        else { Log '!' ($g[$k][1] + ' refused by Windows: ' + $script:nsOut) }
    }
    $ccp = EnvStr 'C_CCP' 'keep'
    if ($ccp -ne 'keep') {
        if (NS @('int', 'tcp', 'set', 'supplemental', 'template=internet', ('congestionprovider=' + $ccp))) { Log 'OK' ('Congestion provider: ' + $ccp) }
        else { Log '!' ('Congestion provider ' + $ccp + ' is not available on this Windows, kept ' + "$($cur.CongestionProvider)") }
    }
    # Windows locks these on most home editions: try, and say so when locked
    $rtoNote = 'RACK and Tail Loss Probe still re-send lost packets early'
    $ackNote = 'The ACK setting per interface below does the job'
    $sup = New-Object System.Collections.Generic.List[object]
    $sup.Add(@('minrto', (EnvInt 'C_MINRTO' 300), "$($cur.MinRtoMs)", 'Minimum retransmission timeout, ms', $rtoNote))
    $sup.Add(@('delayedacktimeout', (EnvInt 'C_ACKTO' 40), "$($cur.DelayedAckTimeoutMs)", 'Delayed ACK timeout, ms', $ackNote))
    $sup.Add(@('delayedackfrequency', (EnvInt 'C_ACKFREQ' 2), "$($cur.DelayedAckFrequency)", 'Delayed ACK frequency', $ackNote))
    if ((EnvStr 'C_ICW' 'keep') -ne 'keep') { $sup.Add(@('icw', (EnvInt 'C_ICW' 10), "$($cur.InitialCongestionWindowMss)", 'Initial congestion window, MSS', 'It only matters when a connection starts')) }
    foreach ($s in $sup) {
        if ("$($s[1])" -eq $s[2]) { Log 'OK' ($s[3] + ': ' + $s[1]); continue }
        if (NS @('int', 'tcp', 'set', 'supplemental', 'template=internet', ($s[0] + '=' + $s[1]))) { Log 'OK' ($s[3] + ': ' + $s[1]) }
        else { Log '..' ($s[3] + ': locked by Windows on this edition, stays ' + $s[2] + '. ' + $s[4]) }
    }
    Step (++$n) $steps

    Title 'ACK timing and Nagle (every network interface)'
    $f = EnvInt 'C_ACKFREQ' 2; $tk = EnvInt 'C_DELACK' 2; $nd = EnvInt 'C_NODELAY' 0
    $isDefault = ($f -eq 2 -and $tk -eq 2 -and $nd -eq 0)
    $ni = 0
    foreach ($k in @(Get-ChildItem -LiteralPath $TcpIf -ErrorAction SilentlyContinue)) {
        $p = $TcpIf + '\' + $k.PSChildName
        if ($isDefault) {
            foreach ($v in @('TcpAckFrequency', 'TcpDelAckTicks', 'TCPNoDelay')) { RDel $p $v }
        } else {
            RSet $p 'TcpAckFrequency' $f 'DWord' | Out-Null
            RSet $p 'TcpDelAckTicks' $tk 'DWord' | Out-Null
            RSet $p 'TCPNoDelay' $nd 'DWord' | Out-Null
        }
        $ni++
    }
    if ($isDefault) { Log 'OK' ('ACK values back to Windows behaviour on ' + $ni + ' interfaces') }
    else { Log 'OK' ('ACK every ' + $f + ' packet, delayed ACK ticks ' + $tk + ', NoDelay ' + $nd + ' on ' + $ni + ' interfaces') }
    Step (++$n) $steps

    Title 'Packet buffering in Windows and the network card'
    if ((EnvInt 'C_NTI' 0) -eq 1) { RSet $MM 'NetworkThrottlingIndex' (-1) 'DWord' | Out-Null; Log 'OK' 'Network throttling off' }
    else { Revert-Reg $MM 'NetworkThrottlingIndex' 'DWord'; Log 'OK' 'Network throttling: original value' }
    $sr = EnvInt 'C_SYSRESP' 20
    RSet $MM 'SystemResponsiveness' $sr 'DWord' | Out-Null
    Log 'OK' ('CPU reserve for background tasks: ' + $sr + ' %')
    $rsc = 'Disabled'
    if ((EnvInt 'C_RSC' 0) -ne 1) { $rsc = 'Enabled'; if ($script:S -and $script:S.offload.Rsc) { $rsc = $script:S.offload.Rsc } }
    Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing $rsc -ErrorAction SilentlyContinue
    if ($?) { Log 'OK' ('Receive segment coalescing: ' + $rsc.ToLower()) }
    $pcf = $null
    if ((EnvInt 'C_PCF' 0) -eq 1) { $pcf = 'Disabled' } elseif ($script:S -and $script:S.offload.Pcf) { $pcf = $script:S.offload.Pcf }
    if ($pcf) {
        Set-NetOffloadGlobalSetting -PacketCoalescingFilter $pcf -ErrorAction SilentlyContinue
        if ($?) { Log 'OK' ('Packet coalescing filter: ' + $pcf.ToLower()) }
    }
    $im = EnvInt 'C_IM' 0
    foreach ($a in $nics) {
        Want-Kw $a '*FlowControl' ((EnvInt 'C_FC' 0) -eq 1) @('0')
        foreach ($kw in @('*LsoV2IPv4', '*LsoV2IPv6', '*LsoV1IPv4')) { Want-Kw $a $kw ((EnvInt 'C_LSO' 0) -eq 1) @('0') }
        Want-Kw $a '*PacketCoalescing' (((EnvInt 'C_PCF' 0) -eq 1) -or ((On 'O_WIFI') -and (Test-Wifi $a))) @('0')
        foreach ($kw in @('*RscIPv4', '*RscIPv6')) { Want-Kw $a $kw ((EnvInt 'C_RSC' 0) -eq 1) @('0') }
        Want-Kw $a 'ITR' ($im -eq 1) @('200')
        Want-Kw $a '*InterruptModeration' ($im -eq 2) @('0')
    }
    if ($nics.Count -eq 0) { Log '!' 'No connected network card found' }
    Step (++$n) $steps

    Title 'Power saving'
    foreach ($a in $nics) {
        foreach ($kw in $KwPower) { Want-Kw $a $kw (On 'O_NPS') @('0') }
        if (On 'O_NPS') { Set-Pm $a 'off' } else { Set-Pm $a 'orig' }
    }
    $sch = Get-ActiveScheme
    if ((On 'O_NPS') -or (On 'O_WIFI')) {
        if ($sch) { Set-WifiPow $sch 0 0; Refresh-Scheme; Log 'OK' 'Wi-Fi card power saving: maximum performance' }
    } elseif ($script:S) {
        foreach ($w in @($script:S.wifipow)) { Set-WifiPow $w.G ([Convert]::ToInt32($w.AC, 16)) ([Convert]::ToInt32($w.DC, 16)) }
        Refresh-Scheme
    }
    if (On 'O_NPS') { Log 'OK' 'Network power saving features off' }
    Step (++$n) $steps

    Title 'Wi-Fi at full power'
    $wifiNics = @($nics | Where-Object { Test-Wifi $_ })
    if ($wifiNics.Count -eq 0) { Log '..' 'No Wi-Fi card connected, nothing to do' }
    foreach ($a in $wifiNics) {
        if (On 'O_WIFI') {
            Set-KwByLabel $a 'RoamAggressiveness' '^\s*1[\.\)]'
            Set-Kw $a 'uAPSDSupport' @('0')
            Set-KwByLabel $a 'MIMOPowerSaveMode' 'No SMPS'
            Log 'OK' ($a.Name + ': Wi-Fi at full power')
        } else {
            foreach ($kw in $KwWifi) { Revert-Kw $a $kw }
        }
    }
    Step (++$n) $steps

    Restart-Nics
    Step (++$n) $steps

    Title 'MTU'
    $mode = EnvInt 'O_MTUMODE' 0
    if ($mode -eq 0) { Log 'OK' 'MTU left as is' }
    else {
        $ifc = Get-MainIf
        if (-not $ifc) { Log '!' 'No connected interface found, MTU unchanged' }
        else {
            $m = $null
            if ($mode -eq 1) {
                $ip = Get-Target
                if ($ip) { Log '..' ('Measuring the MTU towards ' + $ip + '...'); $m = Find-Mtu $ip }
                if (-not $m -and $ip -ne '1.1.1.1') { $ip = '1.1.1.1'; Log '..' 'No answer, measuring towards 1.1.1.1 instead...'; $m = Find-Mtu $ip }
                if ($m -and $m -lt 1400) { $m2 = Find-Mtu $ip; if ($m2 -gt $m) { $m = $m2 } }
                if ($m -and $m -lt 1280) { Log '!' ('Measured MTU ' + $m + ' looks wrong (lost pings?), left as is'); $m = $null; $mode = -1 }
            } else { $m = EnvInt 'O_MTU' 1500 }
            if ($mode -eq -1) { }
            elseif (-not $m) { Log '!' 'MTU could not be measured (ping blocked), left as is' }
            elseif ([int]$ifc.NlMtu -eq $m) { Log 'OK' ('MTU ' + $m + ' on ' + $ifc.InterfaceAlias + ', already right') }
            elseif (NS @('interface', 'ipv4', 'set', 'subinterface', $ifc.InterfaceAlias, ('mtu=' + $m), 'store=persistent')) {
                Log 'OK' ('MTU ' + $m + ' on ' + $ifc.InterfaceAlias + ' (was ' + $ifc.NlMtu + ')')
            } else { Log 'X' ('Could not set MTU ' + $m + ' on ' + $ifc.InterfaceAlias) }
        }
    }
    Step (++$n) $steps

    Title 'Game traffic priority'
    Remove-QosOurs
    if (On 'O_SMART') {
        $d = EnvInt 'C_DSCP' 0
        if ($d -gt 0) {
            $ok = 0
            foreach ($e in $Games) {
                $pol = New-NetQosPolicy -Name ($QosTag + 'Game_' + $e) -AppPathNameMatchCondition $e -DSCPAction $d -NetworkProfile All -ErrorAction SilentlyContinue
                if ($pol) { $ok++ }
            }
            if ($ok -gt 0) { Log 'OK' ('Minecraft packets marked DSCP ' + $d + ' (javaw, java, Minecraft.Windows)') } else { Log 'X' 'Could not create the QoS policies' }
        } else { Log '..' 'DSCP level is 0: Minecraft packets are not marked' }
        foreach ($e in $BgApps) {
            New-NetQosPolicy -Name ($QosTag + 'Bg_' + $e) -AppPathNameMatchCondition $e -DSCPAction 8 -NetworkProfile All -ErrorAction SilentlyContinue | Out-Null
        }
        Log 'OK' 'Big downloaders marked as background, CS1'
        RSet $QosK 'Do not use NLA' '1' 'String' | Out-Null
        foreach ($b in @(Get-NetAdapterBinding -ComponentID ms_pacer -ErrorAction SilentlyContinue)) {
            if (-not $b.Enabled) {
                Enable-NetAdapterBinding -Name $b.Name -ComponentID ms_pacer -ErrorAction SilentlyContinue
                Log 'OK' ('QoS Packet Scheduler turned back on for ' + $b.Name + ', needed for the marks')
            }
        }
    } else {
        Revert-Reg $QosK 'Do not use NLA' 'String'
        Log 'OK' 'Game traffic priority off, QoS policies removed'
    }
    Step (++$n) $steps

    Title 'High CPU priority for Minecraft'
    foreach ($e in $Games) {
        $k = $IFEO + '\' + $e + '\PerfOptions'
        if (On 'O_PMODE') { RSet $k 'CpuPriorityClass' 3 'DWord' | Out-Null }
        else { Revert-Reg $k 'CpuPriorityClass' 'DWord'; Clean-Ifeo $e }
    }
    if (On 'O_PMODE') {
        Log 'OK' 'Minecraft starts with High CPU priority'
        foreach ($pn in @('javaw', 'java', 'Minecraft.Windows')) {
            foreach ($pr in @(Get-Process -Name $pn -ErrorAction SilentlyContinue)) {
                try { $pr.PriorityClass = 'High'; Log 'OK' ('Running ' + $pr.ProcessName + ' (' + $pr.Id + ') set to High now') } catch { }
            }
        }
    } else { Log 'OK' 'High CPU priority for Minecraft off' }
    Step (++$n) $steps

    Title 'Windows gaming performance'
    $comp = @(
        @($PrioK, 'Win32PrioritySeparation', 38, 'DWord'),
        @($DvrK, 'GameDVR_Enabled', 0, 'DWord'),
        @($CapK, 'AppCaptureEnabled', 0, 'DWord'),
        @($GbK, 'AutoGameModeEnabled', 1, 'DWord'),
        @($GTask, 'GPU Priority', 8, 'DWord'),
        @($GTask, 'Priority', 6, 'DWord'),
        @($GTask, 'Scheduling Category', 'High', 'String'),
        @($GTask, 'SFIO Priority', 'High', 'String')
    )
    foreach ($c in $comp) {
        if (On 'O_COMP') { RSet $c[0] $c[1] $c[2] $c[3] | Out-Null } else { Revert-Reg $c[0] $c[1] $c[3] }
    }
    if (On 'O_COMP') {
        # High performance only replaces the plans Windows ships: a custom plan (Rago Low Latency) stays, and a
        # Ryzen X3D with two CCDs keeps Balanced, which AMD needs to keep the game on the 3D cache
        $act = Get-ActiveScheme
        if (On 'RN_X3D') { Log '..' 'Ryzen X3D with two CCDs: AMD needs the Balanced plan, power plan kept' }
        elseif ($act -and $act -ne $Balanced -and $act -ne $PowerSaver -and $act -ne $HighPerf) { Log '..' 'Your own power plan is active (Rago Low Latency or another), kept' }
        else {
            if ($act -ne $HighPerf) { powercfg /setactive $HighPerf 2>$null | Out-Null }
            if ((Get-ActiveScheme) -eq $HighPerf) { Log 'OK' 'Power plan: High performance' }
            else { Log '!' 'No High performance plan on this PC (Modern Standby laptop?), current plan kept' }
        }
        if ((On 'O_NPS') -or (On 'O_WIFI')) { Set-WifiPow (Get-ActiveScheme) 0 0; Refresh-Scheme }
        Log 'OK' 'Game Mode on, Game DVR off, foreground boost, game task priority high'
    } else {
        if ($script:S -and $script:S.scheme -and (Get-ActiveScheme) -eq $HighPerf -and $script:S.scheme -ne $HighPerf) {
            powercfg /setactive $script:S.scheme 2>$null | Out-Null
            Log 'OK' 'Power plan back to your original plan'
        }
        Log 'OK' 'Windows gaming performance back to normal'
    }
    Step (++$n) $steps

    Title 'Windows Update sharing'
    $doBefore = RGet $DoK 'DownloadMode'
    if (On 'O_BGUARD') {
        if (RSet $DoK 'DownloadMode' 0 'DWord') { Log 'OK' 'Windows Update no longer uploads to other PCs' }
        else { Log '!' 'Delivery Optimization setting not found' }
    } else { Revert-Reg $DoK 'DownloadMode' 'DWord'; Log 'OK' 'Windows Update sharing back to normal' }
    if ("$doBefore" -ne "$(RGet $DoK 'DownloadMode')") { Restart-Service -Name DoSvc -Force -ErrorAction SilentlyContinue }
    Step (++$n) $steps

    ipconfig /flushdns 2>$null | Out-Null
    Summary
    return 0
}
