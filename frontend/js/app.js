import { api } from "./api.js";
import {
  blobToBase64,
  ContinuousListener,
  isContinuousListeningSupported,
  playFennaAudio,
  stopFennaAudio,
} from "./voice.js";

const $ = (id) => document.getElementById(id);

const state = {
  sessionId: null,
  residentId: localStorage.getItem("hartmaatje_resident") ?? "guest",
  listener: null,
  busy: false,
  micLive: false,
};

const statusLabels = {
  listening: "Ik luister… Spreek gerust. De microfoon blijft aan.",
  transcribing: "Ik zet uw woorden om…",
  thinking: "Fenna denkt even na…",
  speaking: "Fenna spreekt… Een moment geduld.",
  ended: "Sessie beëindigd. Druk op Start om opnieuw te beginnen.",
  error: "Er ging iets mis.",
};

function setStatus(key, detail = "") {
  $("status").textContent = detail || statusLabels[key] || key;
  $("status").dataset.state = key;
}

function setMicIndicator(live) {
  state.micLive = live;
  const el = $("micIndicator");
  el.classList.toggle("mic-indicator--live", live);
  el.classList.toggle("mic-indicator--paused", !live && Boolean(state.sessionId));
  $("micLabel").textContent = live
    ? "Microfoon aan — spreek gerust"
    : state.busy
      ? "Even wachten…"
      : "Microfoon pauze (Fenna spreekt)";
}

function setBusy(busy) {
  state.busy = busy;
  $("endBtn").disabled = busy && !state.sessionId;
}

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `message message--${role}`;
  el.innerHTML = `<span class="message__label">${role === "user" ? "U" : "Fenna"}</span><p>${escapeHtml(text)}</p>`;
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function speakReply(text) {
  state.listener?.pause();
  stopFennaAudio();
  setStatus("speaking");
  setMicIndicator(false);

  try {
    const audio = await api.speak(state.sessionId, text);
    await playFennaAudio(audio.audio_base64, audio.mime_type);
  } catch (err) {
    console.warn("TTS fallback:", err);
    if ("speechSynthesis" in window) {
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "nl-NL";
        u.rate = 0.92;
        u.onend = resolve;
        u.onerror = resolve;
        window.speechSynthesis.speak(u);
      });
    }
  }
}

async function handleUserMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || !state.sessionId) return;

  addMessage("user", trimmed);
  setBusy(true);
  state.listener?.pause();
  setStatus("thinking");
  setMicIndicator(false);

  try {
    const res = await api.sendMessage(state.sessionId, trimmed);
    addMessage("assistant", res.reply);
    await speakReply(res.reply);
  } catch (err) {
    setStatus("error", err.message);
  } finally {
    setBusy(false);
    if (state.listener && state.sessionId) {
      // Korte pauze zodat Fenna's stem niet opnieuw de microfoon triggert
      await new Promise((r) => setTimeout(r, 300));
      state.listener.resume();
      setStatus("listening");
      setMicIndicator(true);
    }
  }
}

async function onUtterance(blob) {
  setBusy(true);
  setStatus("thinking");
  setMicIndicator(false);
  state.listener?.pause();

  try {
    const base64 = await blobToBase64(blob);
    const res = await api.voiceTurn(
      state.sessionId,
      base64,
      blob.type || "audio/webm",
    );
    addMessage("user", res.user_text);
    addMessage("assistant", res.reply);
    setStatus("speaking");
    await playFennaAudio(res.audio_base64, res.mime_type);
  } catch (err) {
    setStatus("error", err.message);
  } finally {
    setBusy(false);
    if (state.listener && state.sessionId) {
      await new Promise((r) => setTimeout(r, 300));
      state.listener.resume();
      setStatus("listening");
      setMicIndicator(true);
    }
  }
}

async function startContinuousListening() {
  if (!isContinuousListeningSupported()) {
    setStatus("error", "Microfoon niet beschikbaar in deze browser.");
    return;
  }

  state.listener = new ContinuousListener({
    onUtterance: onUtterance,
    onListeningChange: (live) => {
      if (!state.busy) setMicIndicator(live);
    },
  });

  await state.listener.start();
  setStatus("listening");
  setMicIndicator(true);
}

function stopContinuousListening() {
  state.listener?.stop();
  state.listener = null;
  stopFennaAudio();
  setMicIndicator(false);
}

async function startSession() {
  setBusy(true);
  try {
    const res = await api.startSession(state.residentId);
    state.sessionId = res.session_id;
    $("messages").innerHTML = "";
    $("sessionPanel").hidden = false;
    $("startPanel").hidden = true;
    addMessage("assistant", res.opening_message);
    await speakReply(res.opening_message);
    await startContinuousListening();
  } catch (err) {
    setStatus("error", err.message);
  } finally {
    setBusy(false);
  }
}

async function endSession() {
  if (!state.sessionId) return;
  setBusy(true);
  try {
    stopContinuousListening();
    await api.endSession(state.sessionId);
    state.sessionId = null;
    $("sessionPanel").hidden = true;
    $("startPanel").hidden = false;
    setStatus("ended");
  } catch (err) {
    setStatus("error", err.message);
  } finally {
    setBusy(false);
  }
}

$("startBtn").addEventListener("click", startSession);
$("endBtn").addEventListener("click", endSession);

api.health()
  .then((h) => {
    if (!h.fenna_ready) {
      setStatus("error", "Backend draait, maar GEMINI_API_KEY ontbreekt in backend/.env");
    }
  })
  .catch(() => {
    setStatus("error", "Kan backend niet bereiken. Start Python op poort 8000.");
  });
