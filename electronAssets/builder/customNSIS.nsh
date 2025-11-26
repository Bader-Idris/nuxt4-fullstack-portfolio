; Custom NSIS script for enhanced installer functionality
; This script adds professional features to the NSIS installer

; Add registry key for installation
!macro customInstall
  WriteRegStr HKCU "Software\${APP_ID}" "Install_Dir" "$INSTDIR"
!macroend

; Custom uninstaller registry entries
!macro customUnInstall
  DeleteRegKey HKCU "Software\${APP_ID}"
!macroend