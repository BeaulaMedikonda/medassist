from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
UI_DIR = ROOT / "ui"
UPLOADS_DIR = ROOT / "uploads"
TRANSCRIPTS_DIR = ROOT / "transcripts"
WHISPER_EXE = ROOT / "bin" / "whisper-cli.exe"
VAD_MODEL_PATH = ROOT / "models" / "ggml-silero-v5.1.2.bin"

SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac"}
THREADS = min(os.cpu_count() or 4, 8)
TIMESTAMP_SUFFIX = re.compile(r"-\d{8}-\d{6}$")

LANGUAGE_LABELS = {
    "auto": "Auto detect",
    "te": "Telugu",
    "hi": "Hindi",
    "en": "English",
}

PROFILE_CONFIGS = {
    "accurate": {
        "label": "Accurate",
        "model_path": ROOT / "models" / "ggml-small-q5_1.bin",
        "extra_args": [],
        "description": "Best quality in this local setup, but slowest on CPU.",
    },
    "fast": {
        "label": "Fast",
        "model_path": ROOT / "models" / "ggml-small-q5_1.bin",
        "extra_args": ["-bo", "1", "-bs", "1", "-nf"],
        "description": "Much faster. Best paired with English translation for Telugu/Hindi audio.",
    },
    "turbo": {
        "label": "Turbo",
        "model_path": ROOT / "models" / "ggml-base-q5_1.bin",
        "extra_args": ["-bo", "1", "-bs", "1", "-nf"],
        "description": "Very fast, but quality drops noticeably.",
    },
    "instant": {
        "label": "Instant",
        "model_path": ROOT / "models" / "ggml-tiny-q5_1.bin",
        "extra_args": ["-bo", "1", "-bs", "1", "-nf"],
        "description": "Fastest option. Lowest quality.",
    },
}

DEVANAGARI_CONFIG = {
    "independent_vowels": {
        "अ": "a",
        "आ": "aa",
        "इ": "i",
        "ई": "ii",
        "उ": "u",
        "ऊ": "uu",
        "ऋ": "ri",
        "ॠ": "rii",
        "ऌ": "li",
        "ए": "e",
        "ऐ": "ai",
        "ओ": "o",
        "औ": "au",
        "ऑ": "o",
        "ऍ": "e",
    },
    "consonants": {
        "क": "k",
        "ख": "kh",
        "ग": "g",
        "घ": "gh",
        "ङ": "ng",
        "च": "ch",
        "छ": "chh",
        "ज": "j",
        "झ": "jh",
        "ञ": "ny",
        "ट": "t",
        "ठ": "th",
        "ड": "d",
        "ढ": "dh",
        "ण": "n",
        "त": "t",
        "थ": "th",
        "द": "d",
        "ध": "dh",
        "न": "n",
        "प": "p",
        "फ": "ph",
        "ब": "b",
        "भ": "bh",
        "म": "m",
        "य": "y",
        "र": "r",
        "ल": "l",
        "व": "v",
        "श": "sh",
        "ष": "sh",
        "स": "s",
        "ह": "h",
        "ळ": "l",
    },
    "vowel_signs": {
        "ा": "aa",
        "ि": "i",
        "ी": "ii",
        "ु": "u",
        "ू": "uu",
        "ृ": "ri",
        "ॄ": "rii",
        "ॅ": "e",
        "े": "e",
        "ै": "ai",
        "ॉ": "o",
        "ो": "o",
        "ौ": "au",
        "ॢ": "li",
    },
    "virama": "्",
    "signs": {
        "ं": "m",
        "ँ": "m",
        "ः": "h",
        "़": "",
        "।": ".",
        "॥": ".",
    },
    "inherent_vowel": "a",
}

TELUGU_CONFIG = {
    "independent_vowels": {
        "అ": "a",
        "ఆ": "aa",
        "ఇ": "i",
        "ఈ": "ii",
        "ఉ": "u",
        "ఊ": "uu",
        "ఋ": "ru",
        "ౠ": "ruu",
        "ఎ": "e",
        "ఏ": "ee",
        "ఐ": "ai",
        "ఒ": "o",
        "ఓ": "oo",
        "ఔ": "au",
    },
    "consonants": {
        "క": "k",
        "ఖ": "kh",
        "గ": "g",
        "ఘ": "gh",
        "ఙ": "ng",
        "చ": "ch",
        "ఛ": "chh",
        "జ": "j",
        "ఝ": "jh",
        "ఞ": "ny",
        "ట": "t",
        "ఠ": "th",
        "డ": "d",
        "ఢ": "dh",
        "ణ": "n",
        "త": "t",
        "థ": "th",
        "ద": "d",
        "ధ": "dh",
        "న": "n",
        "ప": "p",
        "ఫ": "ph",
        "బ": "b",
        "భ": "bh",
        "మ": "m",
        "య": "y",
        "ర": "r",
        "ఱ": "r",
        "ల": "l",
        "ళ": "l",
        "వ": "v",
        "శ": "sh",
        "ష": "sh",
        "స": "s",
        "హ": "h",
    },
    "vowel_signs": {
        "ా": "aa",
        "ి": "i",
        "ీ": "ii",
        "ు": "u",
        "ూ": "uu",
        "ృ": "ru",
        "ౄ": "ruu",
        "ె": "e",
        "ే": "ee",
        "ై": "ai",
        "ొ": "o",
        "ో": "oo",
        "ౌ": "au",
    },
    "virama": "్",
    "signs": {
        "ం": "m",
        "ః": "h",
    },
    "inherent_vowel": "a",
}


def ensure_layout() -> None:
    for directory in (UPLOADS_DIR, TRANSCRIPTS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    original = Path(filename or "recording.wav")
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", original.stem).strip("._-") or "recording"
    suffix = original.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported file type. Use one of: "
            + ", ".join(sorted(SUPPORTED_EXTENSIONS))
        )
    return f"{stem}{suffix}"


def make_run_name(source_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    stem = Path(source_name).stem
    return f"{stem}-{timestamp}"


def strip_timestamp_suffix(stem: str) -> str:
    return TIMESTAMP_SUFFIX.sub("", stem)


def read_text_if_present(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace").strip()


def language_label(code: str) -> str:
    return LANGUAGE_LABELS.get(code, code)


def romanize_abugida_text(text: str, config: dict) -> str:
    independent_vowels = config["independent_vowels"]
    consonants = config["consonants"]
    vowel_signs = config["vowel_signs"]
    virama = config["virama"]
    signs = config["signs"]
    inherent_vowel = config["inherent_vowel"]

    pieces: list[str] = []
    index = 0

    while index < len(text):
        char = text[index]

        if char in consonants:
            base = consonants[char]
            next_char = text[index + 1] if index + 1 < len(text) else ""

            if next_char == virama:
                pieces.append(base)
                index += 2
                continue

            if next_char in vowel_signs:
                pieces.append(base + vowel_signs[next_char])
                index += 2
                continue

            pieces.append(base + inherent_vowel)
            index += 1
            continue

        if char in independent_vowels:
            pieces.append(independent_vowels[char])
            index += 1
            continue

        if char in vowel_signs:
            pieces.append(vowel_signs[char])
            index += 1
            continue

        if char in signs:
            pieces.append(signs[char])
            index += 1
            continue

        if char == virama:
            index += 1
            continue

        pieces.append(char)
        index += 1

    return "".join(pieces)


def romanize_text(text: str) -> str:
    return romanize_abugida_text(
        romanize_abugida_text(text, DEVANAGARI_CONFIG),
        TELUGU_CONFIG,
    )


def postprocess_transcript_files(
    txt_path: Path,
    vtt_path: Path,
    json_path: Path,
    translate: bool,
) -> str:
    transcript_text = read_text_if_present(txt_path)

    if translate:
        return transcript_text

    romanized_text = romanize_text(transcript_text)
    if txt_path.exists():
        txt_path.write_text(romanized_text, encoding="utf-8")

    if vtt_path.exists():
        romanized_vtt = romanize_text(vtt_path.read_text(encoding="utf-8", errors="replace"))
        vtt_path.write_text(romanized_vtt, encoding="utf-8")

    if json_path.exists():
        metadata = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        for segment in metadata.get("transcription", []):
            if "text" in segment:
                segment["text"] = romanize_text(str(segment["text"]))
            for token in segment.get("tokens", []):
                if "text" in token:
                    token["text"] = romanize_text(str(token["text"]))
        metadata.setdefault("result", {})["output_script"] = "latin"
        json_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    return romanized_text


def recent_runs(limit: int = 8) -> list[dict]:
    items: list[dict] = []

    for json_path in sorted(
        TRANSCRIPTS_DIR.glob("*.json"),
        key=lambda candidate: candidate.stat().st_mtime,
        reverse=True,
    )[:limit]:
        base = json_path.with_suffix("")
        txt_path = base.with_suffix(".txt")
        vtt_path = base.with_suffix(".vtt")
        payload = {}

        try:
            payload = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        except json.JSONDecodeError:
            payload = {}

        transcript_preview = romanize_text(read_text_if_present(txt_path)).replace("\n", " ")
        transcript_preview = transcript_preview[:180].strip()
        if transcript_preview and len(transcript_preview) == 180:
            transcript_preview += "..."

        items.append(
            {
                "name": base.name,
                "created_at": datetime.fromtimestamp(json_path.stat().st_mtime).strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
                "requested_language": payload.get("params", {}).get("language", "auto"),
                "requested_language_label": language_label(
                    payload.get("params", {}).get("language", "auto")
                ),
                "detected_language": payload.get("result", {}).get("language", ""),
                "detected_language_label": language_label(
                    payload.get("result", {}).get("language", "")
                ),
                "translated": bool(payload.get("params", {}).get("translate")),
                "profile": payload.get("params", {}).get("profile", "accurate"),
                "preview": transcript_preview or "Transcript preview unavailable.",
                "files": {
                    "txt": f"/files/transcripts/{txt_path.name}" if txt_path.exists() else None,
                    "json": f"/files/transcripts/{json_path.name}",
                    "vtt": f"/files/transcripts/{vtt_path.name}" if vtt_path.exists() else None,
                },
            }
        )

    return items


def transcribe(saved_audio: Path, language: str, translate: bool, use_vad: bool, profile: str) -> dict:
    if not WHISPER_EXE.exists():
        raise FileNotFoundError(f"Missing executable: {WHISPER_EXE}")

    profile_config = PROFILE_CONFIGS.get(profile)
    if profile_config is None:
        raise ValueError(f"Unknown profile: {profile}")

    model_path = profile_config["model_path"]
    if not model_path.exists():
        raise FileNotFoundError(f"Missing model: {model_path}")
    if use_vad and not VAD_MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing VAD model: {VAD_MODEL_PATH}")

    source_stem = strip_timestamp_suffix(saved_audio.stem)
    run_name = f"{source_stem}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    output_base = TRANSCRIPTS_DIR / run_name

    args = [
        str(WHISPER_EXE),
        "-m",
        str(model_path),
        "-t",
        str(THREADS),
        "-l",
        language,
        "-otxt",
        "-ovtt",
        "-oj",
        "-ojf",
        "-of",
        str(output_base),
        "-ng",
        "-np",
        str(saved_audio),
    ]

    args.extend(profile_config["extra_args"])

    if translate:
        args.append("-tr")

    if use_vad:
        args.extend(["--vad", "-vm", str(VAD_MODEL_PATH)])

    env = os.environ.copy()
    env["OPENBLAS_NUM_THREADS"] = "1"

    result = subprocess.run(
        args,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
        check=False,
    )

    if result.returncode != 0:
        message = (result.stderr or result.stdout or "Unknown whisper.cpp error").strip()
        raise RuntimeError(message)

    txt_path = output_base.with_suffix(".txt")
    json_path = output_base.with_suffix(".json")
    vtt_path = output_base.with_suffix(".vtt")

    transcript_text = postprocess_transcript_files(
        txt_path=txt_path,
        vtt_path=vtt_path,
        json_path=json_path,
        translate=translate,
    )
    metadata = {}
    if json_path.exists():
        metadata = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))

    return {
        "run_name": run_name,
        "input_file": saved_audio.name,
        "transcript": transcript_text,
        "requested_language": language,
        "requested_language_label": language_label(language),
        "detected_language": metadata.get("result", {}).get("language", ""),
        "detected_language_label": language_label(metadata.get("result", {}).get("language", "")),
        "translated": translate,
        "output_mode": "English translation" if translate else "Romanized transcription",
        "used_vad": use_vad,
        "segments_count": len(metadata.get("transcription", [])),
        "model_type": metadata.get("model", {}).get("type", "small"),
        "model_file": model_path.name,
        "profile": profile,
        "profile_label": profile_config["label"],
        "files": {
            "txt": f"/files/transcripts/{txt_path.name}" if txt_path.exists() else None,
            "json": f"/files/transcripts/{json_path.name}" if json_path.exists() else None,
            "vtt": f"/files/transcripts/{vtt_path.name}" if vtt_path.exists() else None,
        },
    }


class WhisperUIHandler(BaseHTTPRequestHandler):
    server_version = "WhisperUI/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/":
            return self.serve_static("index.html", "text/html; charset=utf-8")
        if path == "/favicon.svg":
            return self.serve_static("favicon.svg", "image/svg+xml")
        if path == "/favicon.ico":
            return self.serve_static("favicon.svg", "image/svg+xml")
        if path == "/styles.css":
            return self.serve_static("styles.css", "text/css; charset=utf-8")
        if path == "/app.js":
            return self.serve_static("app.js", "application/javascript; charset=utf-8")
        if path == "/api/health":
            return self.send_json(
                {
                    "ok": True,
                    "model_ready": PROFILE_CONFIGS["accurate"]["model_path"].exists(),
                    "vad_ready": VAD_MODEL_PATH.exists(),
                    "whisper_ready": WHISPER_EXE.exists(),
                    "supported_extensions": sorted(SUPPORTED_EXTENSIONS),
                    "languages": LANGUAGE_LABELS,
                    "profiles": {
                        key: {
                            "label": value["label"],
                            "description": value["description"],
                            "ready": value["model_path"].exists(),
                            "model_file": value["model_path"].name,
                        }
                        for key, value in PROFILE_CONFIGS.items()
                    },
                    "recent": recent_runs(),
                }
            )
        if path == "/api/recent":
            return self.send_json({"items": recent_runs()})
        if path.startswith("/files/"):
            return self.serve_generated_file(path)

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path != "/api/transcribe":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        try:
            payload = self.read_json_body()
            filename = sanitize_filename(str(payload.get("filename", "")))
            language = str(payload.get("language", "auto")).strip() or "auto"
            translate = bool(payload.get("translate", False))
            use_vad = bool(payload.get("use_vad", True))
            profile = str(payload.get("profile", "accurate")).strip() or "accurate"
            content_base64 = str(payload.get("content_base64", ""))

            if not content_base64:
                raise ValueError("Missing file content.")

            raw_bytes = base64.b64decode(content_base64, validate=True)
            saved_audio = UPLOADS_DIR / f"{make_run_name(filename)}{Path(filename).suffix.lower()}"
            saved_audio.write_bytes(raw_bytes)

            result = transcribe(saved_audio, language, translate, use_vad, profile)
            self.send_json({"ok": True, "result": result})
        except Exception as exc:
            self.send_json(
                {"ok": False, "error": str(exc)},
                status=HTTPStatus.BAD_REQUEST,
            )

    def serve_static(self, filename: str, content_type: str) -> None:
        target = UI_DIR / filename
        if not target.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_generated_file(self, path: str) -> None:
        decoded = unquote(path)
        if decoded.startswith("/files/transcripts/"):
            target = TRANSCRIPTS_DIR / decoded.removeprefix("/files/transcripts/")
        elif decoded.startswith("/files/uploads/"):
            target = UPLOADS_DIR / decoded.removeprefix("/files/uploads/")
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        resolved_target = target.resolve()
        allowed_roots = {TRANSCRIPTS_DIR.resolve(), UPLOADS_DIR.resolve()}
        if resolved_target.parent not in allowed_roots or not resolved_target.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_type = "application/octet-stream"
        if resolved_target.suffix == ".txt":
            content_type = "text/plain; charset=utf-8"
        elif resolved_target.suffix == ".json":
            content_type = "application/json; charset=utf-8"
        elif resolved_target.suffix == ".vtt":
            content_type = "text/vtt; charset=utf-8"

        body = resolved_target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header(
            "Content-Disposition",
            f'inline; filename="{resolved_target.name}"',
        )
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            raise ValueError("Empty request body.")
        if content_length > 150 * 1024 * 1024:
            raise ValueError("File is too large for this lightweight UI.")

        raw_body = self.rfile.read(content_length)
        return json.loads(raw_body.decode("utf-8"))

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {self.address_string()} - {fmt % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Small local UI for whisper.cpp CPU transcription")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7861)
    return parser.parse_args()


def main() -> None:
    ensure_layout()
    args = parse_args()

    server = ThreadingHTTPServer((args.host, args.port), WhisperUIHandler)
    print("")
    print("Whisper UI is ready.")
    print(f"Open: http://{args.host}:{args.port}")
    print("Stop with: Ctrl+C")
    print("")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
