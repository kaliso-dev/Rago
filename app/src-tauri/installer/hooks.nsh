; Hooks du désinstallateur NSIS de Rago Optimizer.
;
; Avant que le désinstallateur ne supprime les fichiers, on relance l'exe en mode « remise à zéro »
; (--revert-all) : il annule tous les réglages appliqués et remet Windows dans l'état où il était sur
; le PC du client, puis se ferme. L'exe et le dossier resources existent encore à ce moment-là
; (pré-désinstall), et le processus tourne sous le même compte Windows : la sauvegarde chiffrée (DPAPI)
; s'ouvre donc normalement. --revert-all n'ouvre aucune fenêtre.
!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Restoring your Windows settings to how they were before Rago Optimizer..."
  ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --revert-all'
!macroend
