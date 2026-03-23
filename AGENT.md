# AGENT.md — BHP Hack Spike

## Purpose

This repository is a **hackathon spike** exploring whether Azure Speech Services (the same technology behind Microsoft Teams transcription) can power a live meeting note-taker webapp. An AI agent listens to meetings as a note-taking participant, transcribes the conversation in real-time, and produces structured summaries on a live dashboard.

## Agents in This Repository

### DT Coach (`.github/agents/dt-coach.prompt.md`)
Design Thinking facilitator that guided the problem discovery and solution design for this spike. Used to scope the project, research Azure capabilities, brainstorm architecture, and validate the concept before building.

### RPI (`.github/agents/rpi.prompt.md`)
Research, Plan, Implement, Review workflow agent. Used for structured implementation tasks after DT coaching establishes what to build.

## How the Spike Works

```
Browser mic → WebSocket → Node.js server → Azure Speech SDK → Transcript
                                         → Azure OpenAI    → Structured notes
                                         → WebSocket        → Live dashboard
```

### Key Components

| Component | Location | Purpose |
|---|---|---|
| Express + WebSocket server | `spike/server.js` | Hosts app, relays audio to Azure Speech SDK, calls Azure OpenAI |
| Single-page UI | `spike/public/index.html` | Meeting controls, live dashboard, transcript display |
| Implementation docs | `docs/` | Timestamped documentation of each spike implementation |
| DT coaching artifacts | `.copilot-tracking/dt/meeting-agent-spike/` | Design thinking session state and method outputs |

### Azure Services Used

- **Azure AI Speech** — Real-time speech-to-text (same engine as Microsoft Teams)
- **Azure OpenAI** — Transcript summarization into Key Points, Decisions, Action Items

### Auth Model

All authentication uses **Azure AD** via `DefaultAzureCredential` (from `@azure/identity`). No API keys — enterprise policy enforces `disableLocalAuth=true`.

## Running the Spike

```bash
# Prerequisites: Node.js 18+, az login authenticated
cd spike
npm install
npm start
# Open http://localhost:3000 in Chrome/Edge
```

## Key Technical Discovery

When `disableLocalAuth=true` on Azure Speech resources with a custom domain, the Speech SDK's WebSocket connection gets a 301 redirect that it can't follow. The workaround: connect directly to the **regional endpoint** (`eastus.stt.speech.microsoft.com`) with the `Ocp-Apim-Custom-Domain-Name` query parameter and a raw Azure AD bearer token. This is documented in detail in `docs/2026-03-23-azure-speech-sdk-transcription-spike-implementation.md`.

## Design Philosophy

This tool is designed to make meetings **more human**, not less:
- **No audio recording** — audio streams through memory only
- **No speaker identification** — transcript is anonymized
- **Note-taker, not recorder** — people should feel safe to speak freely
- **Minimal friction** — one click to start, everything else is automatic
