const form = document.getElementById("transcribe-form");
const audioFileInput = document.getElementById("audio-file");
const fileNameLabel = document.getElementById("file-name");
const audioPreview = document.getElementById("audio-preview");
const statusText = document.getElementById("status-text");
const transcriptOutput = document.getElementById("transcript-output");
const submitButton = document.getElementById("submit-button");
const translateToggle = document.getElementById("translate");
const useVadToggle = document.getElementById("use-vad");
const languageSelect = document.getElementById("language");
const profileSelect = document.getElementById("profile");
const profileHelp = document.getElementById("profile-help");
const metaStrip = document.getElementById("meta-strip");
const downloadLinks = document.getElementById("download-links");
const recentList = document.getElementById("recent-list");
const healthPill = document.getElementById("health-pill");
const supportedTypes = document.getElementById("supported-types");

let healthPayload = null;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function bytesToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function setBusy(isBusy, message) {
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "Transcribing..." : "Transcribe Recording";
  statusText.textContent = message;
}

function renderMeta(result) {
  const chips = [
    `Requested: ${result.requested_language_label || result.requested_language}`,
    result.detected_language
      ? `Detected: ${result.detected_language_label || result.detected_language}`
      : "Detected: unavailable",
    `Output: ${result.output_mode || (result.translated ? "English translation" : "Romanized transcription")}`,
    result.used_vad ? "VAD: on" : "VAD: off",
    `Segments: ${result.segments_count}`,
    `Profile: ${result.profile_label || result.profile}`,
    `Model: ${result.model_file || result.model_type}`,
  ];

  metaStrip.innerHTML = chips.map((chip) => `<span class="meta-chip">${chip}</span>`).join("");
  metaStrip.classList.remove("hidden");
}

function renderDownloadLinks(files) {
  const links = [
    files.txt ? `<a href="${files.txt}" target="_blank" rel="noreferrer">Download TXT</a>` : "",
    files.vtt ? `<a href="${files.vtt}" target="_blank" rel="noreferrer">Download VTT</a>` : "",
    files.json ? `<a href="${files.json}" target="_blank" rel="noreferrer">Download JSON</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  downloadLinks.innerHTML = links;
  downloadLinks.classList.toggle("hidden", !links);
}

function renderRecent(items) {
  if (!items.length) {
    recentList.innerHTML = `<div class="recent-empty">No transcripts yet. Your next run will show up here.</div>`;
    return;
  }

  recentList.innerHTML = items
    .map((item) => {
      const links = [
        item.files.txt ? `<a href="${item.files.txt}" target="_blank" rel="noreferrer">TXT</a>` : "",
        item.files.vtt ? `<a href="${item.files.vtt}" target="_blank" rel="noreferrer">VTT</a>` : "",
        item.files.json ? `<a href="${item.files.json}" target="_blank" rel="noreferrer">JSON</a>` : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <article class="recent-card">
          <h3>${item.name}</h3>
          <p>${item.preview}</p>
          <div class="recent-meta">
            <div>${item.created_at}</div>
            <div>Requested ${item.requested_language_label || item.requested_language}${item.detected_language ? ` | Detected ${item.detected_language_label || item.detected_language}` : ""}${item.translated ? " | translated" : ""}${item.profile ? ` | ${item.profile}` : ""}</div>
          </div>
          <div class="recent-links">${links}</div>
        </article>
      `;
    })
    .join("");
}

async function refreshRecent() {
  try {
    const payload = await fetchJson("/api/recent");
    renderRecent(payload.items || []);
  } catch (error) {
    recentList.innerHTML = `<div class="recent-empty">${error.message}</div>`;
  }
}

audioFileInput.addEventListener("change", () => {
  const [file] = audioFileInput.files || [];
  if (!file) {
    fileNameLabel.textContent = "Choose an MP3, WAV, OGG, or FLAC file";
    audioPreview.classList.add("hidden");
    audioPreview.removeAttribute("src");
    return;
  }

  fileNameLabel.textContent = `${file.name} • ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  audioPreview.src = URL.createObjectURL(file);
  audioPreview.classList.remove("hidden");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const [file] = audioFileInput.files || [];
  if (!file) {
    statusText.textContent = "Choose an audio recording first.";
    return;
  }

  try {
    setBusy(true, "Uploading your recording and running local transcription...");
    transcriptOutput.value = "";
    metaStrip.classList.add("hidden");
    downloadLinks.classList.add("hidden");

    const contentBase64 = await bytesToBase64(file);
    const payload = await fetchJson("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        language: languageSelect.value,
        profile: profileSelect.value,
        translate: translateToggle.checked,
        use_vad: useVadToggle.checked,
        content_base64: contentBase64,
      }),
    });

    const result = payload.result;
    statusText.textContent = `Finished. ${result.input_file} was transcribed locally.`;
    transcriptOutput.value = result.transcript || "";
    renderMeta(result);
    renderDownloadLinks(result.files);
    await refreshRecent();
  } catch (error) {
    statusText.textContent = error.message;
    transcriptOutput.value = "";
    metaStrip.classList.add("hidden");
    downloadLinks.classList.add("hidden");
  } finally {
    setBusy(false, statusText.textContent);
  }
});

function updateProfileHelp() {
  if (!healthPayload?.profiles) {
    return;
  }

  const profile = healthPayload.profiles[profileSelect.value];
  if (!profile) {
    return;
  }

  const readyText = profile.ready ? "Installed." : "Model missing.";
  profileHelp.textContent = `${profile.description} ${readyText}`;
}

profileSelect.addEventListener("change", updateProfileHelp);

async function init() {
  try {
    const payload = await fetchJson("/api/health");
    healthPayload = payload;
    const isReady = payload.model_ready && payload.vad_ready && payload.whisper_ready;
    healthPill.textContent = isReady ? "Whisper CPU bundle ready" : "Setup needs attention";
    healthPill.className = `pill ${isReady ? "pill-ok" : "pill-bad"}`;
    supportedTypes.textContent = (payload.supported_extensions || []).join(", ").replaceAll(".", "");
    renderRecent(payload.recent || []);
    updateProfileHelp();
  } catch (error) {
    healthPill.textContent = "UI could not reach the local server";
    healthPill.className = "pill pill-bad";
    recentList.innerHTML = `<div class="recent-empty">${error.message}</div>`;
  }
}

init();
