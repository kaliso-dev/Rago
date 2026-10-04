# Corrections apportées au .bat Premium v5.2

Généré par `tools/build_catalog.py`. Rago Hub reprend les 231 scripts du .bat
(6954 lignes de commandes) pour 189 réglages, en corrigeant ce qui ne marchait pas.

| Problème | Lignes corrigées |
|---|---|
| Rechercher/remplacer global « Disable » → « Disabling », « Enable » → « Enabling » : clés de registre, `schtasks /Disable`, `auditpol`, `Disable-MMAgent` cassés, donc sans effet | 152 |
| `reg add ... /v DevicePriority /f` sans valeur (écrit une chaîne vide au lieu de supprimer) | 14 |
| Boucles `for` dont le corps n'était pas rattaché (`do set "str=%%i" (`) : MSI GPU appliqué sur une clé `%i` inexistante | 3 |
| Chemins codés en dur sur le PC de l'auteur (profil NVIDIA, plan d'alimentation, smartctl) | 5 |

Corrections ciblées :
- Hitreg : les choix « PC modeste » et « PC portable » renvoyaient vers « PC puissant » et « PC moyen » (doublon des touches 1 et 2). Ils appliquent maintenant leur propre réglage.
- Restaurer les atténuations : SEHOP et l'ASLR restaient désactivés après le « revert ».
- Mode jeu : l'impression était coupée à l'activation et jamais relancée à la désactivation.
- `UserPreferencesMask` écrit avec des espaces (`90 00 00 00`), refusé par `reg`.
- RBW Mod : le service `CDPUserSvc_5d3cf` n'existe que sur le PC de l'auteur, remplacé par une recherche du bon nom.
- Désinstallation de Edge : chemin figé sur la version 125.0.2535.79, remplacé par une recherche de la version installée.
- Lignes collées depuis un assistant de chat (`:contentReference[oaicite:0]`) et lignes `reg add` tronquées retirées.
- Option NVIDIA « Profile Inspector » : affichait juste un message, elle importe maintenant le profil.

Retirés de l'app :
- « Windows Update Blocker » : le label existe mais ne contient aucune commande.
- « Additional Service Priorities » : écrit une variable `!mitigation_mask!` jamais définie dans `MitigationOptions` de lsass, svchost, winlogon...
- Les entrées « Apply All » : l'app permet de tout sélectionner dans une section, avec le détail de chaque réglage.

## Détail ligne par ligne

- L943: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L955: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L1078: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L1150: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L1515: `netsh interface ipv4 set subinterface “Ethernet” mtu=1500 store=persistent`
  → `netsh interface ipv4 set subinterface "%adapter_name%" mtu=1500 store=persistent`
- L1696: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L4780: `Reg.exe add "HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ /d "VRROptimizeEnabling=0;SwapEffectUpgradeEnabling=1;" /f`
  → `Reg.exe add "HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ /d "VRROptimizeEnable=0;SwapEffectUpgradeEnable=1;" /f`
- L5489: `Reg.exe add "HKLM\Software\Policies\Microsoft\SearchCompanion" /v "DisablingContentFileUpdates" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\Software\Policies\Microsoft\SearchCompanion" /v "DisableContentFileUpdates" /t REG_DWORD /d "1" /f`
- L5496: `Reg.exe add "HKLM\Software\Policies\Microsoft\Windows\Windows Search" /v "DisablingWebSearch" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\Software\Policies\Microsoft\Windows\Windows Search" /v "DisableWebSearch" /t REG_DWORD /d "1" /f`
- L5513: `Auditpol /set /subcategory:"Process Termination" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"Process Termination" /success:Disable /failure:Enable`
- L5514: `Auditpol /set /subcategory:"RPC Events" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"RPC Events" /success:Disable /failure:Enable`
- L5515: `Auditpol /set /subcategory:"Filtering Platform Connection" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"Filtering Platform Connection" /success:Disable /failure:Enable`
- L5516: `Auditpol /set /subcategory:"DPAPI Activity" /success:Disabling /failure:Disabling`
  → `Auditpol /set /subcategory:"DPAPI Activity" /success:Disable /failure:Disable`
- L5517: `Auditpol /set /subcategory:"IPsec Driver" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"IPsec Driver" /success:Disable /failure:Enable`
- L5518: `Auditpol /set /subcategory:"Other System Events" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"Other System Events" /success:Disable /failure:Enable`
- L5519: `Auditpol /set /subcategory:"Security State Change" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"Security State Change" /success:Disable /failure:Enable`
- L5520: `Auditpol /set /subcategory:"Security System Extension" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"Security System Extension" /success:Disable /failure:Enable`
- L5521: `Auditpol /set /subcategory:"System Integrity" /success:Disabling /failure:Enabling`
  → `Auditpol /set /subcategory:"System Integrity" /success:Disable /failure:Enable`
- L5822: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnablingSmartScreen" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnableSmartScreen" /t REG_DWORD /d "0" /f`
- L5824: `Reg.exe add "HKU\!USER_SID!\SOFTWARE\Microsoft\Windows\CurrentVersion\AppHost" /v "EnablingWebContentEvaluation" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKU\!USER_SID!\SOFTWARE\Microsoft\Windows\CurrentVersion\AppHost" /v "EnableWebContentEvaluation" /t REG_DWORD /d "0" /f`
- L5885: `Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v "EnablingTransparency" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v "EnableTransparency" /t REG_DWORD /d "0" /f`
- L5990: `schtasks /change /tn "\Microsoft\Windows\Application Experience\StartupAppTask" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\StartupAppTask" /Disable`
- L5992: `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector" /Disable`
- L5994: `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticResolver" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticResolver" /Disable`
- L5996: `schtasks /change /tn "\Microsoft\Windows\Power Efficiency Diagnostics\AnalyzeSystem" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Power Efficiency Diagnostics\AnalyzeSystem" /Disable`
- L6202: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\DeviceGuard" /v "EnablingVirtualizationBasedSecurity" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\DeviceGuard" /v "EnableVirtualizationBasedSecurity" /t REG_DWORD /d "0" /f`
- L6206: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisablingExceptionChainValidation" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisableExceptionChainValidation" /t REG_DWORD /d "1" /f`
- L6210: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "EnablingCfg" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "EnableCfg" /t REG_DWORD /d "0" /f`
- L6240: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisablingExceptionChainValidation" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisableExceptionChainValidation" /t REG_DWORD /d "1" /f`
- L6244: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "EnablingCfg" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "EnableCfg" /t REG_DWORD /d "1" /f`
- L6316: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator" /Disable`
- L6318: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\BthSQM" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\BthSQM" /Disable`
- L6320: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\KernelCeipTask" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\KernelCeipTask" /Disable`
- L6322: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip" /Disable`
- L6324: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Uploader" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Uploader" /Disable`
- L6326: `schtasks /change /tn "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser" /Disable`
- L6328: `schtasks /change /tn "\Microsoft\Windows\Application Experience\ProgramDataUpdater" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\ProgramDataUpdater" /Disable`
- L6330: `schtasks /change /tn "\Microsoft\Windows\Application Experience\StartupAppTask" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\StartupAppTask" /Disable`
- L6332: `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector" /Disable`
- L6334: `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticResolver" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticResolver" /Disable`
- L6336: `schtasks /change /tn "\Microsoft\Windows\Power Efficiency Diagnostics\AnalyzeSystem" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Power Efficiency Diagnostics\AnalyzeSystem" /Disable`
- L6338: `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyMonitor" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyMonitor" /Disable`
- L6340: `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyRefresh" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyRefresh" /Disable`
- L6342: `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyUpload" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyUpload" /Disable`
- L6344: `schtasks /change /tn "\Microsoft\Windows\Autochk\Proxy" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Autochk\Proxy" /Disable`
- L6346: `schtasks /change /tn "\Microsoft\Windows\Maintenance\WinSAT" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Maintenance\WinSAT" /Disable`
- L6348: `schtasks /change /tn "\Microsoft\Windows\Application Experience\AitAgent" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\AitAgent" /Disable`
- L6350: `schtasks /change /tn "\Microsoft\Windows\Windows Error Reporting\QueueReporting" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\Windows Error Reporting\QueueReporting" /Disable`
- L6352: `schtasks /change /tn "\Microsoft\Windows\CloudExperienceHost\CreateObjectTask" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\CloudExperienceHost\CreateObjectTask" /Disable`
- L6354: `schtasks /change /tn "\Microsoft\Windows\DiskFootprint\Diagnostics" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\DiskFootprint\Diagnostics" /Disable`
- L6356: `schtasks /change /tn "\Microsoft\Windows\PI\Sqm-Tasks" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\PI\Sqm-Tasks" /Disable`
- L6358: `schtasks /change /tn "\Microsoft\Windows\NetTrace\GatherNetworkInfo" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\NetTrace\GatherNetworkInfo" /Disable`
- L6360: `schtasks /change /tn "\Microsoft\Windows\AppID\SmartScreenSpecific" /Disabling`
  → `schtasks /change /tn "\Microsoft\Windows\AppID\SmartScreenSpecific" /Disable`
- L6362: `schtasks /change /tn "\Microsoft\Office\OfficeTelemetryAgentFallBack2016" /Disabling`
  → `schtasks /change /tn "\Microsoft\Office\OfficeTelemetryAgentFallBack2016" /Disable`
- L6364: `schtasks /change /tn "\Microsoft\Office\OfficeTelemetryAgentLogOn2016" /Disabling`
  → `schtasks /change /tn "\Microsoft\Office\OfficeTelemetryAgentLogOn2016" /Disable`
- L6366: `schtasks /change /TN "\Microsoft\Office\OfficeTelemetryAgentLogOn" /Disabling`
  → `schtasks /change /TN "\Microsoft\Office\OfficeTelemetryAgentLogOn" /Disable`
- L6368: `schtasks /change /TN "\Microsoftd\Office\OfficeTelemetryAgentFallBack" /Disabling`
  → `schtasks /change /TN "\Microsoftd\Office\OfficeTelemetryAgentFallBack" /Disable`
- L6370: `schtasks /change /TN "\Microsoft\Office\Office 15 Subscription Heartbeat" /Disabling`
  → `schtasks /change /TN "\Microsoft\Office\Office 15 Subscription Heartbeat" /Disable`
- L6372: `schtasks /change /TN "\Microsoft\Windows\Time Synchronization\ForceSynchronizeTime" /Disabling`
  → `schtasks /change /TN "\Microsoft\Windows\Time Synchronization\ForceSynchronizeTime" /Disable`
- L6374: `schtasks /change /TN "\Microsoft\Windows\Time Synchronization\SynchronizeTime" /Disabling`
  → `schtasks /change /TN "\Microsoft\Windows\Time Synchronization\SynchronizeTime" /Disable`
- L6376: `schtasks /change /TN "\Microsoft\Windows\WindowsUpdate\Automatic App Update" /Disabling`
  → `schtasks /change /TN "\Microsoft\Windows\WindowsUpdate\Automatic App Update" /Disable`
- L6378: `schtasks /change /TN "\Microsoft\Windows\Device Information\Device" /Disabling`
  → `schtasks /change /TN "\Microsoft\Windows\Device Information\Device" /Disable`
- L6483: `Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\WUDF" /v "LogEnabling" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\WUDF" /v "LogEnable" /t REG_DWORD /d "0" /f`
- L6485: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent" /v "DisablingThirdPartySuggestions" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent" /v "DisableThirdPartySuggestions" /t REG_DWORD /d "1" /f`
- L6486: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent" /v "DisablingWindowsConsumerFeatures" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent" /v "DisableWindowsConsumerFeatures" /t REG_DWORD /d "1" /f`
- L6809: `Reg.exe add "HKCU\Software\Microsoft\Office\Common\ClientTelemetry" /v "DisablingTelemetry" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\Common\ClientTelemetry" /v "DisableTelemetry" /t REG_DWORD /d "1" /f`
- L6813: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Outlook\Options\Mail" /v "EnablingLogging" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Outlook\Options\Mail" /v "EnableLogging" /t REG_DWORD /d "0" /f`
- L6814: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Word\Options" /v "EnablingLogging" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Word\Options" /v "EnableLogging" /t REG_DWORD /d "0" /f`
- L6816: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Common" /v "qmEnabling" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Common" /v "qmEnable" /t REG_DWORD /d "0" /f`
- L6821: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Firstrun" /v "Disablingmovie" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\Firstrun" /v "Disablemovie" /t REG_DWORD /d "1" /f`
- L6822: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM" /v "Enablinglogging" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM" /v "Enablelogging" /t REG_DWORD /d "0" /f`
- L6823: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM" /v "EnablingUpload" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM" /v "EnableUpload" /t REG_DWORD /d "0" /f`
- L6824: `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM" /v "EnablingFileObfuscation" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM" /v "EnableFileObfuscation" /t REG_DWORD /d "1" /f`
- L7031: `Reg.exe add "HKCU\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v "DisablingNotificationCenter" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKCU\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v "DisableNotificationCenter" /t REG_DWORD /d "1" /f`
- L7077: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search" /v "DisablingWebSearch" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search" /v "DisableWebSearch" /t REG_DWORD /d "0" /f`
- L7139: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator" /Disable > nul 2>&1`
- L7141: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\BthSQM" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\BthSQM" /Disable > nul 2>&1`
- L7143: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\KernelCeipTask" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\KernelCeipTask" /Disable > nul 2>&1`
- L7145: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip" /Disable > nul 2>&1`
- L7147: `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Uploader" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Customer Experience Improvement Program\Uploader" /Disable > nul 2>&1`
- L7149: `schtasks /change /tn "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser" /Disable > nul 2>&1`
- L7151: `schtasks /change /tn "\Microsoft\Windows\Application Experience\ProgramDataUpdater" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Application Experience\ProgramDataUpdater" /Disable > nul 2>&1`
- L7154: `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyMonitor" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyMonitor" /Disable > nul 2>&1`
- L7156: `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyRefresh" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyRefresh" /Disable > nul 2>&1`
- L7158: `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyUpload" /Disabling > nul 2>&1`
  → `schtasks /change /tn "\Microsoft\Windows\Shell\FamilySafetyUpload" /Disable > nul 2>&1`
- L7193: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Feeds" /v "EnablingFeeds" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Feeds" /v "EnableFeeds" /t REG_DWORD /d "0" /f`
- L7195: `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnablingActivityFeed" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnableActivityFeed" /t REG_DWORD /d "0" /f`
- L7198: `Reg.exe add "HKLM\Software\Policies\Microsoft\Windows\System" /v "EnablingActivityFeed" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\Software\Policies\Microsoft\Windows\System" /v "EnableActivityFeed" /t REG_DWORD /d "0" /f`
- L7216: `Reg.exe add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "EnablingBalloonTips" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "EnableBalloonTips" /t REG_DWORD /d "0" /f`
- L7555: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisablingTsx" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisableTsx" /t REG_DWORD /d "0" /f`
- L7629: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisablingTsx" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "DisableTsx" /t REG_DWORD /d "0" /f`
- L8306: `Reg.exe add "%%t" /v "Disabling_OverlayDSQualityEnhancement" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "%%t" /v "Disable_OverlayDSQualityEnhancement" /t REG_DWORD /d "1" /f`
- L8308: `Reg.exe add "%%t" /v "AdaptiveVsyncEnabling" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "%%t" /v "AdaptiveVsyncEnable" /t REG_DWORD /d "0" /f`
- L8309: `Reg.exe add "%%t" /v "DisablingPFonDP" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "%%t" /v "DisablePFonDP" /t REG_DWORD /d "1" /f`
- L8310: `Reg.exe add "%%t" /v "EnablingCompensationForDVI" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "%%t" /v "EnableCompensationForDVI" /t REG_DWORD /d "1" /f`
- L8407: `fsutil behavior set Disablinglastaccess 1 >nul 2>&1`
  → `fsutil behavior set Disablelastaccess 1 >nul 2>&1`
- L8894: `for /f %%i in ('call "resources\smartctl.exe" --scan') do (`
  → `for /f %%i in ('call "%RAGO_RES%\smartctl.exe" --scan') do (`
- L8895: `call "resources\smartctl.exe" -s apm,off %%i`
  → `call "%RAGO_RES%\smartctl.exe" -s apm,off %%i`
- L8896: `call "resources\smartctl.exe" -s aam,off %%i`
  → `call "%RAGO_RES%\smartctl.exe" -s aam,off %%i`
- L9209: `powercfg -import "C:\Rago Optimizer\PowerPlan\LowLatency.pow"`
  → `powercfg -import "%RAGO_RES%\LowLatency.pow"`
- L9549: `PowerShell -Command "Enabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Enable-MMAgent -MemoryCompression" > nul 2>&1`
- L9563: `PowerShell -Command "Enabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Enable-MMAgent -MemoryCompression" > nul 2>&1`
- L9577: `PowerShell -Command "Enabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Enable-MMAgent -MemoryCompression" > nul 2>&1`
- L9592: `PowerShell -Command "Disabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -MemoryCompression" > nul 2>&1`
- L9606: `PowerShell -Command "Disabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -MemoryCompression" > nul 2>&1`
- L9620: `PowerShell -Command "Disabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -MemoryCompression" > nul 2>&1`
- L9634: `PowerShell -Command "Disabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -MemoryCompression" > nul 2>&1`
- L9648: `PowerShell -Command "Disabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -MemoryCompression" > nul 2>&1`
- L9662: `PowerShell -Command "Disabling-MMAgent -MemoryCompression" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -MemoryCompression" > nul 2>&1`
- L9677: `PowerShell -Command "Disabling-MMAgent -PageCombining" > nul 2>&1`
  → `PowerShell -Command "Disable-MMAgent -PageCombining" > nul 2>&1`
- L9681: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "DisablingPagingExecutive" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "DisablePagingExecutive" /t REG_DWORD /d "1" /f`
- L9685: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" /v "EnablingPrefetcher" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" /v "EnablePrefetcher" /t REG_DWORD /d "0" /f`
- L9686: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" /v "EnablingSuperfetch" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" /v "EnableSuperfetch" /t REG_DWORD /d "0" /f`
- L9690: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "DisablingPagingExecutive" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v "DisablePagingExecutive" /t REG_DWORD /d "1" /f`
- L10335: `for /f %%i in ('wmic path Win32_VideoController get PNPDeviceID') do set "str=%%i" (`
  → `for /f %%i in ('wmic path Win32_VideoController get PNPDeviceID') do set "str=%%i" & (`
- L10337: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L10340: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /f`
  → `reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /f >nul 2>&1`
- L10582: `start "" /wait "C:\Users\Full  PC  Gamer\Desktop\Premium Program V3\extremelatencylow.nip"`
  → `if exist "%RAGO_RES%\nvidiaProfileInspector.exe" ( "%RAGO_RES%\nvidiaProfileInspector.exe" "%RAGO_RES%\extremelatencylow.nip" -silentImport ) else ( echo [skip] NVIDIA Profile Inspector introuvable )`
- L10588: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisablingWriteCombining" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisableWriteCombining" /t REG_DWORD /d "1" /f`
- L10590: `for /f %%i in ('wmic path Win32_VideoController get PNPDeviceID') do set "str=%%i" (`
  → `for /f %%i in ('wmic path Win32_VideoController get PNPDeviceID') do set "str=%%i" & (`
- L10592: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L10595: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /f`
  → `reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /f >nul 2>&1`
- L10653: `Reg.exe add "HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS" /v "EnablingRID66610" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS" /v "EnableRID66610" /t REG_DWORD /d "0" /f`
- L10654: `Reg.exe add "HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS" /v "EnablingRID64640" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS" /v "EnableRID64640" /t REG_DWORD /d "0" /f`
- L10655: `Reg.exe add "HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS" /v "EnablingRID44231" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS" /v "EnableRID44231" /t REG_DWORD /d "0" /f`
- L10656: `schtasks /change /Disabling /tn "NvTmRep_CrashReport1_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NvTmRep_CrashReport1_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10657: `schtasks /change /Disabling /tn "NvTmRep_CrashReport2_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NvTmRep_CrashReport2_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10658: `schtasks /change /Disabling /tn "NvTmRep_CrashReport3_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NvTmRep_CrashReport3_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10659: `schtasks /change /Disabling /tn "NvTmRep_CrashReport4_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NvTmRep_CrashReport4_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10660: `schtasks /change /Disabling /tn "NvDriverUpdateCheckDaily_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NvDriverUpdateCheckDaily_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10661: `schtasks /change /Disabling /tn "NVIDIA GeForce Experience SelfUpdate_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NVIDIA GeForce Experience SelfUpdate_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10662: `schtasks /change /Disabling /tn "NvTmMon_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
  → `schtasks /change /Disable /tn "NvTmMon_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"`
- L10669: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "DisablingPreemption" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "DisablePreemption" /t REG_DWORD /d "1" /f`
- L10670: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "DisablingCudaContextPreemption" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "DisableCudaContextPreemption" /t REG_DWORD /d "1" /f`
- L10671: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "EnablingCEPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "EnableCEPreemption" /t REG_DWORD /d "0" /f`
- L10672: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "DisablingPreemptionOnS3S4" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm" /v "DisablePreemptionOnS3S4" /t REG_DWORD /d "1" /f`
- L11639: `for /f %%i in ('wmic path Win32_VideoController get PNPDeviceID') do set "str=%%i" (`
  → `for /f %%i in ('wmic path Win32_VideoController get PNPDeviceID') do set "str=%%i" & (`
- L11641: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L11644: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /f`
  → `reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties" /v "MessageNumberLimit" /f >nul 2>&1`
- L11687: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisablingSAMUPowerGating" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableSAMUPowerGating" /t REG_DWORD /d "1" /f`
- L11688: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisablingUVDPowerGatingDynamic" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableUVDPowerGatingDynamic" /t REG_DWORD /d "1" /f`
- L11689: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisablingVCEPowerGating" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableVCEPowerGating" /t REG_DWORD /d "1" /f`
- L11690: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisablingPowerGating" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisablePowerGating" /t REG_DWORD /d "1" /f`
- L11694: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnablingVceSwClockGating" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnableVceSwClockGating" /t REG_DWORD /d "1" /f`
- L11697: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnablingUvdClockGating" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnableUvdClockGating" /t REG_DWORD /d "1" /f`
- L11700: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnablingAspmL0s" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnableAspmL0s" /t REG_DWORD /d "0" /f`
- L11701: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnablingAspmL1" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnableAspmL1" /t REG_DWORD /d "0" /f`
- L11704: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnablingUlps" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnableUlps" /t REG_DWORD /d "0" /f`
- L11705: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnablingUlps_NA" /t REG_SZ /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "EnableUlps_NA" /t REG_SZ /d "0" /f`
- L11719: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisablingBlockWrite" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableBlockWrite" /t REG_DWORD /d "0" /f`
- L11725: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "PP_SclkDeepSleepDisabling" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "PP_SclkDeepSleepDisable" /t REG_DWORD /d "1" /f`
- L11728: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "PP_ThermalAutoThrottlingEnabling" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "PP_ThermalAutoThrottlingEnable" /t REG_DWORD /d "0" /f`
- L11731: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "KMD_EnablingComputePreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "KMD_EnableComputePreemption" /t REG_DWORD /d "0" /f`
- L11747: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablePreemption" /t REG_DWORD /d "0" /f`
- L11749: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingAsyncMidBufferPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableAsyncMidBufferPreemption" /t REG_DWORD /d "0" /f`
- L11750: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingMidGfxPreemptionVGPU" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableMidGfxPreemptionVGPU" /t REG_DWORD /d "0" /f`
- L11751: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingMidBufferPreemptionForHighTdrTimeout" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableMidBufferPreemptionForHighTdrTimeout" /t REG_DWORD /d "0" /f`
- L11752: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingSCGMidBufferPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableSCGMidBufferPreemption" /t REG_DWORD /d "0" /f`
- L11754: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingMidGfxPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableMidGfxPreemption" /t REG_DWORD /d "0" /f`
- L11755: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingMidBufferPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableMidBufferPreemption" /t REG_DWORD /d "0" /f`
- L11756: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnablingCEPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "EnableCEPreemption" /t REG_DWORD /d "0" /f`
- L11757: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisablingCudaContextPreemption" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisableCudaContextPreemption" /t REG_DWORD /d "0" /f`
- L11758: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisablingPreemptionOnS3S4" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisablePreemptionOnS3S4" /t REG_DWORD /d "0" /f`
- L11760: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisablingPreemption" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler" /v "DisablePreemption" /t REG_DWORD /d "1" /f`
- L11779: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisablingVsyncLatencyUpdate" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisableVsyncLatencyUpdate" /t REG_DWORD /d "0" /f`
- L11780: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisablingSensorWatchdog" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisableSensorWatchdog" /t REG_DWORD /d "1" /f`
- L11813: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisablingVsyncLatencyUpdate" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisableVsyncLatencyUpdate" /t REG_DWORD /d "0" /f`
- L11814: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisablingSensorWatchdog" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v "DisableSensorWatchdog" /t REG_DWORD /d "1" /f`
- L11855: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v "RMDisablingPostL2Compression" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v "RMDisablePostL2Compression" /t REG_DWORD /d "1" /f`
- L11856: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v "RmDisablingRegistryCaching" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v "RmDisableRegistryCaching" /t REG_DWORD /d "1" /f`
- L12128: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L12143: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L12304: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters" /v "EnablingSelectiveSuspend" /t REG_DWORD /d "0" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Enum\%%i\Device Parameters" /v "EnableSelectiveSuspend" /t REG_DWORD /d "0" /f`
- L12315: `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\USB" /v "DisablingSelectiveSuspend" /t REG_DWORD /d "1" /f`
  → `Reg.exe add "HKLM\SYSTEM\CurrentControlSet\Services\USB" /v "DisableSelectiveSuspend" /t REG_DWORD /d "1" /f`
- L12319: `Reg.exe add "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f`
  → `reg delete "HKLM\System\CurrentControlSet\Enum\%%i\Device Parameters\Interrupt Management\Affinity Policy" /v "DevicePriority" /f >nul 2>&1`
- L14286: `reg add "HKEY_CURRENT_USER\Control Panel\Desktop" /v UserPreferencesMask /t REG_BINARY /d 90 00 00 00 /f`
  → `reg add "HKEY_CURRENT_USER\Control Panel\Desktop" /v UserPreferencesMask /t REG_BINARY /d 9012038010000000 /f`
