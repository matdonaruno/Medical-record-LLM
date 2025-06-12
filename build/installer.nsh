; NSISインストーラー用カスタムスクリプト
; Medical Record LLM

; インストール後の処理
!macro customInstall
  ; ファイアウォール例外を追加（必要に応じて）
  ; ExecWait 'netsh advfirewall firewall add rule name="Medical Record LLM" dir=in action=allow program="$INSTDIR\Medical Record LLM.exe"'
!macroend

; アンインストール前の処理  
!macro customUnInstall
  ; プロセスを終了
  ${nsProcess::FindProcess} "Medical Record LLM.exe" $R0
  ${If} $R0 = 0
    MessageBox MB_YESNO|MB_ICONQUESTION "Medical Record LLMが実行中です。終了してからアンインストールを続行しますか？" IDYES +2
    Abort
    ${nsProcess::KillProcess} "Medical Record LLM.exe" $R0
  ${EndIf}
  
  ; ファイアウォール例外を削除（必要に応じて）
  ; ExecWait 'netsh advfirewall firewall delete rule name="Medical Record LLM"'
!macroend