# BHP Hack Spike — Meeting AI Assistant

A hackathon spike exploring AI-powered meeting facilitation using Azure Speech Services and Azure OpenAI. The system acts as an **AI note-taking participant** in team meetings — transcribing conversations in real-time, identifying speakers anonymously, and producing structured summaries on a live dashboard.

## What This Proves

This spike answers the question: **Can we build a live meeting transcription and summarization tool using the same Azure Speech technology that powers Microsoft Teams?**

✅ **Yes.** The working prototype demonstrates:
- Real-time speech-to-text via Azure Speech SDK (`ConversationTranscriber`)
- Anonymous speaker diarization (Speaker 1, Speaker 2, etc.)
- Live-updating dashboard with Key Points, Decisions, and Action Items
- Full-transcript re-summarization on meeting end
- Timestamped transcript with speaker labels
- Export of both structured notes and raw transcript

## Quick Start

```bash
# Prerequisites: Node.js 18+, az login authenticated
cd spike
cp .env.example .env   # Fill in your Azure resource values
npm install
npm start
# Open http://localhost:3000 in Chrome/Edge
```

## System Architecture

This spike is the **Phase 2 (During Meeting)** component of a larger three-phase system:

| Phase | Component | Status |
|---|---|---|
| 1. Pre-Meeting | Briefing Agent — generates agenda, discussion points, safety scenarios | Not started |
| 2. During Meeting | **Transcriber & Summarizer** — live transcription + AI dashboard | **✅ Spike complete** |
| 3. Post-Meeting | Review Assistant — digitizes handwritten docs, validates completeness | Not started |

See [`docs/2026-03-23-system-overview.md`](docs/2026-03-23-system-overview.md) for the full system design.

## Repository Structure

```
bhp-hack-spike/
├── spike/                      # Working prototype
│   ├── src/
│   │   ├── server.ts           # Express + WebSocket + Azure Speech SDK + OpenAI
│   │   ├── config.ts           # Environment config with validation
│   │   └── prompts.ts          # LLM system prompts
│   ├── public/
│   │   ├── index.html          # Page structure
│   │   ├── styles.css          # UI styles (GitHub dark theme)
│   │   └── app.js              # Client-side meeting logic
│   ├── .env.example            # Template for Azure resource config
│   ├── tsconfig.json
│   └── package.json
├── docs/                        # Implementation documentation
│   ├── 2026-03-23-azure-speech-sdk-transcription-spike-implementation.md
│   └── 2026-03-23-system-overview.md
├── design-thinking/             # DT methodology guides (read-only reference)
├── rpi/                         # RPI workflow guides (read-only reference)
├── AGENT.md                     # Agent overview for Copilot
└── .github/
    ├── copilot-instructions.md  # Project context for Copilot
    └── agents/                  # Custom Copilot agents (DT Coach, RPI)
```

## Azure Resources Required

| Resource | Purpose | Auth |
|---|---|---|
| Azure AI Speech | Real-time speech-to-text + speaker diarization | Azure AD (`DefaultAzureCredential`) |
| Azure OpenAI | Transcript → structured meeting notes | Azure AD (`DefaultAzureCredential`) |

No API keys needed — all authentication uses Azure AD tokens.

## Key Technical Discovery

Enterprise Azure subscriptions often enforce `disableLocalAuth=true`, which blocks API key auth. The Azure Speech SDK cannot follow the 301 redirect from custom domain endpoints. The workaround:

```typescript
// Connect to regional endpoint with custom domain param
const endpoint = new URL(
  `wss://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
);
endpoint.searchParams.set("Ocp-Apim-Custom-Domain-Name", customDomainHostname);
speechConfig = sdk.SpeechConfig.fromEndpoint(endpoint);
speechConfig.authorizationToken = azureAdBearerToken;
```

Full details in [`docs/2026-03-23-azure-speech-sdk-transcription-spike-implementation.md`](docs/2026-03-23-azure-speech-sdk-transcription-spike-implementation.md).

## Design Principles

- **Privacy-first** — No audio recording, no named speaker identification
- **Support existing processes** — AI enhances pen-and-paper workflows, doesn't replace them
- **Encourage honest communication** — People must feel safe to speak freely
- **Minimal friction** — One click to start, everything else is automatic
- **AI as participant, not authority** — Suggestions, not instructions

## Documentation

| Document | Contents |
|---|---|
| [`docs/2026-03-23-azure-speech-sdk-transcription-spike-implementation.md`](docs/2026-03-23-azure-speech-sdk-transcription-spike-implementation.md) | Detailed implementation: architecture, auth patterns, diarization, known limitations |
| [`docs/2026-03-23-system-overview.md`](docs/2026-03-23-system-overview.md) | Full 3-phase system design, dependency map, future enhancements |
| [`spike/README.md`](spike/README.md) | Spike-specific setup and running instructions |
