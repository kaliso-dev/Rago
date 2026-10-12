; Ajouts de Rago Optimizer à l'installateur NSIS de Tauri (bundle > windows > nsis > installerHooks).

; Désinstallation : avant de retirer l'exe, il remet Windows comme avant pour tous les réglages appliqués, sans
; fenêtre (`--reset-tweaks`, voir src/reset.rs). Pas pendant une mise à jour : l'installateur d'une autre version
; lance ce désinstallateur en place, depuis le dossier de l'app (avec /UPDATE ou _?=), alors qu'une vraie
; désinstallation (Paramètres de Windows, menu Démarrer) le copie d'abord dans %TEMP%.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
  ${AndIf} $EXEDIR != $INSTDIR
    ; l'app ouverte est fermée d'abord : la remise ne doit pas croiser un lot lancé depuis la fenêtre
    !insertmacro CheckIfAppIsRunning "$INSTDIR\${MAINBINARYNAME}.exe" "${PRODUCTNAME}"
    ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --reset-tweaks'
  ${EndIf}
!macroend
