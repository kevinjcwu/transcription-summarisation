# DT Coaching State — Meeting Agent Spike

## Project Slug
meeting-agent-spike

## Current Method
COMPLETE — Spike built and verified. Phase 2 concepts captured.

## Session Log
- **Session 1**: Initial concept described — live meeting copilot webapp.
- **Session 2**: Deep scoping answers received. Core philosophy clarified: encourage honest communication, NOT surveillance. Key constraints and design principles emerging.
- **Session 3**: Method 1 completed. Spike scoped to "can we transcribe → summarize" using Azure. Missed topics feature is future state.
- **Session 4**: Methods 2-3 compressed. Technical research completed. Azure Speech SDK (JS, in-browser) + Azure OpenAI identified as core stack. Two architectural options mapped. Problem statement articulated. Ready for Solution Space.
- **Session 5**: Strategy flipped: try live dashboard (A) first, fall back to post-meeting (B). Method 4 brainstorming produced 24 ideas across 5 clusters. Converged on: hybrid chunking, thin backend (Azure Function), category-based dashboard, in-memory transcript, single-page UX.
- **Session 6**: Simplified to fully client-side (no backend, no Azure Functions). All local, no deployment. 
- **Session 7**: User confirmed — spike goal is specifically verifying live dashboard updates. Handoff artifact prepared for build.
- **Session 8**: Spike complete. Converted to TypeScript. Added diarization (ConversationTranscriber), timestamps, meeting timer, full-transcript re-summarize, export transcript. UI improved.
- **Session 9**: User shared full system context (see below). This spike = middle component only. Phase 2 concepts captured: proactive/reactive AI participant.

---

## Core Philosophy (from user)
> "The whole point of this project is to be transparent and honest with each other."
- AI is a **note-taking participant**, not a recorder
- No voice recording, no speaker identification — people must feel safe to speak freely
- Encourage active communication; AI handles the administrative burden (notes, action items)
- User sets meeting intent upfront → copilot suggests talking points → team discusses → copilot captures notes & may suggest missed topics

---

## Stakeholder Map

### Tier 1 — Decision Makers
- Hackathon team (building the spike)
- Team leads / facilitators who want structured meeting output

### Tier 2 — Direct Users
- Team members participating in meetings
- Meeting facilitator who clicks "Start meeting" and sets intent

### Tier 3 — Affected Parties
- Anyone whose meeting culture would change (less note-taking burden, more open discussion)
- Future teams who might adopt this if the spike succeeds

---

## Constraints

### 🔒 Frozen (Non-negotiable)
- **No voice recording** — no audio files stored, no speaker diarization/identification
- **Browser-based webapp** — hackathon deliverable runs in browser
- **Hackathon timeframe** — this is a spike/PoC, not production
- **Azure speech services** — want to leverage what Teams uses under the hood
- **Auto-start transcription** — "Start meeting" button triggers everything, minimal friction
- **Privacy-first** — no identifying who said what; anonymized stream of conversation

### 🔓 Fluid (Open for exploration)
- **Live dashboard vs post-meeting summary** — depends on technical feasibility (this IS the spike question)
- **Level of AI interaction during meeting** — passive notes only vs. active suggestions of missed topics
- **Meeting intent input UX** — how the user tells copilot what the meeting is about
- **Output format** — dotpoints, structured doc, action items, or combination

---

## Scope Statement

### ✅ In Scope
- Browser webapp with "Start meeting" button
- Live speech-to-text via Azure (browser mic → transcription stream)
- AI agent that processes transcription into notes/dotpoints/action items
- User provides meeting intent upfront; copilot uses it to guide note-taking
- Dashboard showing meeting output (live or post-meeting — spike determines which)
- Copilot may suggest missed topics based on stated intent

### ❌ Out of Scope
- Recording actual voice/audio of participants
- Speaker identification / diarization (who said what)
- Integration with Microsoft Teams directly (this is a standalone webapp)
- Production-grade security, auth, multi-tenancy
- Persistent meeting history / database (spike only)
- Connecting to external data sources (dotpoints/agenda items for "missed topics" feature)
- "Suggest missed topics" feature (future, depends on data source integration)

---

## Spike Strategy (updated Session 5)
> **Try Option A (live dashboard) first.** If too complex within hackathon, fall back to Option B (post-meeting summary) which is guaranteed.

## Success Criteria for the Spike
1. Can we get live speech-to-text working in a browser via Azure Speech Services?
2. Can an AI agent process that transcription stream into meaningful notes?
3. Can we update a dashboard in real-time as the meeting progresses? (Option A — PRIMARY)
4. If not real-time, can we do post-meeting summarization effectively? (Option B — FALLBACK)
5. Does the experience feel like a "participant taking notes" rather than "being recorded"?

---

## Method 1 Progress
- [x] Stakeholder map (3 tiers)
- [x] Frozen vs fluid constraints
- [x] Scope statement (in/out)
- [x] Success criteria
- [ ] Open questions for Method 2

## Open Questions (for Method 2 research)
- Which Azure Speech Services mode fits best? (Real-time streaming vs batch transcription?)
- How to process transcript chunks through an LLM for live summarization?
- What's the latency profile for live dashboard updates?
- Browser mic capture → Azure Speech pipeline: what SDK/API is needed?
- Can a single shared mic in a room produce usable transcription for multiple speakers?

## Clarifications from Session 3
- **"Suggesting missed topics"** is the FUTURE vision, NOT the spike. The spike is strictly: can we transcribe → summarize?
- Future workflow: supervisor prepares dotpoints → leads meeting → copilot checks coverage → surfaces missed items. Connecting to that data source is OUT of scope for spike.
- **Audio setup**: Multiple people in one room, one browser, one shared mic. Click "Start meeting" to begin.
- **Azure is mandatory** (team works for Microsoft) — but which specific services to use is an open question for the coach/research to determine.
- **Spike = "can we transcribe → summarize" using Azure capabilities**
