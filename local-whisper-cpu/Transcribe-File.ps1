[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,
    [string]$Language = "auto",
    [int]$Threads = [Math]::Min([Environment]::ProcessorCount, 8),
    [switch]$TranslateToEnglish,
    [switch]$UseVAD
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptDir "bin\whisper-cli.exe"
$modelPath = Join-Path $scriptDir "models\ggml-small-q5_1.bin"
$vadModelPath = Join-Path $scriptDir "models\ggml-silero-v5.1.2.bin"
$transcriptsDir = Join-Path $scriptDir "transcripts"

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding
& "$env:SystemRoot\System32\chcp.com" 65001 > $null

if (-not (Test-Path $exePath)) {
    throw "Missing executable: $exePath"
}

if (-not (Test-Path $modelPath)) {
    throw "Missing model: $modelPath"
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($resolvedInput)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputBase = Join-Path $transcriptsDir ("{0}-{1}" -f $baseName, $timestamp)

if (-not (Test-Path $transcriptsDir)) {
    New-Item -ItemType Directory -Path $transcriptsDir -Force | Out-Null
}

$env:OPENBLAS_NUM_THREADS = "1"

$arguments = @(
    "-m", $modelPath,
    "-t", $Threads,
    "-l", $Language,
    "-otxt",
    "-ovtt",
    "-oj",
    "-ojf",
    "-of", $outputBase,
    "-ng",
    $resolvedInput
)

if ($TranslateToEnglish) {
    $arguments += "-tr"
}

if ($UseVAD) {
    if (-not (Test-Path $vadModelPath)) {
        throw "Missing VAD model: $vadModelPath"
    }

    $arguments += @(
        "--vad",
        "-vm", $vadModelPath
    )
}

Write-Host ""
Write-Host "Transcribing file on CPU..."
Write-Host "Input      : $resolvedInput"
Write-Host "Language   : $Language"
Write-Host "Output base: $outputBase"
Write-Host ""

& $exePath @arguments
exit $LASTEXITCODE
