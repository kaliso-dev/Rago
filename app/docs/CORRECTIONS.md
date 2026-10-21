# Corrections apportées au .bat Premium v5.2

Généré par `tools/build_catalog.py`. Rago Hub reprend les 231 scripts du .bat
(6908 lignes de commandes) pour 189 réglages, en corrigeant ce qui ne marchait pas.

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


# Corrections apportées aux .bat v6 (Ping Optimization Final, HITREG INPUTLAG, FPS)

Ajouté par `tools/build_catalog_v6.py` après la section v5.2 ci-dessus. Les trois .bat de Sofiene
(`legacy/v6/`, 2026-10-06) rejoignent l'ancien programme : 226 réglages au total (199 réglages distincts depuis 1.1.8, voir plus bas).

Défauts de la v5.2 revenus dans les .bat v6, corrigés de la même façon (`repair`, `clean`) :
- `reg add ... /v DevicePriority|MessageNumberLimit /f` sans valeur → `reg delete` ;
- boucles `for ... do set "str=%%i" (` détachées de leur corps → `& (` et bloc refermé ;
- GUID de carte réseau du PC de l'auteur, ou clé littérale `Interfaces\{NIC-ID}` (net_server) → boucle sur toutes les cartes ;
- « Disabling » / « Enabling » remis en « Disable » / « Enable » hors echo, `USER_SID` jamais défini → `HKCU`, chemin du profil .nip sur le bureau de l'auteur ;
- `/f%` en fin de ligne (copier-coller).

Corrections ciblées (`SCRIPT_FIXES`, `DROP_LINES`) :
- in_windows : import d'un plan d'alimentation `C:\ExcusesFN` (fichier de l'auteur) retiré, dossier Temp de « justin » → `%LOCALAPPDATA%\Temp`, ligne `/s /f /q` sans son `del` ;
- in_advanced : point de restauration « Risxn » renommé « Rago Optimizer restore point » ;
- win_visual, win_apps : fenêtres MessageBox et SystemPropertiesPerformance.exe qui bloquaient le script, retirées ;
- sys_bcdedit : faute `useplatformclockJ` ;
- sto_general : `PROFILES_DIR` lu non développé, la boucle sur les profils ne tournait jamais ;
- rst_queue et in_queue « Default » : 80 et 32 → 100, la valeur de Windows ;
- game_mode : faute « Optimimizing ».
- in_windows, sto_ntfs : `fsutil behavior set DisableDeleteNotify 1` coupait le TRIM du SSD (qui le garde rapide et en
  bonne santé) sans le dire ; choix de Sofiene du 2026-10-07 : TRIM laissé actif. Ligne retirée de in_windows ; dans sto_ntfs
  elle passe à `0` (`SUB_LINES`) et rallume le TRIM, comme lat_general et exp_ntfs, pour les PC passés par l'ancien .bat v6.
  sto_ntfs a désormais les mêmes commandes que exp_ntfs (jumeaux : même texte, un seul passage).
  Le motif reste dans `WARNINGS` et le test `dangerous_lines_stay_out` vérifie qu'aucun script ne le contient plus ;
- nv_hdcp, amd_hdcp : « Disable HDCP (NVIDIA) » et « Disable HDCP (AMD) », pour ne plus avoir deux lignes identiques ;
- sto_fsutil_v6, sto_fsutil2, sys_time, sto_fsutil (variante SSD) : `disableLastAccess 0` → `1` (`SUB_LINES`). Le .bat
  ACTIVAIT la date de dernier accès alors que l'app disait la couper ; choix de Sofiene du 2026-10-07 : la couper vraiment.
  La variante disque dur (valeur 2, gérée par Windows) ne change pas ;
- sys_time renommé « File timestamps » / « Horodatage des fichiers » (il règle l'horodatage des fichiers, pas l'horloge).

Profils exclusifs découpés en variantes (ils s'exécutaient tous à la suite) : ping_hitreg (6 profils dont Default),
ping_packets (Hitreg, QoS, Knockback), ping_main (Config 1 à 4), sys_ram (selon la RAM).

RBW Mod (RAG-69, réécrit le 2026-10-13, `tools/rbw.py`) : « On » fait ce que fait Rago-RBW-Fix.ps1, le script validé
par Sofiene sur son PC, dans le même ordre, une ligne PowerShell par étape : démarrage avec Windows de SysMain, PcaSvc,
DPS, EventLog, WSearch, DusmSvc, BFE, Appinfo, Schedule, DsmSvc, DiagTrack, DcomLaunch, PlugPlay, BAM, DAM, CDPUserSvc
et de chaque CDPUserSvc_xxxx (sc config, puis Set-Service, puis la valeur Start du registre ; Windows Search remis s'il
a été retiré) ; services dont ils dépendent remis en manuel s'ils sont désactivés ; réglages lus par le vérificateur
officiel de RBW (historique d'activités, clé de stratégies AppCompat, listes de raccourcis, CMD, journal PowerShell,
Prefetch), journaux DiagLog et WdiContextLog et stratégie WDI sans lesquels DPS ne démarre pas ; lancement de chaque
service (Start-Service, sc start, net start) ; ce que voit le vérificateur, avec le code et le message de Windows pour
ce qui reste arrêté ; tâches planifiées et programmes de démarrage qui les recouperaient (lecture seule) ; verdict.
« On » lance toujours ce script, même après « Off » (`catalog::revert_runs_script`) : la sauvegarde d'avant « Off »
ne démarrait aucun service. « Off » remet ces services et réglages comme Windows les règle (Appinfo, DsmSvc et
PlugPlay en manuel) et lance ceux que Windows lance de lui-même, sans rien arrêter ; l'ancien « Off » arrêtait SysMain
et DiagTrack. Le RBW Mod ne garde pas de sauvegarde (rien à remettre) : les réglages qui coupent ces éléments gardent
la leur et affichent « Changé par Windows » après le RBW Mod. Défaire « Off » sans cliquer « On » (Tout annuler,
déconnexion, fin de Premium, désinstallation) ne lance donc rien et ne demande pas de redémarrage (`windows_values`
dans applied.json) ; un « Off » noté par une version d'avant (sauvegarde de 1.1.9, ou ancien « Off » qui passait des
services en manuel, repris de l'historique) repasse toujours par « On ».

Les actions lourdes ne sont pas retirées (choix de Sofiene, « tout garder ») : `WARNINGS` les détecte dans chaque
script (Spectre, Defender, SmartScreen, UAC, pare-feu, IFEO, BAM, Prefetch…), écrit l'avertissement « Read this first »
et passe le réglage en Advanced.

Réglages ajoutés par l'app (`NEW_TWEAKS`, 1.1.6), registre seulement donc sauvegardés et remis comme avant quand on
les décoche : win_ai (Copilot et Recall coupés par les stratégies Microsoft) et win_autoplay (exécution automatique
coupée). Premium par défaut.

Audit ligne par ligne du 2026-10-07 (rapport : /mnt/project-files/audit/audit-commandes-2026-10-07.md), 1.1.6 :
- tools/audit_fixes.py (copie de audit/outils-annulation/propositions.py) est appliqué après les corrections
  ci-dessus (`apply_audit`) : 7 corrections de texte, 3 blocs et 590 lignes retirés, 144 lignes réécrites. Les lignes
  dangereuses cachées dans les packs sont retirées (choix de Sofiene, 2026-10-07, « Retirer ») ; chaque action lourde
  reste dans son réglage dédié et annoncé. Les 8 réglages « placebo » sont gardés (choix de Sofiene, « Garder ») ;
- majeur : RBW Mod « Off » remet en automatique le journal d'événements, le Planificateur, DPS, SysMain, PCA et CDP
  (il les passait en manuel) ;
- l'avertissement UAC porte sur ConsentPromptBehaviorAdmin 0 ; la ligne EnableLUA 0 (Minecraft Launcher et applis du
  Store qui ne s'ouvrent plus) est retirée ;
- wmic, absent par défaut de Windows 11 24H2, est remplacé par PowerShell (Get-CimInstance) dans 21 réglages
  (`WMIC_SUBS`) ;
- actions ponctuelles (bouton, plus case) : sto_defrag, win_apps, app_remove, dbl_edge, nv_debloat, cpu_ppm,
  usb_controller (`ONE_SHOT`) ;
- `DROP_LINES` accepte « id:variante ».

Annulation : src-tauri/scripts/undo.json, généré à chaque build par tools/undo (undo_gen.py et defaults.py de
l'audit) depuis les scripts d'avant et d'après l'audit, réunis par merge_full.py : `full` remet les valeurs de Windows
quand il n'y a pas de sauvegarde, `rest` ce que la sauvegarde ne relève pas, `rest_avant` (pow_ultimate,
pow_delete_plans) le lance avant la sauvegarde. Chiffrée dans l'exe avec les scripts Premium ; l'app en garde une copie
par réglage appliqué, pour annuler après une déconnexion ou une fin de licence.

Priorité par jeu (pri_game), 1.2.0 (`add_games`, après l'audit) :
- Valorant visait `ValorantClient-Win64-Shipping.exe`, qui n'existe pas : rien ne s'appliquait. La variante écrit
  maintenant la stratégie QoS et la priorité haute de `VALORANT-Win64-Shipping.exe` ;
- Fortnite, CS2, Apex et GTA V : nom d'appli de la stratégie QoS faux (`cs2.exe.exe`, `FortniteClient-Win64.exe`),
  donc marquage réseau sans effet ; Apex DirectX 12 (`r5apex_dx12.exe`), GTA V Enhanced (`GTA5_Enhanced.exe`) et
  CS:GO (`csgo.exe`) ajoutés ;
- Minecraft, Fortnite, CS2, Apex et GTA V réécrits (`LEGACY_GAMES`, GAME V1 du 2026-10-21) : leurs .bat écrivaient
  111 valeurs PerfOptions par exe que Windows ignore (et un `CpuPriorityClass` 8, qui n'existe pas) ;
- dix jeux ajoutés (`GAMES`) : PUBG, Roblox, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from
  Tarkov, Rocket League, League of Legends, Minecraft Bedrock (`Minecraft.Windows.exe`). Seulement ce que Windows lit :
  stratégie QoS DSCP 46, `CpuPriorityClass` et `IoPriority` à 3 (haute) dans les PerfOptions de l'exe ;
- chaque variante écrit aussi `Do not use NLA` (chaîne « 1 ») sous `Tcpip\QoS` : hors d'un domaine d'entreprise,
  Windows n'appliquait pas la stratégie QoS sans elle (GAME V1).

Presets, 1.2.0 : enrichis de réglages sûrs sans gros inconvénient (`PRESETS`, `PRESET_EXTRA`) et un preset par jeu
(`GAME_PRESETS`) : la priorité du jeu plus un socle compétitif ou fluide. Le preset Minecraft ne touche à rien de ce
que lit le vérificateur de screenshare RBW (`RBW_TOUCHED`, vérifié au build).


# Optimisations envoyées le 2026-10-21 (1.2.0)

`tools/optis_120.py`. Sources : dump Hone.gg (Basic, General & Advanced), OptiCore-Tweaks.ps1,
Hone-Optimizations.ps1, network_optimizer.bat, [RAGO APP] GAME V1.bat. Chaque optimisation a été comparée au catalogue
(valeurs écrites, pas les noms) : déjà là, meilleure qu'un réglage existant (remplacé), nouvelle (ajoutée) ou écartée.
Les clés des journaux Hone sont reprises des fichiers « Off » quand le journal « On » les range sous une mauvaise clé.

Ajoutés (Hone, Basic) : win_taskbar, win_recent, win_highlights, win_lockscreen, win_classicmenu, win_alttab,
win_shortcut (section « Interface et confort »), dbl_onedrive_off (stratégie Microsoft, rien n'est supprimé,
contrairement à dbl_onedrive retiré en 1.1.8), win_browserbg (Edge, Chrome et Brave fermés pour de vrai).

Remplacés :
- win_visual : les 18 lignes `VisualEffects\<effet>\DefaultApplied` (valeurs que Windows note, sans les relire) →
  UserPreferencesMask (masque « meilleures performances », comme game_mode), DragFullWindows, TaskbarAnimations,
  ListviewAlphaSelect, EnableAeroPeek ; `DWMWA_TRANSITIONS_FORCEDISABLED` et `MaxAnimate`, que Windows ne lit pas, retirés ;
- in_advanced : la valeur `link` de Windows XP → `NamingTemplates\ShortcutNameTemplate`.

Écartés (Hone, Basic) : accélération matérielle des navigateurs (charge le processeur au lieu de la carte graphique),
mises à jour des navigateurs (déjà retirées en 1.1.8), option Verrouiller, Assistant de concentration (blobs datés qui
coupent aussi la règle « pendant un jeu »), Centre de mobilité, ancien volume, transparence de la barre des tâches,
menu « Prendre possession » et « priorité temps réel », icônes de la zone de notification : cosmétiques, sans effet sur
Windows 11, ou risqués. NoRecentDocsHistory laissé hors de win_recent : il vide les listes de raccourcis comme
Start_TrackDocs, que lit le vérificateur RBW.

Ajoutés (Hone, General & Advanced) : win_suggestions (recommandations de Démarrer, rappels « terminer la configuration »,
astuces en ligne des Paramètres, recherche dans le cloud), win_extensions, win_compact, win_wallpaper, dbl_browsers
(stratégies de télémétrie Edge, Chrome et Firefox ; aucun navigateur n'est supprimé), dbl_vs, net_dscp (même stratégie
QoS que pri_game pour douze jeux en ligne qu'il ne connaît pas).

Remplacés ou complétés (Hone, General & Advanced) :
- ping_packets:qos et net_profile:qos : « DSCP Value » écrit en REG_DWORD, « Throttle Rate » à `Disabled` et port
  distant 25565 seulement → tout en REG_SZ, `-1` et `*` (format des stratégies QoS de Windows) ;
- « Do not use NLA » : ajouté à pri_game (sans lui, le marquage DSCP ne s'applique pas hors domaine, donc sur un PC de
  joueur) et passé de REG_DWORD à REG_SZ dans ping_main et net_server ;
- dbl_office : stratégies Office documentées (`HKCU\Software\Policies\Microsoft\Office`) ajoutées, anciennes lignes gardées ;
- in_advanced : JPEGImportQuality 256 → 100 (Windows accepte 60 à 100) ;
- exp_startup : StartupDelayInMSec écrit aussi sous HKCU, l'endroit le plus cité.

Ajoutés (OptiCore, Hone-Optimizations.ps1, network_optimizer) : win_thispc, net_dns (DNS 1.1.1.1 et 8.8.8.8 sur les
cartes connectées ; ne baisse pas le ping en jeu, échoue sur les réseaux qui imposent leur DNS), net_intmod (modération
des interruptions coupée, comme Microsoft le conseille pour la latence ; contraire de hitreg_suite, qui l'active).

Remplacés (mêmes sources) :
- lat_directx : `HwSchedMode`, que Windows ne lit pas → `HwSchMode` ;
- win_fullscreen : DirectXUserGlobalSettings était écrasé, ce qui effaçait l'Auto HDR et les autres choix DirectX du
  joueur ; la valeur est maintenant fusionnée ;
- win_search et exp_search : DisableSearchBoxSuggestions ajouté, la stratégie documentée qui coupe vraiment le web dans la
  recherche sur Windows 10 2004+ et 11 (l'Explorateur ne liste plus les recherches récentes) ;
- amd_power : trouve chaque carte AMD au lieu d'écrire dans `\0000`, faux quand une autre carte est listée en premier ;
- net_advanced : initialRto 2000 → 1000 ms (valeur Windows et RFC 6298 ; le commentaire disait 2 ms).

Jeux ([RAGO APP] GAME V1) : pri_game:minecraft, fortnite, valorant, cs2, apex et gta écrivaient 111 valeurs PerfOptions
par jeu, dont Windows ne lit que CpuPriorityClass et IoPriority (et un CpuPriorityClass=8, classe qui n'existe pas) :
reconstruits avec game_priority() comme les autres jeux. Nouvelle variante bedrock (Minecraft.Windows.exe) et préréglage
Minecraft Bedrock ; csgo.exe ajouté à cs2. Roblox est maintenant détecté (Roblox Player ou version Microsoft Store).

Écartés (mêmes sources) : tout ce qui baisse la sécurité ou casse un usage (Defender, SmartScreen, contrôle de compte,
virtualisation et intégrité mémoire, atténuations Spectre, contournement TPM, Windows Update, Xbox, VPN, SMB2, Wi-Fi,
mot de passe sans expiration, UCPD), les placebos et services déjà au repos (HomeGroup, Insider, démo en magasin,
quotas de disque, TdrDelay), ce qui demande un programme téléchargé ou détourne taskmgr ou regedit par IFEO, les
réglages propres au PC de test (affinités PCI, instance d'écran fixe), ce que le journal ne permet pas de vérifier
(netsh, bcdedit, powercfg sans trace), le plafond de débit fixe, la région forcée (94 = Allemagne), SysMain coupé
(contredit la décision PLACEBO ci-dessus : la compression mémoire en dépend), l'optimisation plein écran coupée par jeu
(clés AppCompat lues par le vérificateur RBW), et le cosmétique sans effet sur Windows 11.

Pas encore fait (code de l'appli, à tester sous Windows) : carte graphique performante et mode d'alimentation pendant
le jeu, vérifications avant de jouer, préréglages graphiques dans les fichiers des jeux.


# Réglages risqués retirés (1.1.8)

Demande de Sofiene (2026-10-08) : `tools/safety.py`. 17 réglages quittent le catalogue, les profils et le plan gratuit. Il reste 230 entrées au catalogue, soit 217 réglages distincts : les 13 autres lancent les mêmes commandes qu'un autre réglage, sous un autre nom ou dans un autre module (champ `twin`), et c'est ce nombre distinct que l'app et le site annoncent. Leur annulation reste dans undo.json : sur un PC où une version précédente les a appliqués, le tableau de bord propose de les remettre comme avant.

- `win_mitigations` : Il coupait les protections Spectre et Meltdown.
- `win_coreiso` : Couper l'intégrité de la mémoire baisse la protection de ton PC contre les pilotes malveillants.
- `win_smartscreen` : Il coupait SmartScreen, qui vérifie les fichiers téléchargés.
- `win_hyperv` : Il coupait Hyper-V et la sécurité basée sur la virtualisation, et cassait WSL, le Bac à sable Windows et les émulateurs.
- `exp_bios` : Il changeait des réglages de sécurité du démarrage (sécurité basée sur la virtualisation, protection DMA, mémoire du noyau). Une mauvaise valeur peut empêcher Windows de démarrer.
- `exp_dma` : Il retirait la protection contre les attaques par périphériques Thunderbolt et PCIe.
- `exp_harden` : Il coupait le service Station de travail : les dossiers partagés et les lecteurs réseau ne s'ouvraient plus.
- `net_limit` : Il bloquait deux plages d'adresses Google dans le pare-feu, ce qui peut casser YouTube et d'autres services Google, sans gain sur le ping.
- `pri_svc` : Il passait tous les services Windows en priorité minimale : le son pouvait grésiller et le réseau ramer en jeu.
- `nv_tdr` : Quand le pilote graphique ne répondait plus, le PC figeait au lieu de récupérer.
- `amd_thermal` : Il coupait la protection thermique des cartes graphiques AMD.
- `sto_cacheprot` : Des fichiers en cours d'écriture pouvaient être corrompus si le courant coupait.
- `dbl_xbox` : Il cassait le Game Pass, l'appli Xbox et la connexion à Minecraft Bedrock.
- `dbl_edge` : Supprimer Edge ne s'annule pas depuis l'app et peut casser des fonctions de Windows qui s'en servent.
- `dbl_onedrive` : Il supprimait les dossiers OneDrive du PC : les fichiers pas encore synchronisés étaient perdus.
- `mem_prefetch` : Les applis s'ouvraient plus lentement, et sur un screenshare un Prefetch vide peut ressembler à des traces effacées.
- `pow_timer` : Il mettait à 0 une valeur du noyau par laquelle Windows divise : sur certains PC (Windows 11 24H2), écran bleu quelques minutes après le démarrage, sans gain mesurable.

Lignes risquées retirées des packs qui les cachaient (le pack reste) :

- Spectre/Meltdown : hitreg_suite, in_advanced, in_windows, mem_profile, mem_registry, sys_ram, win_mitigations
- exploit protections : in_windows
- boot security : exp_bios, in_advanced, in_windows, sys_bcdedit, win_hyperv
- VBS / memory integrity : exp_bios, win_coreiso, win_mitigations
- DMA protection : exp_bios, exp_dma, sys_registry
- Microsoft Defender : in_advanced
- SmartScreen : in_advanced, win_smartscreen
- UAC : in_advanced
- Windows Update : in_advanced, win_telemetry
- Edge, WebView2 and Chrome updates : win_telemetry
- firewall : net_limit, net_server
- IFEO wipe : in_windows
- GPU counters for any app : gpu_nvidia, nv_advanced
- services at idle priority : pri_svc
- window manager in realtime : exp_io
- GPU recovery (TDR) : nv_tdr
- AMD thermal limits : amd_advanced, amd_thermal
- DPC watchdog : exp_kernel
- CoalescingTimerInterval (blue screen) : amd_advanced, gpu_amd, gpu_general, gpu_nvidia, hitreg_suite, pow_main, pow_throttling, pow_timer
- cache flush : sto_cacheprot
- Recycle Bin : sto_general
- Prefetch off : hitreg_suite, in_advanced, mem_prefetch, mem_profile, sys_ram
- Prefetch wipe : in_windows
- BAM : sys_registry
- Xbox services : dbl_xbox, win_gamedvr
- sto_general : la boucle qui vidait les historiques de l'Explorateur (fichiers récents, Exécuter, chemins tapés) ;
- in_advanced : indexation, impression, fichiers hors connexion, registre à distance et rapport d'erreurs coupés sans le dire (« Couper les services inutiles » le fait en l'annonçant) ;
- net_server (préréglages 1 et 2) : remise à zéro de la pile réseau (IP fixe et DNS manuels perdus) ;
- app_remove, win_apps : Pense-bêtes gardé (notes non synchronisées perdues) ;
- cpu_advanced, cpu_registry : veto de la veille moderne et politique d'alimentation XP (audit D22, motif sur le chemin de la clé) ;
- win_gamedvr : la ligne qui réautorisait Game DVR juste après l'avoir coupé.

Point de restauration (1.1.8) : la case de 1.1.6 revient. Elle est cochée d'office seulement pour un réglage `restore` (avancé, ou que l'app ne remet pas entièrement) et si Rago n'en a pas créé un réussi dans les 24 dernières heures.

<!-- Sections écrites à la main : le générateur (tools/corrections_md.py) garde tel quel tout ce qui suit cette ligne. Ajouter les nouvelles sections en bas du fichier. -->
# Plan d'alimentation Rago Low Latency (1.1.9)

`src-tauri/resources/LowLatency.pow`, fourni par Sofiene le 2026-10-10 (sha256 `c953bead…c840d7`, 24 Ko). C'est une ruche
de registre exportée par `powercfg -export` (en-tête propre, somme de contrôle valide) qui ne contient que des valeurs :
2 textes (nom « IIIEXOIII LOW LATENCY », description « LOWEST LATENCY POSSIBLE BY IIIEXOIII ») et 81 réglages, presque
tous pour le secteur seulement. Personnalité Performances élevées : ce que le fichier ne règle pas (sur batterie
notamment) prend les valeurs du plan Performances élevées de Windows.

Gardé tel quel : parcage des cœurs coupé, montée en fréquence immédiate, états de throttling coupés, interruptions
verrouillées sur leur cœur, mise en veille sélective USB coupée (aussi sur batterie), NVMe et disques jamais en veille,
écran jamais éteint et veille interdite sur secteur, boutons veille et capot sans effet sur secteur.

Corrigé par le script à l'import (`audit_fixes.py`, sur secteur) :
- repos processeur coupé (`IDLEDISABLE` 1, processeur maintenu en C0) → 0, comme pour `in_windows` : chauffe, moins de
  boost, ventilateurs à fond et processeur affiché à 100 % dans le Gestionnaire des tâches ;
- pas de mot de passe au réveil (`CONSOLELOCK` 0) → 1 ;
- bouton d'alimentation sans effet (`PBUTTONACTION` 0) → 3, éteindre : sinon le joueur coupe le courant en maintenant
  le bouton ;
- renommé « Rago Low Latency ».

L'annulation réactive le plan d'avant (relevé `pwractive`) puis supprime le plan Rago. Le test
`rago_power_plan_imports_on_windows` importe le vrai fichier sur la CI Windows sous un GUID de test.

# Version 1.1.14 (construite sur la 1.1.10, 2026-10-15)

Demande de Sofiene (2026-10-15) : repartir de la 1.1.10 (personne n'a la 1.1.12 ni la 1.1.13) sans toucher aux
optimisations, sauf trois changements : le nouveau RBW Mod, les lignes qui faisaient planter le PC, et les chemins avec
un caractère spécial dans le nom du compte Windows. Vérifié en comparant `scripts.json`, `probes.json`, `undo.json` et
`catalog.json` à ceux de la 1.1.10 (a11f230) : rien d'autre ne change dans ce que lancent les réglages. Ne sont donc pas
dans cette version : RAG-60, RAG-64, RAG-65, RAG-66 (sauf les guillemets de `%temp%`), RAG-68 (sauf la réparation de
Advanced hitreg suite ci-dessous), RAG-74 et les finitions 2 de la revue du 2026-10-13 (`tools/expansion.py`, dossiers
NVIDIA, `sys_registry`, `ping_advanced`, `chimney`, SMB 1).

**Écran bleu 0x7E (RAG-67).** `CoalescingTimerInterval` à 0 part de tous les scripts et relevés (`safety.py`,
`DROP_EVERYWHERE`) : huit réglages l'écrivaient, dont `pow_main` et les packs graphiques, des réglages Safe. « Disable
timer coalescing » (`pow_timer`), qui ne faisait que ça, est retiré : 198 réglages distincts, 17 retirés. À chaque
lancement, `repair.rs` supprime la valeur là où elle vaut 0 dans les huit clés (une ligne dans `logs\repairs.log`),
oublie `pow_timer` une fois ses valeurs parties (`forget_pow_timer`), et l'interface demande une fois de redémarrer :
« Redémarrer, pas Arrêter » (avec le démarrage rapide de Windows, Arrêter ne relit pas la valeur). Aucune annulation ne
remet 0. Le relevé d'Advanced hitreg suite de la 1.1.10 ne relève rien (bloc vide, RAG-68) : le réglage repasse au
retour par les valeurs de Windows (`undo.json`, `full`), au lancement et, depuis cette version, dès qu'il est appliqué
(`runner.rs`), pour qu'une déconnexion juste après le remette aussi.

**RBW Mod (RAG-69, M1, m2).** Seuls ses deux scripts changent, remplacés en entier par `tools/rbw.py` (détail dans la
partie générée plus haut) : « Activé » fait ce que fait Rago-RBW-Fix.ps1, étape par étape ; « Désactivé » remet les
services et réglages comme Windows les règle, sans rien arrêter. Défaire « Désactivé » ne lance rien (M1) ; un
« Activé » qui n'est pas allé au bout laisse « Désactivé » noté (m2).

**Nom du compte Windows avec un caractère spécial.** Dans `cln_temp`, `game_mode`, `in_windows`, `mc_optifine` et
`sto_general` seulement, `tools/paths.py` écrit les chemins du profil `!VAR!`, met `if defined` devant chaque
suppression qui en dépend et fait tourner les boucles qui suppriment avec `DisableDelayedExpansion` (détail dans
« Chemins du profil dans les scripts », revue du 2026-10-13). `%temp%` passe entre guillemets dans `game_mode` et
`in_windows` (`TEMP_QUOTES` de `build_catalog_v6.py`, seule partie reprise de RAG-66 ; la ligne du Mode jeu garde son
« > nul »). Le moteur lance `cmd /d /c .\<script>.cmd` depuis le dossier `run` (`script_command`) : un `&`, `(`, `)` ou
`^` dans le nom du compte ne coupe plus la ligne de commande.

**Fin de licence et déconnexion : tous les réglages remis, en arrière-plan.** Comme la 1.1.10, rien ne s'affiche
pendant la remise, seulement « Tweaks réinitialisés » à la fin ; mais tous les réglages appliqués sont remis, gratuits
compris (la 1.1.10 ne remettait que les Premium ; la version testée le 2026-10-15 montrait la remise, et fermer
l'app la coupait).
`reset.rs` note d'abord la fin de licence sur le disque (`reset-pending.json`) : fermer la fenêtre la cache et l'app
quitte une fois la remise finie ; app tuée ou PC éteint, la remise reprend au lancement suivant ; relancer Rago pendant
la remise réaffiche la fenêtre cachée (`instance.rs`, événement `Local\<identifiant>.show`). Un réglage ne quitte
`applied.json` qu'une fois remis, et une reconnexion arrête la remise entre deux réglages. Pendant la remise, un lot
lancé depuis l'interface est refusé (`reset_running`). Seuls les réglages que l'app sait remettre seule sont lancés
(sauvegarde, annulation `full`, variante de retour arrière, copie OptiFine) : les autres, sans annulation automatique
(« can't be undone automatically yet » dans les journaux de déconnexion reçus), restent appliqués et se remettent par
le point de restauration, au lieu d'échouer à chaque fois. Déclencheurs : la déconnexion, et à l'actualisation de la
licence (au lancement puis chaque jour) un jeton refusé par le serveur (`invalid_token`, `bound_to_other_device`,
`revoked`), ou plus de licence alors que des réglages Premium sont encore appliqués. Un jeton expiré hors ligne ne
déclenche rien. La fenêtre de déconnexion compte les réglages qui seront remis (`sign_out_plan`).

**Fichiers sur le disque.** Les scripts gratuits et de retour arrière sont chiffrés dans l'exe comme les Premium (#48).
`applied.json` est chiffré au repos par DPAPI, sinon par une clé de secours de l'app, jamais en clair ; illisible, il
est mis de côté (`applied.json.bad-<horodatage>`), pas écrasé. `history.json` est chiffré en deux couches : le
chiffrement authentifié de l'app (clé `seal::history_key`, nonce aléatoire à chaque écriture), puis DPAPI avec un
secret propre à l'app ; il ne s'ouvre que sur ce PC, avec ce compte Windows, par Rago Optimizer, et modifié il ne se
relit plus (mis de côté en `history.json.bad-<horodatage>`). Un fichier en clair d'une version d'avant est relu puis
réécrit chiffré. `LowLatency.pow` et `extremelatencylow.nip` passent de `src-tauri/resources` (installés en clair) à
`src-tauri/assets`, chiffrés dans l'exe : le script qui en importe un l'écrit dans `run\` le temps de son exécution, ou
dans `%SystemRoot%\Temp\<identifiant>` quand le chemin de `run\` contient un `!` (cmd le retirerait de `%RAGO_SEC%`).
L'installeur efface les copies en clair d'une version d'avant ; `run\` est vidé au démarrage et à la désinstallation.
Le catalogue de l'interface ne dit plus d'où vient chaque réglage dans les .bat, et « Ouvrir un dossier » n'ouvre que
ceux de l'app.

**Full network preset, préréglage 3 (RAG-68).** Demande de Sofiene (2026-10-15), après le test de la 1.1.14 relié au
vrai serveur : le préréglage 3 (celui par défaut) s'arrêtait sur « ) était inattendu ». Une boucle du mode MSI réseau,
vidée par l'audit, laissait un bloc `( )` vide, que cmd refuse : TCPNoDelay, TcpAckFrequency et TcpDelAckTicks par carte
et les priorités DNS ne tournaient jamais. La boucle vide et son commentaire partent (`EMPTY_BLOCKS` de
`build_catalog_v6.py`) ; le relevé du préréglage relève maintenant ces valeurs, donc l'annulation les remet. Le mode MSI
réseau reste dans son propre réglage. Nouveau test : aucun bloc vide dans les scripts (`no_empty_cmd_block`). Les autres
scripts ne changent pas ; les relevés d'autres réglages qui ont le même défaut (RAG-68) restent hors de cette version.

**Plan gratuit : Windows, carte graphique et Restaurer seulement.** Demande de Sofiene (2026-10-15) : rien de Latence,
Réseau, Hitreg ni Minecraft en gratuit. « Optimisation de la souris » (`in_mouse`, Hitreg) passe en Premium, avec son
script et son annulation (paquet Premium) : 8 réglages ouverts, Mode jeu Windows, Couper Game DVR, Effets visuels, Plein
écran et les 4 outils de Restaurer. « Par défaut » de Profil hitreg, Latence des images et File souris et clavier n'est
plus ouvert sans licence, dans l'interface comme dans le moteur (`catalog::allowed`) ; seuls RBW Mod « Activé » et Mode
jeu Rago « Désactivé » le restent (`free.json`, `reverts`). Ces variantes restent dans le paquet gratuit : l'annulation
d'un réglage appliqué sans sauvegarde s'en sert. Un joueur du plan gratuit qui avait appliqué la souris la garde et peut
l'éteindre : sans licence, elle ne déclenche pas la remise de fin de licence (`free.json`, `formerly` ; `reset::due`).
Le site suit (`sync_app.py` lit le nombre de réglages gratuits dans `free.json`) : 8 réglages gratuits, 198 au total, et
la FAQ ne dit plus que les réglages gratuits restent quand Premium prend fin.

**Plan gratuit : trois réglages de confort de Windows en plus.** Demande de Sofiene (2026-10-16) : trois réglages utiles,
mais pas ceux qui font acheter Premium. « Désactiver les notifications » (`win_notifications`), « Désactiver les bulles et
suggestions » (`win_popups`) et « Désactiver Copilot et Recall » (`win_ai`) passent dans `free.json` : rien ne change pour
FPS, latence, ping ni hitreg (le catalogue les dit « effet sur les FPS quasi nul »). Les trois ont une annulation
automatique, n'ont pas de jumeau et ne sont dans aucun autre module. Leurs scripts passent dans le paquet gratuit
(`embed_scripts.rs` lit `free.json`). 11 réglages ouverts ; le site suit (`sync_app.py`, `build.py`).

**Déconnexion : plus de réglage « pas remis » sur une clé protégée.** Demande de Sofiene (2026-10-16), avec le journal
d'une déconnexion sur une machine virtuelle Windows où tous les réglages possibles étaient appliqués : quatre réglages
signalés comme pas désactivés (Latence avancée, Couper les diagnostics, Désactiver les journaux automatiques,
Désactiver le suivi d'activité), sept valeurs en tout. Leurs clés sont protégées par Windows (dossier Réseau sous
`HKCR\CLSID`, `Control\Diagnostics\Performance`, service DPS) ou par la protection contre les falsifications de Defender
(`WMI\Autologger\DefenderApiLogger` et `DefenderAuditLogger`) : le script n'avait pas pu les changer non plus, elles
avaient encore leur valeur d'avant, mais la remise les réécrivait avec l'accès complet à la clé et Windows refusait.
`Sys::restore` (`backup.rs`) lit maintenant la valeur d'abord et n'écrit rien quand elle est déjà comme avant (tâches
planifiées comprises). Il ouvre la clé avec le seul droit d'y écrire une valeur. Start ou DelayedAutostart d'un service
dont la clé refuse l'écriture est remis par le gestionnaire de services (`sc config`, comme le script l'avait changé).
Une valeur posée par Rago qui ne peut pas être supprimée est signalée, au lieu d'être comptée comme remise. La
désinstallation et « Tout annuler » passent par la même remise. Tests : `values_already_back_need_no_write`,
`service_start_maps_to_sc_config`, et sur Windows (CI) `restore_on_windows`.
Deux réglages que la VM ne pouvait pas appliquer sont aussi remis. Profil pilote Rago (NVIDIA) n'avait aucune
annulation, Profile Inspector ne sachant pas exporter le profil d'avant : son annulation importe maintenant un profil
global vide, ce qui remet les réglages 3D globaux du pilote par défaut, comme « Restaurer » dans le panneau NVIDIA
(sans pilote NVIDIA, rien à remettre). OptiFine ne gardait une copie que si optionsof.txt existait, et en reprenait une
à chaque application : après un changement de variante, l'annulation remettait la variante d'avant. La copie d'avant
Rago est maintenant gardée tant que le réglage est appliqué dans ce dossier ; sans fichier avant, une copie `.none`
fait supprimer le fichier à la remise ; un optionsof.txt illisible n'est plus remplacé sans copie. Tests :
`put_back_as_before_rago`, `nvidia_profile_is_put_back_too`.

**Interface.** Plan gratuit : cadenas sur chaque onglet qui a un réglage réservé à Premium, Windows et Hitreg compris
(avant, seulement sur un onglet sans aucun réglage gratuit). Mode jeu : « Désactivé depuis… » après Désactiver ou Tout
annuler. Bouton « Tout annuler » dans la carte État (RAG-43), une seule Rago Optimizer à la fois, et les petites
corrections reprises de la 1.1.13 (dates, historique, fenêtres superposées, messages de fin d'exécution).

# Version 1.2.0 (construite sur la 1.1.14, 2026-10-17)

Demande de Sofiene : refonte en verre et nouvelles fonctions, sans rien changer aux optimisations. Vérifié avec
`git diff origin/staging -- app/src-tauri/scripts app/src/data app/src-tauri/src/runner.rs` : aucun changement dans
`scripts.json`, `probes.json`, `undo.json`, `catalog.json` ni dans le moteur qui les lance. Nouveau dans cette version :
refonte visuelle (CSS), Nettoyer la RAM (RAG-48), partage de presets et rapport support, bibliothèque de jeux avec
images officielles (RAG-57), test réseau (RAG-50), mises à jour automatiques signées (RAG-24), barre en jeu et mode
arrière-plan (RAG-82). La barre en jeu ne lance que des réglages déjà au catalogue, par le même moteur que l'app.
