; Ajouts de Rago Optimizer à l'installateur NSIS de Tauri (bundle > windows > nsis > installerHooks).

; Désinstallation : avant de retirer l'exe, il remet Windows comme avant pour tous les réglages appliqués, sans
; fenêtre (`--reset-tweaks`, voir src/reset.rs). Pas pendant une mise à jour : l'installateur d'une autre version
; lance ce désinstallateur en place, depuis le dossier de l'app (avec /UPDATE ou _?=), alors qu'une vraie
; désinstallation (Paramètres de Windows, menu Démarrer) le copie d'abord dans %TEMP%.
; Sauf si le joueur coche « Delete the application data » sur la page de confirmation, même pendant une mise à jour
; lancée par l'installateur : la section Uninstall de Tauri efface alors %APPDATA%\<identifiant> (applied.json et les
; sauvegardes), et plus rien ne pourrait remettre ces réglages ensuite. $DeleteAppDataCheckboxState est la variable
; globale du modèle de Tauri (CLI 2.12.1), lue par un.ConfirmLeave en quittant cette page, donc avant la section
; Uninstall et ce crochet ; vide (donc 0) en silencieux (/S) et en passif (/P), où la page n'est pas montrée et où
; Tauri n'efface rien. Avec /UPDATE, Tauri n'efface jamais les données : rien n'est remis.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
    ${If} $EXEDIR != $INSTDIR
    ${OrIf} $DeleteAppDataCheckboxState = 1
      ; l'app ouverte est fermée d'abord : la remise ne doit pas croiser un lot lancé depuis la fenêtre
      !insertmacro CheckIfAppIsRunning "$INSTDIR\${MAINBINARYNAME}.exe" "${PRODUCTNAME}"
      ; la remise s'arrête d'elle-même au bout de 15 minutes (reset::UNINSTALL_LIMIT) : la désinstallation ne reste
      ; jamais bloquée
      DetailPrint "Putting back the Windows settings changed by ${PRODUCTNAME} (this can take a few minutes)..."
      ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --reset-tweaks'
    ${EndIf}
  ${EndIf}
!macroend

; Plan d'alimentation et profil NVIDIA : chiffrés dans l'exe depuis 1.1.14 (src/assets.rs). Une installation par-dessus
; une version d'avant laisserait leurs copies en clair dans le dossier de l'app : elles sont retirées.
!macro NSIS_HOOK_POSTINSTALL
  Delete "$INSTDIR\resources\LowLatency.pow"
  Delete "$INSTDIR\resources\extremelatencylow.nip"
!macroend
