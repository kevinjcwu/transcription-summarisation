# Azure Speech SDK Transcription Spike — Implementation Documentation

## Overview

This spike proves that a browser-based meeting tool can **live-transcribe conversations using Azure Speech Services** (the same technology that powers Microsoft Teams transcription) and **automatically summarize them into structured notes** using Azure OpenAI — all without recording audio or identifying speakers.

### Spike Question Answered

> **Can we use Azure services to capture live speech from a shared room mic, transcribe it, and present a live-updating dashboard of meeting notes?**

✅ **Yes.** The full pipeline works: mic → Azure Speech SDK → real-time transcript → Azure OpenAI summarization → live dashboard with Key Points, Decisions, and Action Items.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│                                                                  │
│  ┌──────────────┐                                                │
│  │ Start Meeting │──→ getUserMedia() ──→ AudioContext (16kHz)    │
│  └──────────────┘                           │                    │
│                                             │ PCM int16 chunks   │
│                                             ▼                    │
│                                    WebSocket (/ws/speech)        │
│                                             │                    │
│  ┌──────────────────────────────────────────┐│                   │
│  │         LIVE DASHBOARD                    ││                  │
│  │                                           ││                  │
│  │  📌 Key Points          ✅ Decisions      ││                  │
│  │  • discussed migration  • go with PG     ◄┤ JSON updates     │
│  │  • reviewed timeline    • delay launch    ││                  │
│  │                                           ││                  │
│  │  📋 Action Items                          ││                  │
│  │  • set up dev env by Fri                  ││                  │
│  └──────────────────────────────────────────┘│                   │
│                                              │                   │
│  ┌───────────────────────────────────────────┐                   │
│  │  Live transcript: "so we agreed to..."    │◄── text updates   │
│  └───────────────────────────────────────────┘                   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ WebSocket (binary audio up, JSON text down)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NODE.JS SERVER (localhost:3000)               │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                 │
│  │  WebSocket Handler (/ws/speech)             │                 │
│  │                                             │                 │
│  │  Browser audio ──→ PushStream ──→ Azure     │                 │
│  │                                  Speech SDK │                 │
│  │                                     │       │                 │
│  │  "recognizing" events ◄─────────────┘       │                 │
│  │  "recognized" events  ◄─────────────┘       │                 │
│  │          │                                  │                 │
│  │          └──→ Send to browser via WebSocket │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                 │
│  │  POST /api/summarize                        │                 │
│  │                                             │                 │
│  │  Transcript chunk ──→ Azure OpenAI (GPT)    │                 │
│  │                           │                 │                 │
│  │  { keyPoints, decisions,  │                 │                 │
│  │    actionItems }  ◄───────┘                 │                 │
│  └─────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AZURE SERVICES                              │
│                                                                  │
│  ┌─────────────────────┐  ┌──────────────────────────┐          │
│  │  Azure AI Speech     │  │  Azure OpenAI             │          │
│  │  (eastus region)     │  │  (GPT model deployment)   │          │
│  │                      │  │                            │          │
│  │  Real-time STT       │  │  Transcript → structured   │          │
│  │  Same engine as      │  │  meeting notes (JSON)      │          │
│  │  Microsoft Teams     │  │                            │          │
│  └─────────────────────┘  └──────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## How It Works — Step by Step

### 1. Start Meeting (User Action)

The user opens `http://localhost:3000` and clicks **"▶ Start Meeting"**.

**What happens:**
- Browser requests microphone permission via `getUserMedia()`
- A WebSocket connection opens to the server at `/ws/speech`
- Status shows "Connecting to Azure Speech..."

### 2. Server Initializes Azure Speech SDK

When the WebSocket connects, the server:

1. Obtains an Azure AD token via `DefaultAzureCredential` (uses `az login` session)
2. Creates a `SpeechConfig` pointing to the **regional Speech endpoint** (`eastus.stt.speech.microsoft.com`) with the `Ocp-Apim-Custom-Domain-Name` query parameter
3. Creates a `PushStream` (16kHz, 16-bit, mono PCM) and a `SpeechRecognizer`
4. Starts continuous recognition
5. Sends `{ type: "ready" }` to the browser when the SDK is connected

### 3. Audio Streaming (Browser → Server → Azure)

Once the SDK is ready:

1. Browser creates an `AudioContext` at 16kHz sample rate
2. A `ScriptProcessorNode` captures raw audio from the mic
3. Audio is converted from `Float32` to `Int16` PCM
4. PCM chunks are sent as binary WebSocket messages to the server
5. Server pushes each chunk into the Speech SDK's `PushStream`
6. Azure Speech Service processes the audio and returns transcript events

### 4. Transcription Events (Azure → Server → Browser)

The Speech SDK fires two types of events:

| Event | Meaning | UI Behavior |
|---|---|---|
| `recognizing` | Interim/partial result (words being spoken) | Updates transcript bar with in-progress text |
| `recognized` | Final confirmed text for a speech segment | Appends to full transcript + transcript buffer |

Both are relayed to the browser as JSON via the WebSocket.

### 5. Auto-Summarization (Hybrid Chunking)

The browser accumulates finalized transcript text in a buffer. Summarization triggers on either condition:

- **Pause detection**: 3 seconds of silence after speech → triggers immediately
- **Time-based fallback**: Every 45 seconds (for long uninterrupted speech)

When triggered:

1. Browser sends the transcript buffer to `POST /api/summarize`
2. Server sends the chunk (plus any previous notes for context) to Azure OpenAI
3. GPT returns structured JSON: `{ keyPoints: [...], decisions: [...], actionItems: [...] }`
4. Browser updates the dashboard cards with the new/merged notes

### 6. End Meeting (User Action)

Clicking **"⏹ End Meeting"**:

1. Stops audio capture and mic access
2. Sends `"STOP"` to the server (closes the Speech SDK push stream)
3. Runs final summarization on any remaining transcript buffer
4. Shows the **"📥 Export Notes"** button

### 7. Export (Optional)

Clicking **"📥 Export Notes"** downloads a `meeting-notes.md` file with the structured notes.

---

## Key Technical Concepts

### Azure Speech SDK with Azure AD Auth (disableLocalAuth=true)

Enterprise Azure subscriptions often enforce `disableLocalAuth=true` via Azure Policy, which disables API key authentication on Cognitive Services. This creates a specific challenge:

**The problem:** When a Speech resource has a custom domain (required for Azure AD auth), the Speech SDK attempts to connect to `wss://<custom-domain>.cognitiveservices.azure.com/...`, but the custom domain returns a **301 redirect** to the regional endpoint. The Node.js Speech SDK does not follow WebSocket redirects, causing it to hang silently.

**The solution we discovered:**
```javascript
// Connect directly to the regional endpoint, bypassing the custom domain redirect
const endpoint = new URL(
  "wss://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
);
// Tell Azure which custom domain resource to authenticate against
endpoint.searchParams.set("Ocp-Apim-Custom-Domain-Name", "your-resource.cognitiveservices.azure.com");

const speechConfig = sdk.SpeechConfig.fromEndpoint(endpoint);
// Use raw Azure AD bearer token (NOT the "aad#resource#token" format)
speechConfig.authorizationToken = azureAdToken;
```

This bypasses the redirect while still authenticating via Azure AD against the correct resource.

### Server-Side Speech Recognition

Speech recognition runs on the **server** (not in the browser) because:

1. The browser Speech SDK puts the Azure AD token in the WebSocket URL query string, which exceeds URL length limits and gets rejected
2. Server-side, the Node.js SDK sends auth via HTTP headers (no URL length issue)
3. The server acts as a relay: browser sends raw PCM audio, server handles Azure auth and returns transcript text

### Audio Pipeline

```
Browser mic (native sample rate, e.g. 48kHz)
  → AudioContext (resampled to 16kHz)
  → ScriptProcessorNode (4096-sample buffers)
  → Float32 → Int16 conversion
  → Binary WebSocket message (8192 bytes per chunk)
  → Server PushStream
  → Azure Speech SDK
```

The `16kHz / 16-bit / mono` format is what Azure Speech expects for speech-to-text. The browser's `AudioContext` handles the resampling automatically when created with `{ sampleRate: 16000 }`.

### Summarization Prompt Engineering

The Azure OpenAI system prompt is designed to:

- Produce **structured JSON** with three categories (Key Points, Decisions, Action Items)
- **Merge with previous notes** — each summarization call receives the prior notes to avoid duplication
- **Anonymize** — never attribute statements to individuals
- **Filter noise** — ignore filler words, small talk, only capture meaningful discussion
- **Be concise** — each point is 1-2 sentences max

### Token Refresh

Azure AD tokens expire after ~60 minutes. The server refreshes the Speech SDK token every 8 minutes to avoid interruption during long meetings.

---

## File Structure

```
spike/
├── server.js              # Express server + WebSocket + Azure Speech SDK + OpenAI
├── public/
│   └── index.html         # Single-page UI (controls, dashboard, transcript bar)
├── .env                   # Azure resource configuration (not committed)
├── .gitignore
├── package.json
└── README.md
```

### server.js (186 lines)

| Section | Purpose |
|---|---|
| Azure OpenAI setup | `DefaultAzureCredential` + `AzureOpenAI` client with token provider |
| `POST /api/summarize` | Receives transcript chunk, calls GPT, returns structured notes |
| WebSocket handler | Manages Speech SDK lifecycle per client connection |
| Audio relay | Receives binary PCM from browser, pushes to Speech SDK `PushStream` |
| Token refresh | Refreshes Azure AD token every 8 minutes |

### public/index.html (242 lines)

| Section | Purpose |
|---|---|
| HTML/CSS | Dark theme UI with controls, 3-column dashboard, transcript bar |
| Audio capture | `getUserMedia` → `AudioContext` → `ScriptProcessorNode` → PCM conversion |
| WebSocket client | Connects to `/ws/speech`, sends audio, receives transcript/events |
| Summarization | Hybrid chunking (3s pause + 45s timer), calls `/api/summarize` |
| Dashboard | Live-updating categorized dot-points |
| Export | Downloads notes as markdown file |

---

## Azure Resources & RBAC Roles

| Resource | Role Required | Purpose |
|---|---|---|
| Azure AI Speech | **Cognitive Services User** | Speech-to-text + `issueToken` |
| Azure AI Speech | **Cognitive Services Speech User** | Speech recognition data actions |
| Azure OpenAI | **Cognitive Services OpenAI User** | Chat completion API access |

All roles are assigned to the user's Azure AD identity (from `az login`).

---

## Privacy Design

| Concern | How It's Handled |
|---|---|
| Audio recording | ❌ No audio is stored — streams through memory only |
| Speaker identification | ❌ Diarization disabled — transcript is anonymized |
| Transcript persistence | ❌ In-memory only — gone when browser tab closes |
| API key exposure | ❌ No API keys — Azure AD token auth throughout |
| Data export | ✅ Optional — user clicks "Export" to save notes locally |

---

## Current Limitations (Spike Scope)

- **Single session** — no persistent meeting history
- **One room, one browser** — not multi-device
- **ScriptProcessorNode** — deprecated browser API (AudioWorklet recommended for production)
- **No "missed topics" feature** — future enhancement requiring external data source
- **No authentication on the webapp** — anyone with localhost access can use it
- **Token expiry edge case** — if `az login` session expires, server needs restart
