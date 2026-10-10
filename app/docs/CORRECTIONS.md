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

RBW Mod « On » remet aussi BAM, DAM et le Prefetcher (actifs après redémarrage, demandé par l'app pour cette variante).

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


# Réglages risqués retirés (1.1.8)

Demande de Sofiene (2026-10-08) : `tools/safety.py`. 16 réglages quittent le catalogue, les profils et le plan gratuit. Il reste 212 entrées au catalogue, soit 199 réglages distincts : les 13 autres lancent les mêmes commandes qu'un autre réglage, sous un autre nom ou dans un autre module (champ `twin`), et c'est ce nombre distinct que l'app et le site annoncent. Leur annulation reste dans undo.json : sur un PC où une version précédente les a appliqués, le tableau de bord propose de les remettre comme avant.

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
- win_gamedvr : la ligne qui réautorisait Game DVR juste après l'avoir coupé ;
- gpu_nvidia, gpu_amd, gpu_general, nv_general, amd_general (2026-10-10) : MPO (`OverlayTestMode`) et préemption du GPU coupés dans des packs Safe, après un partage d'écran Discord resté gris chez un client. Ils restent dans nv_preemption, nv_advanced et amd_advanced (Advanced).

Point de restauration (1.1.8) : la case de 1.1.6 revient. Elle est cochée d'office seulement pour un réglage `restore` (avancé, ou que l'app ne remet pas entièrement) et si Rago n'en a pas créé un réussi dans les 24 dernières heures.

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
