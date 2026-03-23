# Meeting Note-Taker — Spike

Live meeting transcription + AI-powered summarization dashboard, using the same Azure Speech Services that power Microsoft Teams transcription.

## Architecture

```
Browser (localhost:3000)
│
├── Mic → AudioContext (16kHz PCM) → WebSocket ──→ Node.js Server
│                                                    │
│                                                    ├── Azure Speech SDK
│                                                    │   (real-time speech-to-text)
│                                                    │
│   ◄── WebSocket (transcript text) ─────────────────┘
│
├── Transcript buffer (in-memory)
│   └── On 3s pause or 45s timer:
│       POST /api/summarize ──→ Azure OpenAI (GPT)
│                                │
│   ◄── { keyPoints, decisions,  │
│         actionItems }  ────────┘
│
└── Dashboard (live-updating dot-points)
```

## How It Works

1. **Click "Start Meeting"** — browser requests mic, opens WebSocket to server
2. **Browser captures audio** — resamples to 16kHz mono PCM, streams to server via WebSocket
3. **Server runs Azure Speech SDK** — pushes audio into SDK's PushStream, receives transcript events
4. **Transcript sent back to browser** — interim ("recognizing") and final ("recognized") text
5. **Auto-summarization** — after a 3-second speech pause (or every 45s), the accumulated transcript chunk is sent to Azure OpenAI
6. **Dashboard updates live** — Key Points, Decisions, and Action Items populate as the meeting progresses
7. **Click "End Meeting"** — final summarization, option to export as markdown

## Key Design Decisions

- **No audio recording** — audio streams through memory only, never stored
- **No speaker identification** — transcript is anonymized, no diarization
- **Azure Speech SDK (server-side)** — same engine as Microsoft Teams transcription
- **Azure AD auth (DefaultAzureCredential)** — no API keys needed, works with `disableLocalAuth=true`
- **Hybrid chunking** — summarize on 3s pause OR every 45s, whichever comes first

## Azure Resources Required

| Resource | Purpose | Auth |
|---|---|---|
| Azure AI Speech | Real-time speech-to-text | Azure AD (Cognitive Services User role) |
| Azure OpenAI | Transcript → structured notes | Azure AD (Cognitive Services OpenAI User role) |

## How It Works

1. **Browser captures mic** → resamples to 16kHz PCM → streams via WebSocket to server
2. **Server runs Azure Speech SDK** → pushes audio into SDK, receives transcript events
3. **Transcript sent to browser** → live transcript bar updates in real-time
4. **Auto-summarization** → after 3s pause or 45s timer, chunk sent to Azure OpenAI
5. **Dashboard updates** → Key Points, Decisions, Action Items populated live

## Setup

1. **Prerequisites**: Node.js 18+, `az login` authenticated
2. **Copy `.env.example` to `.env`** and fill in your Azure resource values
3. **Install & run**:
   ```bash
   npm install
   npm start
   ```
4. **Open** `http://localhost:3000` in Chrome/Edge

## Project Structure

```
spike/
├── src/
│   ├── server.ts          # Express + WebSocket + Azure Speech SDK + OpenAI
│   ├── config.ts           # Env config with validation
│   └── prompts.ts          # LLM system prompts
├── public/
│   ├── index.html          # Page structure
│   ├── styles.css          # UI styles
│   └── app.js              # Client-side meeting logic
├── .env.example
├── tsconfig.json
└── package.json
```

## Auth Note

When `disableLocalAuth=true` (common in enterprise Azure), the Speech SDK requires:
- A **custom domain** on the Speech resource
- Connecting to the **regional endpoint** (`eastus.stt.speech.microsoft.com`) with `Ocp-Apim-Custom-Domain-Name` parameter
- Raw Azure AD bearer token (not the `aad#resource#token` format)
