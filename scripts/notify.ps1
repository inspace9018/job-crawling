param([string]$Title = "새 채용 공고", [string]$Body = "")
# 윈도우 토스트 알림(베스트 에포트). 실패해도 전체 작업은 계속.
try {
  $AppId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
  [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
  $tpl = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
  $t = $tpl.GetElementsByTagName('text')
  $t.Item(0).AppendChild($tpl.CreateTextNode($Title)) > $null
  $t.Item(1).AppendChild($tpl.CreateTextNode($Body)) > $null
  $toast = [Windows.UI.Notifications.ToastNotification]::new($tpl)
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
  Write-Output "toast-ok"
} catch {
  # 폴백: 풍선 알림
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $ni = New-Object System.Windows.Forms.NotifyIcon
    $ni.Icon = [System.Drawing.SystemIcons]::Information
    $ni.Visible = $true
    $ni.ShowBalloonTip(8000, $Title, $Body, [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Sleep -Seconds 9
    $ni.Dispose()
    Write-Output "balloon-ok"
  } catch {
    Write-Output "notify-failed"
  }
}
