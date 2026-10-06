 



-------------------------------




:: HITREG (BUTTON ONE)







: BESTHITREG
REG DELETE "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /f >nul 2>&1
powershell -Command "& {Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal Normal}" >nul 2>&1
powershell -Command "& {Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Disabled}" >nul 2>&1




: BALANCED
REG DELETE "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /f >nul 2>&1
powershell -Command "& {Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal HighlyRestricted}" >nul 2>&1
powershell -Command "& {Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Enabled}" >nul 2>&1




: DEFAULT
REG DELETE "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /f >nul 2>&1
powershell -Command "& {Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal Normal}" >nul 2>&1
powershell -Command "& {Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Enabled}" >nul 2>&1




: SLOWLEST
REG DELETE "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /f >nul 2>&1
powershell -Command "& {Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal Restricted}" >nul 2>&1
powershell -Command "& {Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Disabled}" >nul 2>&1











:BETTERHITREG
REG DELETE "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /f >nul 2>&1
powershell -Command "& {Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal HighlyRestricted}" >nul 2>&1
powershell -Command "& {Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Disabled}" >nul 2>&1



:HYPIXEL
REG ADD "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /t REG_DWORD /d 128 /f >nul 2>&1
powershell -Command "& {Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal Restricted}" >nul 2>&1
powershell -Command "& {Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing Enabled}" >nul 2>&1








-------------------------------








:: PACKET OPTIMIZATION (SECOND BUTTON)




:HITREG OPTION

netsh interface ip set global taskoffload=disabled >nul 2>&1
netsh interface tcp set global chimney=disabled >nul 2>&1
netsh interface tcp set global rss=disabled >nul 2>&1
netsh interface ipv4 set subinterface "%adapter_name%" mtu=1400 store=persistent >nul 2>&1
netsh interface tcp set global autotuninglevel=normal >nul 2>&1
netsh interface tcp set global congestionprovider=none >nul 2>&1
netsh interface tcp set global ecncapability=disabled >nul 2>&1
netsh interface tcp set global timestamps=enabled >nul 2>&1
netsh interface tcp set global dca=disabled >nul 2>&1
netsh interface tcp set global netdma=disabled >nul 2>&1
netsh interface tcp set global rsc=disabled >nul 2>&1
netsh interface tcp set global fastopen=disabled >nul 2>&1
netsh interface tcp set global initialrto=3000ms >nul 2>&1
netsh interface tcp set global minrto=3000ms >nul 2>&1
netsh interface tcp set global maxsynretransmissions=5 >nul 2>&1
netsh interface tcp set global maxconnections=4294967295 >nul 2>&1
netsh interface tcp set global dynamicport start=49152 num=16384 >nul 2>&1
netsh interface tcp set global maxuserport=65535 >nul 2>&1
netsh interface tcp set global sackopts=disabled >nul 2>&1
netsh interface tcp set global synattackprotect=disabled >nul 2>&1
netsh interface tcp set global initialCongestionControlLevel=0 >nul 2>&1
netsh interface tcp set global initialCongestionWindow=1 >nul 2>&1
netsh interface tcp set global nonlocalsource=enabled >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxDataRetransmissions /t REG_DWORD /d 5 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v MaxUserPort /t REG_DWORD /d 65534 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpTimedWaitDelay /t REG_DWORD /d 30 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxConnectRetransmissions /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpNumConnections /t REG_DWORD /d 500 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DisableTaskOffload /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpWindowSize /t REG_DWORD /d 65536 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v GlobalMaxTcpWindowSize /t REG_DWORD /d 65536 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v EnablePMTUDiscovery /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v SackOpts /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v Tcp1323Opts /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxDupAcks /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxHalfOpen /t REG_DWORD /d 100 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxHalfOpenRetried /t REG_DWORD /d 80 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpUseRFC1122UrgentPointer /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DynamicNetworkAdaption /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v AdaptiveCongestionControl /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v EnhancedTaskOffloading /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v CustomizedMTU /t REG_DWORD /d 1400 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPFastOpen /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v AggressiveTCPOptimization /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v OptimizedBufferSizes /t REG_DWORD /d 65536 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v MaxSYNRetransmissions /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DynamicPortRange /t REG_DWORD /d 1025 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v MaxUserPortSettings /t REG_DWORD /d 65534 /f >nul 2>&1
Netsh int tcp set global initialRto=300 > nul 2>&1
Netsh int ip set interface ethernet currenthoplimit=255 > nul 2>&1
Netsh int tcp set global nonsackrttresiliency=enabled > nul 2>&1
Netsh int tcp set global timestamps=enabled > nul 2>&1
Netsh int tcp set global congestionprovider=ctcp > nul 2>&1
Netsh int tcp set global dca=enabled > nul 2>&1
Netsh int tcp set global netdma=enabled > nul 2>&1
Netsh int tcp set global rss=enabled > nul 2>&1
Netsh int tcp set global autotuninglevel=experimental > nul 2>&1
Netsh int tcp set supplemental template=custom icw=20 > nul 2>&1
Netsh int isatap set state disabled > nul 2>&1
Netsh int tcp set global ecncapability=disabled > nul 2>&1





: QOS OPTION

reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Version" /t REG_SZ /d "1.0" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Application Name" /t REG_SZ /d "javaw.exe" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Protocol" /t REG_SZ /d "*" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Local Port" /t REG_SZ /d "*" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Local IP" /t REG_SZ /d "*" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Local IP Prefix Length" /t REG_SZ /d "*" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Remote Port" /t REG_SZ /d "25565" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Remote IP" /t REG_SZ /d "*" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Remote IP Prefix Length" /t REG_SZ /d "*" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "DSCP Value" /t REG_DWORD /d 46 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\QoS\javaw.exe" /v "Throttle Rate" /t REG_SZ /d "Disabled" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DefaultTTL /t REG_DWORD /d 64 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DisableTaskOffload /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxDataRetransmissions /t REG_DWORD /d 3 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpWindowSize /t REG_DWORD /d 65536 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v GlobalMaxTcpWindowSize /t REG_DWORD /d 65536 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v EnablePMTUDiscovery /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v SackOpts /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v Tcp1323Opts /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxDupAcks /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxHalfOpen /t REG_DWORD /d 100 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxHalfOpenRetried /t REG_DWORD /d 80 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpUseRFC1122UrgentPointer /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v EnableDCA /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpDelAckTicks /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f >nul 2>&1




: KNOCKBACK OPTION

netsh interface ip set global taskoffload=enabled >nul 2>&1
netsh interface tcp set global chimney=enabled >nul 2>&1
netsh interface tcp set global rss=enabled >nul 2>&1
netsh interface ipv4 set subinterface "%adapter_name%" mtu=1500 store=persistent >nul 2>&1
netsh interface tcp set global autotuninglevel=normal >nul 2>&1
netsh interface tcp set global congestionprovider=ctcp >nul 2>&1
netsh interface tcp set global ecncapability=enabled >nul 2>&1
netsh interface tcp set global timestamps=enabled >nul 2>&1
netsh interface tcp set global dca=enabled >nul 2>&1
netsh interface tcp set global netdma=enabled >nul 2>&1
netsh interface tcp set global rsc=enabled >nul 2>&1
netsh interface tcp set global fastopen=enabled >nul 2>&1
netsh interface tcp set global initialrto=300ms >nul 2>&1
netsh interface tcp set global minrto=300ms >nul 2>&1
netsh interface tcp set global maxsynretransmissions=2 >nul 2>&1
netsh interface tcp set global maxconnections=65535 >nul 2>&1
netsh interface tcp set global dynamicport start=1025 num=64511 >nul 2>&1
netsh interface tcp set global maxuserport=65534 >nul 2>&1
netsh interface tcp set global sackopts=enabled >nul 2>&1
netsh interface tcp set global synattackprotect=enabled >nul 2>&1
netsh interface tcp set global initialCongestionControlLevel=1 >nul 2>&1
netsh interface tcp set global initialCongestionWindow=2 >nul 2>&1
netsh interface tcp set global nonlocalsource=disabled >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxDataRetransmissions /t REG_DWORD /d 3 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v MaxUserPort /t REG_DWORD /d 65534 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpTimedWaitDelay /t REG_DWORD /d 30 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxConnectRetransmissions /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpNumConnections /t REG_DWORD /d 1000 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DisableTaskOffload /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpWindowSize /t REG_DWORD /d 131072 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v GlobalMaxTcpWindowSize /t REG_DWORD /d 131072 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v EnablePMTUDiscovery /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v SackOpts /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v Tcp1323Opts /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxDupAcks /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxHalfOpen /t REG_DWORD /d 200 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpMaxHalfOpenRetried /t REG_DWORD /d 160 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpUseRFC1122UrgentPointer /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DynamicNetworkAdaption /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v AdaptiveCongestionControl /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v EnhancedTaskOffloading /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v CustomizedMTU /t REG_DWORD /d 1500 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPFastOpen /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v AggressiveTCPOptimization /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v OptimizedBufferSizes /t REG_DWORD /d 131072 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v MaxSYNRetransmissions /t REG_DWORD /d 2 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v DynamicPortRange /t REG_DWORD /d 1025 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v MaxUserPortSettings /t REG_DWORD /d 65534 /f >nul 2>&1









-------------------------------










:: PING OPTIMIZATION (THIRD BUTTON) 








: CONFIG 1

PowerShell.exe Set-NetTCPSetting -SettingName Internet -AutoTuningLevelLocal disabled
PowerShell.exe Set-NetTCPSetting -SettingName Internet -ScalingHeuristics disabled
netsh int tcp set supplemental internet congestionprovider=ctcp
PowerShell.exe Set-NetOffloadGlobalSetting -ReceiveSegmentCoalescing enabled
PowerShell.exe Set-NetOffloadGlobalSetting -ReceiveSideScaling disabled
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_MAXCONNECTIONSPER1_0SERVER" /v explorer.exe /t REG_DWORD /d 10 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_MAXCONNECTIONSPER1_0SERVER" /v iexplore.exe /t REG_DWORD /d 10 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_MAXCONNECTIONSPERSERVER" /v explorer.exe /t REG_DWORD /d 10 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_MAXCONNECTIONSPERSERVER" /v iexplore.exe /t REG_DWORD /d 10 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v LocalPriority /t REG_DWORD /d 4 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v HostsPriority /t REG_DWORD /d 5 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v DnsPriority /t REG_DWORD /d 6 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v NetbtPriority /t REG_DWORD /d 7 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\C4ACCD00-2BA5-4F33-BF5C-400798FD0DE6" /v TcpAckFrequency /t REG_DWORD /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\122AFB68-2BA4-4655-AA09-0170AA1FD04C" /v TcpAckFrequency /t REG_DWORD /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPNoDelay /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\MSMQ\Parameters" /v TCPNoDelay /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f >nul 2>&1
netsh int tcp set heuristics disabled
netsh int ip set global taskoffload=disabled
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d "4294967295" /f
for /f %%i in ('wmic path win32_NetworkAdapter get PNPDeviceID') do set "str=%%i" & (
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MSISupported" /t REG_DWORD /d "1" /f
)
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v InterfaceMetric /t REG_DWORD /d "55" /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TCPNoDelay /t REG_DWORD /d "1" /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpAckFrequency /t REG_DWORD /d "1" /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpDelAckTicks /t REG_DWORD /d "0" /f
cls 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "LocalPriority" /t REG_DWORD /d "4" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "HostsPriority" /t REG_DWORD /d "5" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "DnsPriority" /t REG_DWORD /d "6" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "NetbtPriority" /t REG_DWORD /d "7" /f







: CONFIG 2

for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v InterfaceMetric /t REG_DWORD /d "55" /f%
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TCPNoDelay /t REG_DWORD /d "1" /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpAckFrequency /t REG_DWORD /d "1" /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpDelAckTicks /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "LocalPriority" /t REG_DWORD /d "4" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "HostsPriority" /t REG_DWORD /d "5" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "DnsPriority" /t REG_DWORD /d "6" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "NetbtPriority" /t REG_DWORD /d "7" /f
netsh int tcp set heuristics disabled
netsh int ip set global taskoffload=disabled
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d "4294967295" /f
for /f %%i in ('wmic path win32_NetworkAdapter get PNPDeviceID') do set "str=%%i" & (
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MSISupported" /t REG_DWORD /d "1" /f
)
for /f %%n in ('Reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002bE10318}" /v "*SpeedDuplex" /s ^| findstr  "HKEY"') do (
Reg.exe add "%%n" /v "AdvancedEEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*EEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnablePME" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "AutoPowerSaveModeEnabled" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "DisableDelayedPowerUp" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "AutoDisableGigabit" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableGreenEthernet" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableSavePowerNow" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnablePowerManagement" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "NicAutoPowerSaver" /t REG_SZ /d "2" /f
Reg.exe add "%%n" /v "PowerDownPll" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PowerSavingMode" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "ReduceSpeedOnPowerDown" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "S5NicKeepOverrideMacAddrV2" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableDynamicPowerGating" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableConnectedPowerGating" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "GigaLite" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "ULPMode" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableWakeOnLan" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WakeOnDisconnect" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*WakeOnMagicPacket" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "S5WakeOnLan" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*WakeOnPattern" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WakeOnLink" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "JumboPacket" /t REG_SZ /d "1514" /f 
Reg.exe add "%%n" /v "TransmitBuffers" /t REG_SZ /d "4096" /f 
Reg.exe add "%%n" /v "ReceiveBuffers" /t REG_SZ /d "1024" /f 
Reg.exe add "%%n" /v "IPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "LsoV1IPv4" /t REG_SZ /d "0" /f  
Reg.exe add "%%n" /v "LsoV2IPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "LsoV2IPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PMARPOffload" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PMNSOffload" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TCPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TCPChecksumOffloadIPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "UDPChecksumOffloadIPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "UDPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "RSS" /t REG_SZ /d "1" /f 
Reg.exe add "%%n" /v "*NumRssQueues" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "RSSProfile" /t REG_SZ /d "3" /f
Reg.exe add "%%n" /v "*FlowControl" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "FlowControlCap" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "RxAbsIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TxIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TxAbsIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "FatChannelIntolerant" /t REG_SZ /d "0" /f 
)
Reg.exe Add "HKLM\Software\Policies &#8203;:contentReference[oaicite:0]{index=0}&#8203;
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpMaxConnectRetransmissions" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "Tcp1323Opts" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpTimedWaitDelay" /t REG_DWORD /d "32" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DelayedAckFrequency" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DelayedAckTicks" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "CongestionAlgorithm" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MultihopSets" /t REG_DWORD /d "15" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "SackOpts" /t REG_DWORD /d "0" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" /v "IRPStackSize" /t REG_DWORD /d "50" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" /v "SizReqBuf" /t REG_DWORD /d "17424" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" /v "Size" /t REG_DWORD /d "3" /f > NUL 2>&1
Reg Add "HKLM\Software\Policies\Microsoft\Windows\Psched" /v "TimerResolution" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters" /v "NegativeCacheTime" /t REG_DWORD /d "0" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DoNotHoldNicBuffers" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DisableRawSecurity" /t REG_DWORD /d "1" /f > NUL 2>&1
Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "NonBlockingSendSpecialBuffering" /t REG_DWORD /d "1" /f > NUL 2>&1
Netsh int tcp set supplemental internet congestionprovider=newreno > NUL 2>&1
Netsh int tcp set supplemental internetc congestionprovider=newreno > NUL 2>&1
Netsh int tcp set supplemental compat congestionprovider=newreno > NUL 2>&1
Netsh int tcp set supplemental custom congestionprovider=newreno > NUL 2>&1
Netsh int tcp set supplemental datacenter congestionprovider=newreno > NUL 2>&1
Netsh int tcp set supplemental datacenterc congestionprovider=newreno > NUL 2>&1
Netsh int tcp set supplemental internet congestionprovider=bbr2 > NUL 2>&1
Netsh int tcp set supplemental internetc congestionprovider=bbr2 > NUL 2>&1
Netsh int tcp set supplemental compat congestionprovider=bbr2 > NUL 2>&1
Netsh int tcp set supplemental custom congestionprovider=bbr2 > NUL 2>&1
Netsh int tcp set supplemental datacenter congestionprovider=bbr2 > NUL 2>&1
Netsh int tcp set supplemental datacenterc congestionprovider=bbr2 > NUL 2>&1
for /f "tokens=*" %%A in ('reg query "HKLM\Software\Microsoft\Windows NT\CurrentVersion\NetworkCards" /v "Description" 2^>nul ^| findstr /ri "REG_SZ"') do (
    set "line=%%A"
    set "line=!line:REG_SZ=!"
    set "line=!line:~1!"

    for /f "tokens=*" %%B in ('reg query "HKLM\System\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}" /s /f "!line!" /d ^| findstr "HKEY"') do (
        reg add %%B /v "MIMOPowerSaveMode" /t REG_SZ /d "3" /f > nul 2>&1
        reg add %%B /v "PowerSavingMode" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "EnableGreenEthernet" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "*EEE" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "EnableConnectedPowerGating" /t REG_DWORD /d "0" /f > nul 2>&1
        reg add %%B /v "EnableDynamicPowerGating" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "EnableSavePowerNow" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "PnPCapabilities" /t REG_DWORD /d "24" /f > nul 2>&1
        reg add %%B /v "*NicAutoPowerSaver" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "ULPMode" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "EnablePME" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "AlternateSemaphoreDelay" /t REG_SZ /d "0" /f > nul 2>&1
        reg add %%B /v "AutoPowerSaveModeEnabled" /t REG_SZ /d "0" /f > nul 2>&1
        echo Good
    )
)







: CONFIG 3

echo Detecting Network Adapter...

for /f "skip=1 delims=" %%a in ('wmic nic where "NetConnectionStatus=2" get NetConnectionID /value 2^>nul') do (
    for /f "tokens=2 delims==" %%b in ("%%a") do (
        set "adapter_name=%%b"
    )
)

if defined adapter_name (
    echo Your current network adapter is: %adapter_name%
    echo.
    echo Tweaking Network Settings...
    echo Credit to Mathako for helping!
    echo.
    powershell -Command "Write-Host 'This might take awhile, as the changes are suppressed and nulled.' -ForegroundColor White -BackgroundColor Red"
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Flow Control' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Gigabit Master Slave Mode' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'IPv4 Checksum Offload' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Jumbo Packet' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Large Send Offload V2 (IPv4)' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Large Send Offload V2 (IPv6)' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Log Link State Event' | Set-NetAdapterAdvancedProperty -RegistryValue 16" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Maximum Number of RSS Queues' | Set-NetAdapterAdvancedProperty -RegistryValue 4" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Packet Priority & VLAN' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Receive Buffers' | Set-NetAdapterAdvancedProperty -RegistryValue 512" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'TCP Checksum Offload (IPv4)' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'TCP Checksum Offload (IPv6)' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Transmit Buffers' | Set-NetAdapterAdvancedProperty -RegistryValue 512" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'UDP Checksum Offload (IPv4)' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'UDP Checksum Offload (IPv6)' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Wait for Link' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Advanced EEE' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'ARP Offload' | Set-NetAdapterAdvancedProperty -RegistryValue 1" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Energy-Efficent Ethernet' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Gitabit Lite' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Green Ethernet' | Set-NetAdapterAdvancedProperty -RegistryValue 0">nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'NS Offload' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Power Saving Mode' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Receive Side Scaling' | Set-NetAdapterAdvancedProperty -RegistryValue 1" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Shutdown Wake-On-Lan' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Priority & VLAN' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Wake on Magic Packet' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Wake on magic packet when system is in the S0ix power state' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Wake on pattern match' | Set-NetAdapterAdvancedProperty -RegistryValue 0" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'WOL & Shutdown Link Speed' | Set-NetAdapterAdvancedProperty -RegistryValue 2" >nul 2>&1 
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Jumbo Packet' | Set-NetAdapterAdvancedProperty -RegistryValue 1514" >nul 2>&1
    powershell -Command "Get-NetAdapterAdvancedProperty -Name \"%adapter_name%\" -DisplayName 'Jumbo Frame' | Set-NetAdapterAdvancedProperty -RegistryValue 1514" >nul 2>&1
    echo Network Settings appiled successfully.
    timeout 2 > nul   
) else (
    echo Unable to detect your current network adapter.
    timeout 2 > nul
)
endlocal








: CONFIG 4 
netsh int ipv6 set state disabled
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "autodisconnect" /t REG_DWORD /d "4294967295" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "Size" /t REG_DWORD /d "3" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "EnableOplocks" /t REG_DWORD /d "0" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "IRPStackSize" /t REG_DWORD /d "20" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "SharingViolationDelay" /t REG_DWORD /d "0" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "SharingViolationRetries" /t REG_DWORD /d "0" /f 
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d "4294967295" /f
for /f %%i in ('reg query "HKLM\SYSTEM\CurrentControlSet\services\NetBT\Parameters\Interfaces" /s /f "NetbiosOptions"^| findstr "HKEY"') do Reg.exe add "%%i" /v "NetbiosOptions" /t REG_DWORD /d "2" /f
timeout /t 1 /nobreak > nul
)
netsh int tcp set global dca=enabled
for /f %%i in ('wmic path win32_NetworkAdapter get PNPDeviceID') do set "str=%%i" & (
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MSISupported" /t REG_DWORD /d "1" /f
)
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "LocalPriority" /t REG_DWORD /d "4" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "HostsPriority" /t REG_DWORD /d "5" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "DnsPriority" /t REG_DWORD /d "6" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "NetbtPriority" /t REG_DWORD /d "7" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
netsh int ip set global taskoffload=disabled
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v InterfaceMetric /t REG_DWORD /d 0000055 /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TCPNoDelay /t REG_DWORD /d 0000001 /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpAckFrequency /t REG_DWORD /d 0000001 /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpDelAckTicks /t REG_DWORD /d 0000000 /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "TCPDelAckTicks" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TCPDelAckTicks" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TCPNoDelay" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "TCPNoDelay" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\MSMQ\Parameters" /v "TCPNoDelay" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpAckFrequency" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "TcpAckFrequency" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" /v "DODownloadMode" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" /v "DownloadMode" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Settings" /v "DownloadMode" /t REG_DWORD /d "0" /f
netsh advfirewall firewall add rule name="StopThrottling" dir=in action=block remoteip=173.194.55.0/24,206.111.0.0/16 enable=yes
netsh interface tcp set heuristics disabled 
PowerShell Disable-NetAdapterLso -Name "*"
powershell "ForEach($adapter In Get-NetAdapter){Disable-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction SilentlyContinue}"
powershell "ForEach($adapter In Get-NetAdapter){Disable-NetAdapterLso -Name $adapter.Name -ErrorAction SilentlyContinue}"
POWERSHELL Disable-NetAdapterPowerManagement -Name "*" -ErrorAction SilentlyContinue
for /f %%n in ('Reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002bE10318}" /v "*SpeedDuplex" /s ^| findstr  "HKEY"') do (
Reg.exe add "%%n" /v "AutoPowerSaveModeEnabled" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "AutoDisableGigabit" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "AdvancedEEE" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "DisableDelayedPowerUp" /t REG_SZ /d "2" /f
Reg.exe add "%%n" /v "*EEE" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EEE" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnablePME" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EEELinkAdvertisement" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableGreenEthernet" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableSavePowerNow" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnablePowerManagement" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableDynamicPowerGating" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableConnectedPowerGating" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableWakeOnLan" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "GigaLite" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "NicAutoPowerSaver" /t REG_SZ /d "2" /f
Reg.exe add "%%n" /v "PowerDownPll" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "PowerSavingMode" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "ReduceSpeedOnPowerDown" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "S5NicKeepOverrideMacAddrV2" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "S5WakeOnLan" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "ULPMode" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "WakeOnDisconnect" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "*WakeOnMagicPacket" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "*WakeOnPattern" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "WakeOnLink" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f
for /f %%n in ('Reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002bE10318}" /v "*SpeedDuplex" /s ^| findstr  "HKEY"') do (
Reg.exe add "%%n" /v "AutoPowerSaveModeEnabled" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "AutoDisableGigabit" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "AdvancedEEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "DisableDelayedPowerUp" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "*EEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnablePME" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EEELinkAdvertisement" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableGreenEthernet" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableSavePowerNow" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnablePowerManagement" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableDynamicPowerGating" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableConnectedPowerGating" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableWakeOnLan" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "GigaLite" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "NicAutoPowerSaver" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "PowerDownPll" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PowerSavingMode" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "ReduceSpeedOnPowerDown" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "S5NicKeepOverrideMacAddrV2" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "S5WakeOnLan" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "ULPMode" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WakeOnDisconnect" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*WakeOnMagicPacket" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*WakeOnPattern" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WakeOnLink" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "JumboPacket" /t REG_SZ /d "1514" /f 
Reg.exe add "%%n" /v "TransmitBuffers" /t REG_SZ /d "4096" /f 
Reg.exe add "%%n" /v "ReceiveBuffers" /t REG_SZ /d "512" /f 
Reg.exe add "%%n" /v "IPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "LsoV1IPv4" /t REG_SZ /d "0" /f  
Reg.exe add "%%n" /v "LsoV2IPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "LsoV2IPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PMARPOffload" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PMNSOffload" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TCPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TCPChecksumOffloadIPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "UDPChecksumOffloadIPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "UDPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "RSS" /t REG_SZ /d "1" /f 
Reg.exe add "%%n" /v "*NumRssQueues" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "RSSProfile" /t REG_SZ /d "3" /f 
Reg.exe add "%%n" /v "*FlowControl" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "FlowControlCap" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "RxAbsIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TxIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TxAbsIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "FatChannelIntolerant" /t REG_SZ /d "0" /f 
)
Reg.exe add "HKLM\System\CurrentControlSet\Control\Nsi\{eb004a03-9b1a-11d4-9123-0050047759bc}\0" /v "0200" /t REG_BINARY /d "0000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000ff000000000000000000000000000000" /f
Reg.exe add "HKLM\System\CurrentControlSet\Control\Nsi\{eb004a03-9b1a-11d4-9123-0050047759bc}\0" /v "1700" /t REG_BINARY /d "0000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000ff000000000000000000000000000000" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Winsock" /v "MinSockAddrLength" /t REG_DWORD /d "16" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Winsock" /v "MaxSockAddrLength" /t REG_DWORD /d "16" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DefaultReceiveWindow" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DefaultSendWindow" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "FastCopyReceiveThreshold" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "FastSendDatagramThreshold" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DynamicSendBufferDisable" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "IgnorePushBitOnReceives" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "NonBlockingSendSpecialBuffering" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DisableRawSecurity" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DisableIPSourceRouting" /t REG_DWORD /d "2" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "EnableICMPRedirect" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "EnablePMTUDiscovery" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "Tcp1323Opts" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpMaxDupAcks" /t REG_DWORD /d "2" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpTimedWaitDelay" /t REG_DWORD /d "32" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "GlobalMaxTcpWindowSize" /t REG_DWORD /d "8760" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpWindowSize" /t REG_DWORD /d "8760" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MaxConnectionsPerServer" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MaxUserPort" /t REG_DWORD /d "65534" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "SackOpts" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DefaultTTL" /t REG_DWORD /d "64" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DelayedAckFrequency" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DelayedAckTicks" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "CongestionAlgorithm" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MultihopSets" /t REG_DWORD /d "15" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "FastCopyReceiveThreshold" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "FastSendDatagramThreshold" /t REG_DWORD /d "16384" /f
for /f %%n in ('wmic path win32_networkadapter get PNPDeviceID ^| findstr /L "VEN_"') do (
Reg.exe ADD "HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Enum\%%n\Device Parameters\Interrupt Management\Affinity Policy" /v "AssignmentSetOverride" /t REG_BINARY /d "04" /f
Reg.exe ADD "HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Enum\%%n\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePolicy" /t REG_DWORD /d "4" /f
Reg.exe ADD "HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Enum\%%n\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /t REG_DWORD /d "256" /f
)






















--------------














:: ADVANCED OPTIMIZATION CONFIG (BUTTON 4)




: Disable IPv6
netsh int ipv6 set state disabled







: Optimize Lanman Server
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "autodisconnect" /t REG_DWORD /d "4294967295" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "Size" /t REG_DWORD /d "3" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "EnableOplocks" /t REG_DWORD /d "0" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "IRPStackSize" /t REG_DWORD /d "20" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "SharingViolationDelay" /t REG_DWORD /d "0" /f 
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\services\LanmanServer\Parameters" /v "SharingViolationRetries" /t REG_DWORD /d "0" /f 














: Network Throttling 
Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d "4294967295" /f














: netbios over TCIP
echo %w%- Set Netbios over TCPIP %b%
for /f %%i in ('reg query "HKLM\SYSTEM\CurrentControlSet\services\NetBT\Parameters\Interfaces" /s /f "NetbiosOptions"^| findstr "HKEY"') do Reg.exe add "%%i" /v "NetbiosOptions" /t REG_DWORD /d "2" /f
)









: Enable Direct Cache Access
netsh int tcp set global dca=enabled










: MSI MOD 
for /f %%i in ('wmic path win32_NetworkAdapter get PNPDeviceID') do set "str=%%i" & (
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f
Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MSISupported" /t REG_DWORD /d "1" /f
)













: PRIORITY DNS
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "LocalPriority" /t REG_DWORD /d "4" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "HostsPriority" /t REG_DWORD /d "5" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "DnsPriority" /t REG_DWORD /d "6" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\ServiceProvider" /v "NetbtPriority" /t REG_DWORD /d "7" /f











: Onboard Processor
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DisableTaskOffload" /t REG_DWORD /d "0" /f
netsh int ip set global taskoffload=disabled











: Nagiles Algorithm
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v InterfaceMetric /t REG_DWORD /d 0000055 /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TCPNoDelay /t REG_DWORD /d 0000001 /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpAckFrequency /t REG_DWORD /d 0000001 /f
for /f %%q in ('wmic path win32_networkadapter get GUID ^| findstr "{"') do Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%q" /v TcpDelAckTicks /t REG_DWORD /d 0000000 /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "TCPDelAckTicks" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TCPDelAckTicks" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TCPNoDelay" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "TCPNoDelay" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SOFTWARE\Microsoft\MSMQ\Parameters" /v "TCPNoDelay" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpAckFrequency" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v "TcpAckFrequency" /t REG_DWORD /d "1" /f









: Limiting Features
netsh advfirewall firewall add rule name="StopThrottling" dir=in action=block remoteip=173.194.55.0/24,206.111.0.0/16 enable=yes
netsh interface tcp set heuristics disabled 










: Power Saving Mod
PowerShell Disable-NetAdapterLso -Name "*"
powershell "ForEach($adapter In Get-NetAdapter){Disable-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction SilentlyContinue}"
powershell "ForEach($adapter In Get-NetAdapter){Disable-NetAdapterLso -Name $adapter.Name -ErrorAction SilentlyContinue}"
POWERSHELL Disable-NetAdapterPowerManagement -Name "*" -ErrorAction SilentlyContinue
for /f %%n in ('Reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002bE10318}" /v "*SpeedDuplex" /s ^| findstr  "HKEY"') do (
Reg.exe add "%%n" /v "AutoPowerSaveModeEnabled" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "AutoDisableGigabit" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "AdvancedEEE" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "DisableDelayedPowerUp" /t REG_SZ /d "2" /f
Reg.exe add "%%n" /v "*EEE" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EEE" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnablePME" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EEELinkAdvertisement" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableGreenEthernet" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableSavePowerNow" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnablePowerManagement" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableDynamicPowerGating" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableConnectedPowerGating" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "EnableWakeOnLan" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "GigaLite" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "NicAutoPowerSaver" /t REG_SZ /d "2" /f
Reg.exe add "%%n" /v "PowerDownPll" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "PowerSavingMode" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "ReduceSpeedOnPowerDown" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "S5NicKeepOverrideMacAddrV2" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "S5WakeOnLan" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "ULPMode" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "WakeOnDisconnect" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "*WakeOnMagicPacket" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "*WakeOnPattern" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "WakeOnLink" /t REG_SZ /d "0" /f
Reg.exe add "%%n" /v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f
)







: Optimize Network Adapter 
for /f %%n in ('Reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4D36E972-E325-11CE-BFC1-08002bE10318}" /v "*SpeedDuplex" /s ^| findstr  "HKEY"') do (
Reg.exe add "%%n" /v "AutoPowerSaveModeEnabled" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "AutoDisableGigabit" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "AdvancedEEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "DisableDelayedPowerUp" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "*EEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EEE" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnablePME" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EEELinkAdvertisement" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableGreenEthernet" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableSavePowerNow" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnablePowerManagement" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableDynamicPowerGating" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableConnectedPowerGating" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "EnableWakeOnLan" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "GigaLite" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "NicAutoPowerSaver" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "PowerDownPll" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PowerSavingMode" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "ReduceSpeedOnPowerDown" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "S5NicKeepOverrideMacAddrV2" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "S5WakeOnLan" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "ULPMode" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WakeOnDisconnect" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*WakeOnMagicPacket" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "*WakeOnPattern" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WakeOnLink" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "JumboPacket" /t REG_SZ /d "1514" /f 
Reg.exe add "%%n" /v "TransmitBuffers" /t REG_SZ /d "4096" /f 
Reg.exe add "%%n" /v "ReceiveBuffers" /t REG_SZ /d "512" /f 
Reg.exe add "%%n" /v "IPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "LsoV1IPv4" /t REG_SZ /d "0" /f  
Reg.exe add "%%n" /v "LsoV2IPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "LsoV2IPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PMARPOffload" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "PMNSOffload" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TCPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TCPChecksumOffloadIPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "UDPChecksumOffloadIPv6" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "UDPChecksumOffloadIPv4" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "RSS" /t REG_SZ /d "1" /f 
Reg.exe add "%%n" /v "*NumRssQueues" /t REG_SZ /d "2" /f 
Reg.exe add "%%n" /v "RSSProfile" /t REG_SZ /d "3" /f 
Reg.exe add "%%n" /v "*FlowControl" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "FlowControlCap" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "RxAbsIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TxIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "TxAbsIntDelay" /t REG_SZ /d "0" /f 
Reg.exe add "%%n" /v "FatChannelIntolerant" /t REG_SZ /d "0" /f 
)








: Registry Tweaks
Reg.exe add "HKLM\System\CurrentControlSet\Control\Nsi\{eb004a03-9b1a-11d4-9123-0050047759bc}\0" /v "0200" /t REG_BINARY /d "0000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000ff000000000000000000000000000000" /f
Reg.exe add "HKLM\System\CurrentControlSet\Control\Nsi\{eb004a03-9b1a-11d4-9123-0050047759bc}\0" /v "1700" /t REG_BINARY /d "0000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000ff000000000000000000000000000000" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Winsock" /v "MinSockAddrLength" /t REG_DWORD /d "16" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Winsock" /v "MaxSockAddrLength" /t REG_DWORD /d "16" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DefaultReceiveWindow" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DefaultSendWindow" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "FastCopyReceiveThreshold" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "FastSendDatagramThreshold" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DynamicSendBufferDisable" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "IgnorePushBitOnReceives" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "NonBlockingSendSpecialBuffering" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\AFD\Parameters" /v "DisableRawSecurity" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DisableIPSourceRouting" /t REG_DWORD /d "2" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "EnableICMPRedirect" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "EnablePMTUDiscovery" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "Tcp1323Opts" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpMaxDupAcks" /t REG_DWORD /d "2" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpTimedWaitDelay" /t REG_DWORD /d "32" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "GlobalMaxTcpWindowSize" /t REG_DWORD /d "8760" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "TcpWindowSize" /t REG_DWORD /d "8760" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MaxConnectionsPerServer" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MaxUserPort" /t REG_DWORD /d "65534" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "SackOpts" /t REG_DWORD /d "0" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DefaultTTL" /t REG_DWORD /d "64" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DelayedAckFrequency" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "DelayedAckTicks" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "CongestionAlgorithm" /t REG_DWORD /d "1" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "MultihopSets" /t REG_DWORD /d "15" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "FastCopyReceiveThreshold" /t REG_DWORD /d "16384" /f
Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v "FastSendDatagramThreshold" /t REG_DWORD /d "16384" /f








: Network Adapter Priority 
for /f %%n in ('wmic path win32_networkadapter get PNPDeviceID ^| findstr /L "VEN_"') do (
Reg.exe ADD "HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Enum\%%n\Device Parameters\Interrupt Management\Affinity Policy" /v "AssignmentSetOverride" /t REG_BINARY /d "04" /f
Reg.exe ADD "HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Enum\%%n\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePolicy" /t REG_DWORD /d "4" /f
Reg.exe ADD "HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Enum\%%n\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /t REG_DWORD /d "256" /f
)


