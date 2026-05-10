[CmdletBinding()]
param(
    [switch]$TranslateToEnglish,
    [switch]$UseVAD
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$transcribeScript = Join-Path $scriptDir "Transcribe-File.ps1"

$samples = @(
    @{ Language = "te"; Path = Join-Path $projectRoot "ALL_AUDIO_FILES\te_diabetes_001.mp3" },
    @{ Language = "hi"; Path = Join-Path $projectRoot "ALL_AUDIO_FILES\hi_diabetes_001.mp3" },
    @{ Language = "en"; Path = Join-Path $projectRoot "ALL_AUDIO_FILES\en_diabetes_001.mp3" }
)

foreach ($sample in $samples) {
    if (-not (Test-Path $sample.Path)) {
        Write-Warning "Skipping missing sample: $($sample.Path)"
        continue
    }

    Write-Host ""
    Write-Host ("==== {0} ({1}) ====" -f $sample.Path, $sample.Language)

    & $transcribeScript `
        -InputPath $sample.Path `
        -Language $sample.Language `
        -TranslateToEnglish:$TranslateToEnglish `
        -UseVAD:$UseVAD

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
