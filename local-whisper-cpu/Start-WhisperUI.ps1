[CmdletBinding()]
param(
    [string]$ListenHost = "127.0.0.1",
    [int]$Port = 7861,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appPath = Join-Path $scriptDir "whisper_ui.py"

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding
& "$env:SystemRoot\System32\chcp.com" 65001 > $null

if (-not (Test-Path $appPath)) {
    throw "Missing UI app: $appPath"
}

if (-not $NoBrowser) {
    $url = "http://$ListenHost`:$Port"
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Seconds 1; Start-Process '$url'" `
        -WindowStyle Hidden | Out-Null
}

Write-Host ""
Write-Host "Starting Whisper UI..."
Write-Host "URL        : http://$ListenHost`:$Port"
Write-Host "Stop with  : Ctrl+C"
Write-Host ""

& python $appPath --host $ListenHost --port $Port
exit $LASTEXITCODE
