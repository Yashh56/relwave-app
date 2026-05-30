; RelWave NSIS Installer Hooks
; Kill bridge and Node processes before install/update to prevent
; "Error opening file for writing" errors caused by open file handles on
; better_sqlite3.node and other bundled native resources.

!macro NSIS_HOOK_PREINSTALL
  ; 1. Kill the bridge binary (pkg-compiled production binary)
  nsExec::ExecToLog 'taskkill /F /IM "bridge-x86_64-pc-windows-msvc.exe" /T'

  ; 2. Kill node.exe in case the bridge is running as a Node.js script
  ;    (dev mode or script-mode fallback). /T kills child processes too.
  nsExec::ExecToLog 'taskkill /F /IM "node.exe" /T'

  ; 3. Kill the main app window (covers the case where the user launched
  ;    the installer without closing RelWave first)
  nsExec::ExecToLog 'taskkill /F /IM "RelWave.exe" /T'

  ; 4. Give the OS time to fully release all file handles before the
  ;    installer tries to overwrite better_sqlite3.node and other resources.
  Sleep 1500
!macroend