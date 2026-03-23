# Copilot Instructions — BHP Hack Spike

## Project Overview

This repository contains a **hackathon spike** for a live meeting note-taker webapp. The core concept: a browser-based tool where a team clicks "Start Meeting", and an AI-powered agent listens in as a note-taking participant — transcribing the conversation via Azure Speech SDK and summarizing it into structured dot-points on a live dashboard using Azure OpenAI.

## Repository Structure

```
bhp-hack-spike/
├── spike/                  # The working spike application
├── docs/                   # Implementation documentation
│   └── <timestamp>-<description>-implementation.md
├── design-thinking/        # DT methodology guides (read-only reference)
├── rpi/                    # RPI workflow guides (read-only reference)
└── .github/
    ├── copilot-instructions.md  # This file
    └── agents/                  # Custom Copilot agents
```

## Azure Services

| Service | Resource | Auth Method |
|---|---|---|
| Azure AI Speech | `bhp-spike-speech` (eastus) | Azure AD token via `DefaultAzureCredential` |
| Azure OpenAI | `woodside-exp-openai` | Azure AD token via `getBearerTokenProvider` |

### Critical Auth Pattern

This project operates in an enterprise environment where `disableLocalAuth=true` (API keys disabled by policy). The Speech SDK requires a specific connection pattern:

```javascript
// Connect to REGIONAL endpoint with custom domain param (bypasses 301 redirect)
const endpoint = new URL("wss://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1");
endpoint.searchParams.set("Ocp-Apim-Custom-Domain-Name", "bhp-spike-speech.cognitiveservices.azure.com");
speechConfig = sdk.SpeechConfig.fromEndpoint(endpoint);
speechConfig.authorizationToken = rawBearerToken; // NOT "aad#resource#token" format
```

## Design Principles

1. **Privacy-first**: No audio recording, no speaker identification, no persistent storage
2. **Minimal friction**: One-click "Start Meeting" — transcription begins automatically
3. **Note-taker, not recorder**: The AI acts as a participant taking notes, not a surveillance tool
4. **Transparency**: Team members should feel safe to speak freely

## Conventions

### Documentation
- Implementation docs go in `docs/` with naming: `<YYYY-MM-DD>-<description>-implementation.md`
- DT coaching artifacts go in `.copilot-tracking/dt/<project-slug>/`

### Environment
- All local development (no deployments)
- Requires `az login` for Azure AD authentication

## Current State

The spike successfully proves:
- ✅ Azure Speech SDK real-time transcription from browser mic
- ✅ Azure OpenAI summarization into categorized dot-points
- ✅ Live dashboard updates (Key Points, Decisions, Action Items)
- ✅ Full running transcript display
- ✅ Export meeting notes as markdown

## Future Considerations (Out of Current Spike Scope)

- "Missed topics" feature — comparing transcript against pre-meeting agenda
- External data source integration for meeting talking points
- Multi-device / distributed participant support
- Frontend rewrite (tech stack TBD)
- Production deployment and authentication
