# Local Whisper CPU Setup

This folder contains a self-contained `whisper.cpp` CPU setup using the `ggml-small-q5_1.bin` model.

Everything for the setup lives inside this folder:

- `bin/` portable Windows x64 `whisper.cpp` binaries
- `models/` Whisper and VAD model files
- `ui/` small browser UI assets
- `uploads/` copies of files sent through the local UI
- `transcripts/` output files from live and file transcription
- `Start-WhisperLive.ps1` live microphone transcription on CPU
- `Start-WhisperUI.ps1` small local browser UI for file transcription
- `Transcribe-File.ps1` one-shot transcription for local audio files
- `Test-Samples.ps1` quick smoke test for the existing Telugu, Hindi, and English sample audio in this project

## Small UI

Launch the local browser UI:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Start-WhisperUI.ps1
```

The launcher starts a local server on `http://127.0.0.1:7861` and opens it in your browser.

What it does:

- lets you upload a local recording
- choose `auto`, `te`, `hi`, or `en`
- choose a speed profile: `Accurate`, `Fast`, `Turbo`, or `Instant`
- optionally translate to English
- optionally use VAD
- romanizes non-English transcript output into Latin alphabet text
- saves transcript outputs into `local-whisper-cpu\transcripts\`

Notes:

- this UI is intentionally file-based, not streaming
- supported file types are `mp3`, `wav`, `ogg`, and `flac`
- uploaded audio copies are stored under `local-whisper-cpu\uploads\`
- `Fast` is the best first profile for CPU use
- for Telugu/Hindi on this CPU, `Fast` + `Translate transcript to English` is usually the best speed/quality tradeoff

## Quick Start

Run live transcription from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Start-WhisperLive.ps1 -Language auto
```

Useful live options:

```powershell
# Force Telugu
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Start-WhisperLive.ps1 -Language te

# Force Hindi
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Start-WhisperLive.ps1 -Language hi

# Force English
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Start-WhisperLive.ps1 -Language en

# Mixed-language live transcription, translated to English
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Start-WhisperLive.ps1 -Language auto -TranslateToEnglish
```

Notes:

- `-Language auto` is the best fit for mixed Telugu/Hindi/English speech.
- `-CaptureDevice -1` uses the default microphone.
- Stop live transcription with `Ctrl+C`.
- Live transcript text files are saved under `local-whisper-cpu\transcripts\`.

## File Transcription

Transcribe any local audio file on CPU:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Transcribe-File.ps1 -InputPath .\ALL_AUDIO_FILES\te_diabetes_001.mp3 -Language te -UseVAD
```

Translate output to English:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Transcribe-File.ps1 -InputPath .\ALL_AUDIO_FILES\hi_diabetes_001.mp3 -Language hi -TranslateToEnglish -UseVAD
```

The file script writes:

- `.txt`
- `.vtt`
- `.json`

into `local-whisper-cpu\transcripts\`.

## Quick Smoke Test

Run the built-in test against the existing Telugu, Hindi, and English samples already in this project:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-whisper-cpu\Test-Samples.ps1 -UseVAD
```

## Installed Model Files

- `models\ggml-small-q5_1.bin`
- `models\ggml-silero-v5.1.2.bin`

## Practical Notes

- This setup is pinned to the portable `whisper.cpp` Windows x64 BLAS release.
- It is forced to CPU mode with `-ng`.
- `small-q5_1` is a good balance for local CPU testing, but live multilingual transcription can still lag on slower CPUs.
- If `auto` is unstable for a session, rerun with `te`, `hi`, or `en` depending on the dominant language.
