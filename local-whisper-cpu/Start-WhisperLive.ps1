[CmdletBinding()]
param(
    [string]$Language = "auto",
    [int]$CaptureDevice = -1,
    [int]$Threads = [Math]::Min([Environment]::ProcessorCount, 8),
    [int]$StepMs = 2500,
    [int]$LengthMs = 8000,
    [int]$KeepMs = 250,
    [int]$MaxTokens = 48,
    [switch]$TranslateToEnglish,
    [switch]$SaveAudio
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptDir "bin\whisper-stream.exe"
$modelPath = Join-Path $scriptDir "models\ggml-small-q5_1.bin"
$transcriptsDir = Join-Path $scriptDir "transcripts"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath = Join-Path $transcriptsDir ("live-{0}-{1}.txt" -f $Language, $timestamp)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding
& "$env:SystemRoot\System32\chcp.com" 65001 > $null

if (-not (Test-Path $exePath)) {
    throw "Missing executable: $exePath"
}

if (-not (Test-Path $modelPath)) {
    throw "Missing model: $modelPath"
}

if (-not (Test-Path $transcriptsDir)) {
    New-Item -ItemType Directory -Path $transcriptsDir -Force | Out-Null
}

$env:OPENBLAS_NUM_THREADS = "1"

$arguments = @(
    "-m", $modelPath,
    "-t", $Threads,
    "--step", $StepMs,
    "--length", $LengthMs,
    "--keep", $KeepMs,
    "-mt", $MaxTokens,
    "-c", $CaptureDevice,
    "-l", $Language,
    "-f", $outputPath,
    "-kc",
    "-ng"
)

if ($TranslateToEnglish) {
    $arguments += "-tr"
}

if ($SaveAudio) {
    $arguments += "-sa"
}

Write-Host ""
Write-Host "Starting CPU live transcription..."
Write-Host "Model      : $modelPath"
Write-Host "Language   : $Language"
Write-Host "Mic device : $CaptureDevice (-1 means default input device)"
Write-Host "Transcript : $outputPath"
Write-Host "Stop with  : Ctrl+C"
Write-Host ""

& $exePath @arguments
exit $LASTEXITCODE
