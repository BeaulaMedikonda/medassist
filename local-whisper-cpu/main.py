# """
# local-whisper-cpu/main.py  v2.0.1  (production hardened)

# Changes from v2.0.0:
#   - Fix: unwrap DiarizeOutput (pyannote-audio >= 3.1) before itertracks dispatch.
#     New helper _unwrap_diarization_output() extracts the inner
#     pyannote.core.Annotation from the DiarizeOutput dataclass so the existing
#     itertracks / segments / get_timeline dispatch chain works on all versions.
# """

# from __future__ import annotations

# import asyncio
# import logging
# import os
# import tempfile
# import time
# import warnings
# from contextlib import asynccontextmanager
# from pathlib import Path
# from typing import Any

# warnings.filterwarnings("ignore", message="torchcodec is not installed correctly")
# warnings.filterwarnings("ignore", category=UserWarning, module="pyannote")

# import uvicorn
# from fastapi import FastAPI, File, Form, HTTPException, UploadFile
# from fastapi.responses import JSONResponse

# # ── Config ────────────────────────────────────────────────────────────────────
# _HOME = Path.home()

# WHISPER_MODEL_DIR   = os.getenv("WHISPER_MODEL_DIR", "large-v3")
# PYANNOTE_MODEL_DIR  = os.getenv("PYANNOTE_MODEL_DIR",
#                                 str(_HOME / "whisper-env" / "models" / "pyannote-diarization"))
# HF_AUTH_TOKEN       = os.getenv("HF_AUTH_TOKEN", "")

# MERGE_GAP_SECONDS       = float(os.getenv("MERGE_GAP_SECONDS",       "1.5"))
# MIN_SEGMENT_DURATION    = float(os.getenv("MIN_SEGMENT_DURATION",    "0.3"))
# MIN_DIARIZE_SEGMENT_S   = float(os.getenv("MIN_DIARIZE_SEGMENT_S",   "0.4"))
# DIARIZE_CONF_THRESHOLD  = float(os.getenv("DIARIZE_CONF_THRESHOLD",  "0.4"))
# MIN_SPEAKERS            = int(os.getenv("MIN_SPEAKERS", "2"))
# MAX_SPEAKERS            = int(os.getenv("MAX_SPEAKERS", "4"))
# LANG_CONF_THRESHOLD     = float(os.getenv("LANG_CONF_THRESHOLD",     "0.7"))
# CLINIC_DEFAULT_LANG     = os.getenv("CLINIC_DEFAULT_LANG", "")   # e.g. "te", "hi", "ta"

# ENABLE_SARVAM_FALLBACK  = os.getenv("ENABLE_SARVAM_FALLBACK", "false").lower() == "true"
# SARVAM_API_KEY          = os.getenv("SARVAM_API_KEY", "")

# HALLUCINATION_PHRASES = frozenset([
#     "thank you for watching",
#     "please subscribe",
#     "subtitles by",
#     "transcribed by",
#     "www.",
#     ".com",
#     "amara.org",
#     "music playing",
#     "[music]",
#     "[ music ]",
#     "(music)",
# ])

# FILLER_WORDS = frozenset(
#     ["um", "uh", "hmm", "hm", "ah", "oh", "mm", "mhm", "uh-huh", "yeah", "ok", "okay"]
# )

# logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
# log = logging.getLogger("whisper-service")

# # ── Singletons ────────────────────────────────────────────────────────────────
# _whisper_model: Any        = None
# _diarization_pipeline: Any = None
# _voice_encoder: Any        = None
# _diarization_available     = True
# _deepfilter_available      = True


# def _get_device() -> tuple[str, str]:
#     try:
#         import torch
#         if torch.cuda.is_available():
#             return "cuda", "float16"
#     except Exception:
#         pass
#     return "cpu", "int8"


# def _load_whisper() -> Any:
#     global _whisper_model
#     if _whisper_model is not None:
#         return _whisper_model
#     from faster_whisper import WhisperModel  # type: ignore
#     device, compute_type = _get_device()
#     model_dir = Path(WHISPER_MODEL_DIR)
#     model_arg = str(model_dir) if (model_dir.exists() and (model_dir / "model.bin").exists()) \
#                 else WHISPER_MODEL_DIR
#     log.info("Loading Whisper '%s' on %s/%s ...", model_arg, device, compute_type)
#     _whisper_model = WhisperModel(model_arg, device=device, compute_type=compute_type, num_workers=2)
#     log.info("Whisper ready.")
#     return _whisper_model


# def _load_pyannote() -> Any | None:
#     global _diarization_pipeline, _diarization_available
#     if _diarization_pipeline is not None:
#         return _diarization_pipeline
#     if not _diarization_available:
#         return None
#     try:
#         from pyannote.audio import Pipeline  # type: ignore
#     except ImportError:
#         log.warning("pyannote.audio not installed -- diarization disabled.")
#         _diarization_available = False
#         return None
#     try:
#         if Path(PYANNOTE_MODEL_DIR).exists():
#             _diarization_pipeline = Pipeline.from_pretrained(PYANNOTE_MODEL_DIR)
#         elif HF_AUTH_TOKEN:
#             _diarization_pipeline = Pipeline.from_pretrained(
#                 "pyannote/speaker-diarization-3.1", token=HF_AUTH_TOKEN)
#         else:
#             raise RuntimeError("Pyannote model not found and HF_AUTH_TOKEN not set.")
#         log.info("Pyannote ready.")
#     except Exception as exc:
#         log.warning("Pyannote load failed (%s) -- diarization disabled.", exc)
#         _diarization_available = False
#         return None
#     return _diarization_pipeline


# def _load_voice_encoder() -> Any | None:
#     global _voice_encoder
#     if _voice_encoder is not None:
#         return _voice_encoder
#     try:
#         from resemblyzer import VoiceEncoder  # type: ignore
#         _voice_encoder = VoiceEncoder()
#         log.info("Voice encoder (resemblyzer) ready.")
#     except Exception:
#         pass
#     return _voice_encoder


# # ── Audio preprocessing ───────────────────────────────────────────────────────

# def _apply_deepfilter(wav_path: str) -> str:
#     global _deepfilter_available
#     if not _deepfilter_available:
#         return wav_path
#     try:
#         from df.enhance import enhance, init_df, load_audio, save_audio  # type: ignore
#         model, df_state, _ = init_df()
#         audio, _ = load_audio(wav_path, sr=df_state.sr())
#         enhanced = enhance(model, df_state, audio)
#         denoised_path = wav_path + ".denoised.wav"
#         save_audio(denoised_path, enhanced, df_state.sr())
#         log.info("DeepFilterNet denoising applied.")
#         return denoised_path
#     except ImportError:
#         _deepfilter_available = False
#         return wav_path
#     except Exception as exc:
#         log.warning("DeepFilterNet failed (%s) -- using original audio.", exc)
#         return wav_path


# def _convert_to_wav(audio_bytes: bytes) -> str:
#     import subprocess
#     with tempfile.NamedTemporaryFile(suffix=".input", delete=False) as src:
#         src.write(audio_bytes)
#         src_path = src.name
#     wav_path = src_path + ".wav"
#     try:
#         subprocess.run(
#             [
#                 "ffmpeg", "-y", "-i", src_path,
#                 "-ar", "16000", "-ac", "1",
#                 "-af", (
#                     "loudnorm,"
#                     "silenceremove=start_periods=1:start_threshold=-50dB"
#                     ":stop_periods=-1:stop_threshold=-50dB:stop_duration=1"
#                 ),
#                 "-f", "wav", wav_path,
#             ],
#             check=True, capture_output=True,
#         )
#     finally:
#         if os.path.exists(src_path):
#             os.unlink(src_path)
#     denoised = _apply_deepfilter(wav_path)
#     if denoised != wav_path:
#         os.unlink(wav_path)
#         return denoised
#     return wav_path


# # ── Hallucination filter ──────────────────────────────────────────────────────

# def _is_hallucination(text: str) -> bool:
#     lower = text.lower().strip()
#     return any(phrase in lower for phrase in HALLUCINATION_PHRASES)


# def _is_filler_only(text: str) -> bool:
#     tokens = text.lower().strip().strip(".,!?").split()
#     return bool(tokens) and all(t in FILLER_WORDS for t in tokens)


# # ── Transcription ─────────────────────────────────────────────────────────────

# def _run_whisper(wav_path: str, language_hint: str | None, beam_size: int = 5) -> tuple[list[dict], Any]:
#     model = _load_whisper()
#     kwargs: dict[str, Any] = {
#         "beam_size": beam_size,
#         "word_timestamps": False,
#         "vad_filter": True,
#         "vad_parameters": {"min_silence_duration_ms": 500},
#         "condition_on_previous_text": True,
#     }
#     if language_hint:
#         kwargs["language"] = language_hint
#     segments_iter, info = model.transcribe(wav_path, **kwargs)
#     segments = [
#         {"start": s.start, "end": s.end, "text": s.text.strip()}
#         for s in segments_iter
#         if s.text.strip() and not _is_hallucination(s.text)
#     ]
#     return segments, info


# def _transcribe_wav(wav_path: str, language_hint: str | None) -> tuple[list[dict], str]:
#     segments, info = _run_whisper(wav_path, language_hint)
#     if info.language_probability < LANG_CONF_THRESHOLD and CLINIC_DEFAULT_LANG:
#         log.warning(
#             "Language confidence %.2f < %.2f -- retrying with clinic default '%s'.",
#             info.language_probability, LANG_CONF_THRESHOLD, CLINIC_DEFAULT_LANG,
#         )
#         segments, info = _run_whisper(wav_path, CLINIC_DEFAULT_LANG)
#     if len(segments) < 2:
#         log.warning("Too few segments (%d) -- retrying with beam_size=1.", len(segments))
#         try:
#             segments, info = _run_whisper(wav_path, language_hint or CLINIC_DEFAULT_LANG or None, beam_size=1)
#         except Exception as exc:
#             log.warning("Fallback transcription failed: %s", exc)
#     return segments, info.language


# # ── Diarization ───────────────────────────────────────────────────────────────

# def _normalise_speaker_labels(turns: list[dict]) -> list[dict]:
#     mapping: dict[str, str] = {}
#     for t in turns:
#         raw = t["speaker"]
#         if raw not in mapping:
#             mapping[raw] = f"SPEAKER_{len(mapping)}"
#         t["speaker"] = mapping[raw]
#     return turns


# def _verify_speakers(wav_path: str, turns: list[dict]) -> bool:
#     encoder = _load_voice_encoder()
#     if encoder is None or not turns:
#         return True
#     try:
#         import numpy as np
#         import soundfile as sf  # type: ignore
#         waveform, sr = sf.read(wav_path, dtype="float32")
#         speakers: dict[str, list] = {}
#         for t in turns:
#             sp = t["speaker"]
#             start = int(t["start"] * sr)
#             end = int(t["end"] * sr)
#             chunk = waveform[start:end]
#             if len(chunk) > sr * 0.5:
#                 speakers.setdefault(sp, []).append(chunk)
#         if len(speakers) < 2:
#             return True
#         embeds = {}
#         for sp, chunks in speakers.items():
#             combined = np.concatenate(chunks)
#             embeds[sp] = encoder.embed_utterance(combined)
#         labels = list(embeds.keys())
#         e0, e1 = embeds[labels[0]], embeds[labels[1]]
#         similarity = float(np.dot(e0, e1) / (np.linalg.norm(e0) * np.linalg.norm(e1)))
#         log.info("Speaker similarity %s<->%s: %.3f", labels[0], labels[1], similarity)
#         if similarity > 0.85:
#             log.warning("Speakers too similar (%.3f) -- diarization may have failed.", similarity)
#             return False
#     except Exception as exc:
#         log.warning("Speaker verification failed: %s", exc)
#     return True


# def _unwrap_diarization_output(diarization: Any) -> Any:
#     """
#     pyannote-audio >= 3.1 changed speaker-diarization-3.1 to return a
#     DiarizeOutput dataclass instead of a bare pyannote.core.Annotation:

#         @dataclass
#         class DiarizeOutput:
#             diarization: Annotation   # <-- the object we actually need
#             embeddings:  Tensor | None

#     The inner .diarization attribute is a standard pyannote.core.Annotation
#     that supports itertracks().  Unwrap it here so the dispatch chain below
#     (itertracks -> segments -> get_timeline -> last-resort) works identically
#     for pyannote-audio 2.x and 3.x without any other changes.

#     Detection is intentionally duck-typed (no isinstance / hard imports) so
#     it is robust to internal pyannote refactors:
#       * wrapper has a .diarization attribute that is not callable        (data field)
#       * wrapper itself does NOT have .itertracks                         (not an Annotation)
#     """
#     if (
#         hasattr(diarization, "diarization")
#         and not callable(diarization.diarization)
#         and not hasattr(diarization, "itertracks")
#     ):
#         log.info(
#             "Unwrapping %s -> pyannote.core.Annotation (pyannote-audio >= 3.1 detected).",
#             type(diarization).__name__,
#         )
#         return diarization.diarization
#     return diarization


# def _diarize_wav(wav_path: str) -> list[dict]:
#     pipeline = _load_pyannote()
#     if pipeline is None:
#         return []
#     try:
#         import torch
#         import soundfile as sf  # type: ignore

#         waveform, sample_rate = sf.read(wav_path, dtype="float32")
#         waveform_tensor = torch.tensor(waveform).unsqueeze(0)
#         audio_input = {"waveform": waveform_tensor, "sample_rate": sample_rate}

#         raw_output = pipeline(
#             audio_input,
#             min_speakers=MIN_SPEAKERS,
#             max_speakers=MAX_SPEAKERS,
#         )

#         # ── Unwrap DiarizeOutput (pyannote-audio >= 3.1) ──────────────────────
#         # speaker-diarization-3.1 now returns DiarizeOutput(diarization=Annotation, ...)
#         # instead of a bare Annotation.  Unwrap to the inner object so all the
#         # itertracks / segments branches below work without modification.
#         diarization = _unwrap_diarization_output(raw_output)

#         turns: list[dict] = []
#         raw_turns: list[tuple[float, float, str]] = []

#         if hasattr(diarization, "itertracks"):
#             # pyannote.core.Annotation -- standard path (pyannote-audio 2.x and
#             # pyannote-audio 3.x after unwrapping DiarizeOutput above)
#             for turn, _, speaker in diarization.itertracks(yield_label=True):
#                 raw_turns.append((turn.start, turn.end, str(speaker)))

#         elif hasattr(diarization, "segments"):
#             # Segment-list output format
#             for seg in diarization.segments:
#                 if isinstance(seg, dict):
#                     raw_turns.append((seg["start"], seg["end"], str(seg.get("speaker", "SPEAKER_0"))))
#                 else:
#                     raw_turns.append((seg.start, seg.end, str(getattr(seg, "speaker", "SPEAKER_0"))))

#         elif hasattr(diarization, "get_timeline"):
#             for seg, _, label in diarization.get_timeline().support().itertracks(yield_label=True):
#                 raw_turns.append((seg.start, seg.end, str(label)))

#         else:
#             attrs = [a for a in dir(diarization) if not a.startswith("_")]
#             log.warning("Unknown diarization output type '%s', attrs: %s",
#                         type(diarization).__name__, attrs)
#             try:
#                 for item in diarization:
#                     if isinstance(item, dict):
#                         raw_turns.append((item["start"], item["end"],
#                                           str(item.get("speaker", "SPEAKER_0"))))
#                     elif isinstance(item, (tuple, list)) and len(item) >= 2:
#                         seg, label = item[0], item[-1]
#                         raw_turns.append((float(seg.start), float(seg.end), str(label)))
#                     elif hasattr(item, "start"):
#                         raw_turns.append((item.start, item.end,
#                                           str(getattr(item, "speaker",
#                                               getattr(item, "label", "SPEAKER_0")))))
#             except Exception as iter_exc:
#                 log.warning("Could not iterate diarization output: %s", iter_exc)

#         for start, end, speaker in raw_turns:
#             if (end - start) < MIN_DIARIZE_SEGMENT_S:
#                 continue
#             turns.append({"speaker": speaker, "start": float(start), "end": float(end)})

#         turns.sort(key=lambda x: x["start"])
#         turns = _normalise_speaker_labels(turns)

#         if not _verify_speakers(wav_path, turns):
#             log.warning("Speaker verification failed -- returning empty diarization.")
#             return []

#         log.info("Diarization: %d turns, speakers: %s",
#                  len(turns), sorted({t["speaker"] for t in turns}))
#         return turns

#     except Exception as exc:
#         log.warning("Diarization failed: %s", exc)
#         return []


# # ── Speaker assignment ────────────────────────────────────────────────────────

# def _assign_speaker(segment: dict, diarization_turns: list[dict]) -> tuple[str, bool]:
#     if not diarization_turns:
#         return "SPEAKER_0", False

#     seg_start, seg_end = segment["start"], segment["end"]
#     seg_mid = (seg_start + seg_end) / 2.0
#     overlapping = []
#     best_speaker = "SPEAKER_0"
#     best_overlap = -1.0
#     best_dist = float("inf")

#     for turn in diarization_turns:
#         overlap = max(0.0, min(seg_end, turn["end"]) - max(seg_start, turn["start"]))
#         if overlap > 0:
#             overlapping.append(turn["speaker"])
#         if overlap > best_overlap:
#             best_overlap = overlap
#             best_speaker = turn["speaker"]
#         if overlap == 0:
#             dist = abs(seg_mid - (turn["start"] + turn["end"]) / 2.0)
#             if dist < best_dist:
#                 best_dist = dist
#                 if best_overlap <= 0:
#                     best_speaker = turn["speaker"]

#     is_overlap = len(set(overlapping)) > 1
#     return best_speaker, is_overlap


# # ── Merge ─────────────────────────────────────────────────────────────────────

# def _merge_segments(segments: list[dict]) -> list[dict]:
#     if not segments:
#         return []
#     cleaned = [
#         s for s in segments
#         if not (s["end"] - s["start"] < MIN_SEGMENT_DURATION and _is_filler_only(s["text"]))
#     ]
#     if not cleaned:
#         return []
#     merged: list[dict] = [dict(cleaned[0])]
#     for seg in cleaned[1:]:
#         prev = merged[-1]
#         gap = seg["start"] - prev["end"]
#         if seg["speaker"] == prev["speaker"] and gap <= MERGE_GAP_SECONDS:
#             prev["text"] = prev["text"].rstrip() + " " + seg["text"].lstrip()
#             prev["end"] = seg["end"]
#             if seg.get("overlap"):
#                 prev["overlap"] = True
#         else:
#             merged.append(dict(seg))
#     return merged


# def _build_full_transcript(turns: list[dict]) -> str:
#     lines = []
#     for t in turns:
#         prefix = f"[{t['speaker']}]"
#         if t.get("overlap"):
#             prefix += "[OVERLAP]"
#         lines.append(f"{prefix} {t['text']}")
#     return "\n".join(lines)


# # ── Sarvam fallback ───────────────────────────────────────────────────────────

# async def _sarvam_fallback(audio_bytes: bytes) -> dict | None:
#     if not ENABLE_SARVAM_FALLBACK or not SARVAM_API_KEY:
#         return None
#     try:
#         import httpx  # type: ignore
#         log.info("Falling back to Sarvam STT ...")
#         async with httpx.AsyncClient(timeout=120) as client:
#             resp = await client.post(
#                 "https://api.sarvam.ai/speech-to-text-translate",
#                 headers={"api-subscription-key": SARVAM_API_KEY},
#                 files={"file": ("audio.m4a", audio_bytes, "audio/m4a")},
#                 data={"model": "saaras:v3", "with_diarization": "true"},
#             )
#             resp.raise_for_status()
#             data = resp.json()
#             return {
#                 "transcript": data.get("transcript", ""),
#                 "language_code": data.get("language_code", "en"),
#                 "turns": [],
#                 "source": "sarvam_fallback",
#             }
#     except Exception as exc:
#         log.error("Sarvam fallback failed: %s", exc)
#         return None


# # ── Main pipeline ─────────────────────────────────────────────────────────────

# async def run_pipeline(audio_bytes: bytes, language_hint: str | None) -> dict:
#     t0 = time.monotonic()

#     log.info("Preprocessing %d bytes ...", len(audio_bytes))
#     wav_path = await asyncio.get_event_loop().run_in_executor(None, _convert_to_wav, audio_bytes)

#     try:
#         t_asr = time.monotonic()
#         whisper_task = asyncio.get_event_loop().run_in_executor(
#             None, _transcribe_wav, wav_path, language_hint)
#         diarize_task = asyncio.get_event_loop().run_in_executor(
#             None, _diarize_wav, wav_path)

#         (whisper_segments, detected_lang), diarization_turns = await asyncio.gather(
#             whisper_task, diarize_task)
#         asr_ms = int((time.monotonic() - t_asr) * 1000)

#         log.info("Whisper: %d segments, lang=%s | Pyannote: %d turns | %.1fs",
#                  len(whisper_segments), detected_lang,
#                  len(diarization_turns), (time.monotonic() - t_asr))

#         if len(whisper_segments) < 2 and ENABLE_SARVAM_FALLBACK:
#             fallback = await _sarvam_fallback(audio_bytes)
#             if fallback:
#                 fallback["metrics"] = {"total_ms": int((time.monotonic() - t0) * 1000)}
#                 return fallback

#         for seg in whisper_segments:
#             speaker, is_overlap = _assign_speaker(seg, diarization_turns)
#             seg["speaker"] = speaker
#             seg["overlap"] = is_overlap

#         merged = _merge_segments(whisper_segments)
#         log.info("After merge: %d turns", len(merged))

#         return {
#             "transcript": _build_full_transcript(merged),
#             "language_code": detected_lang,
#             "turns": [
#                 {
#                     "speaker": t["speaker"],
#                     "text": t["text"],
#                     "start": round(t["start"], 3),
#                     "end": round(t["end"], 3),
#                     **({"overlap": True} if t.get("overlap") else {}),
#                 }
#                 for t in merged
#             ],
#             "metrics": {
#                 "total_ms": int((time.monotonic() - t0) * 1000),
#                 "asr_ms": asr_ms,
#                 "segment_count": len(merged),
#                 "speaker_count": len({t["speaker"] for t in merged}),
#             },
#         }

#     finally:
#         if os.path.exists(wav_path):
#             os.unlink(wav_path)


# # ── FastAPI ───────────────────────────────────────────────────────────────────

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     loop = asyncio.get_event_loop()
#     await loop.run_in_executor(None, _load_whisper)
#     await loop.run_in_executor(None, _load_pyannote)
#     await loop.run_in_executor(None, _load_voice_encoder)
#     yield


# app = FastAPI(title="Hello Doctor - local STT", version="2.0.1", lifespan=lifespan)


# @app.get("/health")
# async def health() -> dict:
#     device, _ = _get_device()
#     return {
#         "status": "ok",
#         "version": "2.0.1",
#         "whisper": _whisper_model is not None,
#         "diarization": _diarization_pipeline is not None,
#         "voice_encoder": _voice_encoder is not None,
#         "deepfilter": _deepfilter_available,
#         "device": device,
#     }


# @app.post("/transcribe")
# async def transcribe(
#     file: UploadFile = File(...),
#     language: str | None = Form(default=None),
# ) -> JSONResponse:
#     if not file.filename:
#         raise HTTPException(status_code=400, detail="No file provided")
#     audio_bytes = await file.read()
#     if not audio_bytes:
#         raise HTTPException(status_code=400, detail="Empty audio file")
#     log.info("Received %s (%d bytes), language hint: %s",
#              file.filename, len(audio_bytes), language)
#     try:
#         result = await run_pipeline(audio_bytes, language or None)
#     except Exception as exc:
#         log.exception("Pipeline error")
#         raise HTTPException(status_code=500, detail=str(exc)) from exc
#     return JSONResponse(content=result)


# if __name__ == "__main__":
#     port = int(os.getenv("PORT", "8765"))
#     uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, timeout_keep_alive=600)