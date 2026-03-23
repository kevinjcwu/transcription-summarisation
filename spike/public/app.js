// ── Configuration ──────────────────────────────────────────────────────
const CHUNK_INTERVAL_MS = 45_000; // Summarize every 45 seconds max
const PAUSE_THRESHOLD_MS = 3_000; // Summarize after 3 seconds of silence
const WS_MESSAGE_STOP = "STOP";
const AUDIO_SAMPLE_RATE = 16_000;
const AUDIO_BUFFER_SIZE = 4096;

// ── State ──────────────────────────────────────────────────────────────
let audioContext = null;
let mediaStream = null;
let ws = null;
let processorNode = null;
let transcriptBuffer = "";
let fullTranscript = "";
let chunkTimer = null;
let currentNotes = null;
let isProcessing = false;
let lastSpeechTime = 0;
let pauseChecker = null;
let meetingStartTime = null;
let meetingTimerInterval = null;

// ── DOM helpers ────────────────────────────────────────────────────────

function setStatus(text, active) {
  document.getElementById("statusText").textContent = text;
  document.getElementById("statusDot").classList.toggle("active", active);
}

function showError(msg) {
  document.getElementById("error").textContent = msg;
}

function scrollTranscript() {
  const bar = document.querySelector(".transcript-bar");
  bar.scrollTop = bar.scrollHeight;
}

function startMeetingTimer() {
  meetingTimerInterval = setInterval(() => {
    if (!meetingStartTime) return;
    const elapsed = Math.floor((Date.now() - meetingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    setStatus(`Listening... ${mins}:${secs}`, true);
  }, 1000);
}

function stopMeetingTimer() {
  if (meetingTimerInterval) clearInterval(meetingTimerInterval);
  meetingTimerInterval = null;
}

function renderList(id, items) {
  const ul = document.getElementById(id);
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="empty-state">Nothing yet...</li>';
    return;
  }
  ul.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function updateDashboard(notes) {
  if (!notes) return;
  currentNotes = notes;
  renderList("keyPoints", notes.keyPoints);
  renderList("decisions", notes.decisions);
  renderList("actionItems", notes.actionItems);
}

function clearSession() {
  fullTranscript = "";
  transcriptBuffer = "";
  currentNotes = null;
  meetingStartTime = null;
  document.getElementById("liveTranscript").textContent = "—";
  document.getElementById("exportBtn").style.display = "none";
  document.getElementById("exportTranscriptBtn").style.display = "none";
  document.getElementById("clearBtn").style.display = "none";
  renderList("keyPoints", []);
  renderList("decisions", []);
  renderList("actionItems", []);
  setStatus("Ready", false);
}

// ── Summarization ──────────────────────────────────────────────────────

async function summarizeChunk() {
  if (!transcriptBuffer.trim() || isProcessing) return;

  const chunk = transcriptBuffer;
  transcriptBuffer = "";
  isProcessing = true;

  try {
    const resp = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunk, previousNotes: currentNotes }),
    });
    if (!resp.ok) throw new Error("Summarize failed");
    const notes = await resp.json();
    updateDashboard(notes);
  } catch (err) {
    showError("Summarization error: " + err.message);
    transcriptBuffer = chunk + " " + transcriptBuffer;
  } finally {
    isProcessing = false;
  }
}

function startChunkTimers() {
  chunkTimer = setInterval(summarizeChunk, CHUNK_INTERVAL_MS);
  pauseChecker = setInterval(() => {
    if (
      lastSpeechTime > 0 &&
      Date.now() - lastSpeechTime > PAUSE_THRESHOLD_MS &&
      transcriptBuffer.trim()
    ) {
      console.log("Pause detected — triggering summarization.");
      lastSpeechTime = 0;
      summarizeChunk();
    }
  }, 1000);
}

function stopChunkTimers() {
  if (chunkTimer) clearInterval(chunkTimer);
  if (pauseChecker) clearInterval(pauseChecker);
  chunkTimer = null;
  pauseChecker = null;
}

// ── Audio capture ──────────────────────────────────────────────────────

function convertFloat32ToInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function startAudioCapture() {
  audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
  const source = audioContext.createMediaStreamSource(mediaStream);

  processorNode = audioContext.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);
  processorNode.onaudioprocess = (e) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const int16 = convertFloat32ToInt16(e.inputBuffer.getChannelData(0));
      ws.send(int16.buffer);
    }
  };

  source.connect(processorNode);
  processorNode.connect(audioContext.destination);
  startChunkTimers();
}

function stopAudioCapture() {
  stopChunkTimers();
  if (processorNode) {
    processorNode.disconnect();
    processorNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}

// ── WebSocket message handling ─────────────────────────────────────────

function handleWsMessage(event) {
  let msg;
  try {
    msg = JSON.parse(event.data);
  } catch (_) {
    console.warn("Received malformed WebSocket message");
    return;
  }

  switch (msg.type) {
    case "ready":
      console.log("✅ Azure Speech SDK ready");
      setStatus("Listening...", true);
      document.getElementById("endBtn").disabled = false;
      meetingStartTime = Date.now();
      startMeetingTimer();
      startAudioCapture();
      break;

    case "recognizing":
      document.getElementById("liveTranscript").textContent =
        fullTranscript + (msg.timestamp ? `[${msg.timestamp}] ` : "") + (msg.speaker ? `[${msg.speaker}]: ` : "") + msg.text;
      scrollTranscript();
      lastSpeechTime = Date.now();
      break;

    case "recognized":
      const time = msg.timestamp ? `[${msg.timestamp}] ` : "";
      const speaker = msg.speaker ? `[${msg.speaker}]: ` : "";
      fullTranscript += time + speaker + msg.text + "\n";
      transcriptBuffer += (msg.speaker ? `[${msg.speaker}]: ` : "") + msg.text + " ";
      document.getElementById("liveTranscript").textContent = fullTranscript;
      scrollTranscript();
      lastSpeechTime = Date.now();
      break;

    case "error":
      showError("Speech error: " + msg.error);
      break;
  }
}

// ── Meeting lifecycle ──────────────────────────────────────────────────

async function startMeeting() {
  showError("");
  setStatus("Connecting...", false);
  document.getElementById("startBtn").disabled = true;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(protocol + "//" + window.location.host + "/ws/speech");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("WebSocket connected, waiting for Azure Speech SDK...");
      setStatus("Connecting to Azure Speech...", false);
    };

    ws.onmessage = handleWsMessage;

    ws.onerror = () => {
      showError("WebSocket error");
      document.getElementById("startBtn").disabled = false;
    };

    ws.onclose = () => console.log("Speech WebSocket closed");
  } catch (err) {
    showError("Setup error: " + err.message);
    document.getElementById("startBtn").disabled = false;
  }
}

async function endMeeting() {
  setStatus("Ending meeting...", false);
  document.getElementById("endBtn").disabled = true;

  stopChunkTimers();
  stopMeetingTimer();

  // Stop audio capture and close WebSocket
  stopAudioCapture();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(WS_MESSAGE_STOP);
    setTimeout(() => ws.close(), 2000);
  }

  // Final comprehensive summarization using the full transcript
  if (fullTranscript.trim()) {
    setStatus("Generating final summary...", false);
    try {
      const resp = await fetch("/api/summarize-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullTranscript }),
      });
      if (resp.ok) {
        const notes = await resp.json();
        updateDashboard(notes);
      }
    } catch (err) {
      console.warn("Full summarization failed, keeping chunked notes:", err.message);
    }
  }

  setStatus("Meeting ended", false);
  document.getElementById("exportBtn").style.display = "inline-block";
  document.getElementById("exportTranscriptBtn").style.display = "inline-block";
  document.getElementById("clearBtn").style.display = "inline-block";
  document.getElementById("startBtn").disabled = false;
}

// ── Export ──────────────────────────────────────────────────────────────

function exportNotes() {
  if (!currentNotes) return;

  const lines = ["# Meeting Notes\n", "## Key Points"];
  (currentNotes.keyPoints || []).forEach((p) => lines.push("- " + p));
  lines.push("\n## Decisions");
  (currentNotes.decisions || []).forEach((d) => lines.push("- " + d));
  lines.push("\n## Action Items");
  (currentNotes.actionItems || []).forEach((a) => lines.push("- " + a));

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "meeting-notes.md";
  a.click();
}

function exportTranscript() {
  if (!fullTranscript.trim()) return;

  const blob = new Blob([fullTranscript], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "meeting-transcript.txt";
  a.click();
}
