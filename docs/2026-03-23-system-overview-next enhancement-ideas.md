# System Overview — Meeting AI Assistant

## Vision

An AI-powered system that supports field teams through the full lifecycle of safety meetings: preparation, live facilitation, and post-meeting review. The AI acts as a **supportive participant** — not a surveillance tool — helping teams have better, more complete discussions.

> *"The whole point of this project is to be transparent and honest with each other."*

---

## Three-Phase Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: PRE-MEETING (Briefing Agent)                          │
│  Status: Not started                                            │
│                                                                  │
│  Supervisor asks agent to prepare meeting brief:                │
│  • Meeting agenda & suggested discussion points                 │
│  • Recent relevant incidents                                    │
│  • Relevant controls                                            │
│  • Monthly safety focus + tie-back suggestions                  │
│  • "What If" scenario from recent incident for discussion       │
│                                                                  │
│  Output: Prepared talking points for supervisor                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ Agenda / discussion points data
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: DURING MEETING (Transcriber & Summarizer)             │
│  Status: Core spike COMPLETE, enhancements blocked by Phase 1   │
│                                                                  │
│  Core (✅ complete):                                             │
│  • Azure Speech SDK live transcription with diarization         │
│  • Live dashboard (Key Points / Decisions / Action Items)       │
│  • Timestamped transcript with speaker labels                   │
│  • Full-transcript re-summarize on meeting end                  │
│  • Export notes + transcript                                    │
│                                                                  │
│  Enhancements (❓ needs Phase 1 + scoping):                     │
│  • Proactive: "You haven't discussed X yet"                    │
│  • Reactive: "Hey Copilot, what did we miss?"                  │
│  • Text-to-speech response: Unsure yet                          │
│                                                                  │
│  During meeting: Team also completes handwritten risk            │
│  assessment document (pen & paper — existing process)           │
│                                                                  │
│  Output: Meeting transcript + structured summary                │
└────────────────────┬────────────────────────────────────────────┘
                     │ Transcript + summary + handwritten document
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: POST-MEETING (Review Assistant)                       │
│  Status: Not started                                            │
│                                                                  │
│  • Digitize handwritten risk assessment (AI Vision /            │
│    Document Intelligence)                                       │
│  • Cross-reference with meeting transcript/summary              │
│  • Use Phase 1 sub-agents to validate completeness              │
│  • Provide suggestions for gaps or improvements                 │
│                                                                  │
│  Output: Reviewed + validated risk assessment                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dependency Map

```
Phase 1 (Briefing Agent)
  │
  ├──→ Phase 2 enhancements (proactive/reactive AI participant)
  │      Cannot suggest "missed topics" without knowing the agenda
  │
  └──→ Phase 3 (Review Assistant)
         Cannot validate completeness without knowing expected content

Phase 2 core (Transcriber & Summarizer) ←── INDEPENDENT, COMPLETE
  │
  └──→ Phase 3 (Review Assistant)
         Uses transcript + summary as input
```

---

## Phase 2 Enhancement Detail

### What depends on Phase 1

| Capability | Phase 1 needed? | Reason |
|---|---|---|
| Transcribe + summarize | ❌ No | Just listens and captures — **done** |
| "What did we discuss?" | ❌ No | Answers from transcript alone — **done** (dashboard) |
| "What did we miss?" | ✅ Yes | Needs agenda to compare against |
| Proactive suggestions | ✅ Yes | Needs agenda to know what's uncovered |
| "Is our risk assessment complete?" | ✅ Yes | Needs expected discussion points/controls |

### Design questions (unresolved)

- **Text-to-speech**: Should the AI speak out loud in the room, or only post to the dashboard? Team unsure — design decision for later.
- **Proactive vs reactive**: Should the AI volunteer suggestions during the meeting, or only respond when asked? Affects meeting dynamics.
- **UI for AI responses**: Inline in transcript? Separate "AI Suggestions" panel? Different from the summary dashboard?

---

## Technical Stack (proven in spike)

| Component | Technology | Auth |
|---|---|---|
| Speech-to-text | Azure AI Speech SDK (`ConversationTranscriber`) | Azure AD |
| Summarization | Azure OpenAI (GPT) | Azure AD |
| Server | Node.js / TypeScript (Express + WebSocket) | `DefaultAzureCredential` |
| Frontend | Vanilla HTML/CSS/JS (React rewrite planned) | N/A |
| Vision/OCR (Phase 3) | Azure Document Intelligence | TBD |

---

## Key Technical Discovery

Azure Speech SDK with `disableLocalAuth=true` (enterprise policy) requires connecting to the **regional endpoint** with an `Ocp-Apim-Custom-Domain-Name` query parameter, bypassing the custom domain's 301 redirect. Documented in detail in `docs/2026-03-23-azure-speech-sdk-transcription-spike-implementation.md`.

---

## Design Principles (all phases)

1. **Privacy-first** — No audio recording, anonymous speaker labels only
2. **Support existing processes** — AI enhances pen-and-paper workflows, doesn't replace them
3. **Encourage honest communication** — People must feel safe to speak freely
4. **Minimal friction** — One click to start, everything else is automatic
5. **AI as participant, not authority** — Suggestions, not instructions
