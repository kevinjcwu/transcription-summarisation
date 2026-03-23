# DT → Build Handoff: Meeting Agent Spike

## Exit Point
**Solution Space Exit (Methods 4-6)** — Concept validated, ready to build.

## Problem Statement
> A team needs a browser-based tool that captures and summarizes meeting discussions
> like a note-taking participant — producing live dot-points on a dashboard —
> without storing audio or identifying speakers.

## Spike Objective
Verify: **Can Azure Speech SDK + Azure OpenAI produce a live-updating dashboard of meeting notes from a shared room mic, all running in a browser?**

## Confidence Markers

### Validated ✅
- Azure Speech SDK (JS) runs in-browser with real-time mic capture
- Azure OpenAI can summarize transcript text into structured dot-points
- No audio is stored by Azure Speech streaming API
- Speaker diarization can be disabled (anonymity preserved)
- Post-meeting summary (Option B) is a guaranteed fallback

### Assumed ⚠️
- Hybrid chunking (pause + timer) will produce coherent summaries
- A shared room mic produces usable transcription quality
- GPT-4o latency (~1-3s) is acceptable for "live" dashboard feel
- Client-side architecture is sufficient (no backend needed for spike)

### Unknown ❓
- Optimal chunk size / timer interval for live summarization
- How to handle partial sentences at chunk boundaries
- Whether dot-point deduplication is needed or append-only is good enough
- Transcription accuracy with multiple overlapping speakers

## Architecture (spike-grade, fully client-side)

```
┌──────────────────────────────────────────────┐
│              BROWSER (localhost)              │
│                                              │
│  ┌─────────────┐    ┌────────────────────┐   │
│  │ Start Meeting│    │  Meeting Dashboard │   │
│  │    Button    │    │                    │   │
│  └──────┬──────┘    │  📌 Key Points     │   │
│         │           │  • point 1          │   │
│         ▼           │  • point 2          │   │
│  Azure Speech SDK   │                    │   │
│  (mic → text stream)│  ✅ Decisions       │   │
│         │           │  • (updating...)    │   │
│         ▼           │                    │   │
│  Transcript Buffer  │  📋 Action Items    │   │
│  (in-memory)        │  • (updating...)    │   │
│         │           │                    │   │
│    On pause/45s:    └────────────────────┘   │
│         │                    ▲                │
│         ▼                    │                │
│  Azure OpenAI SDK ───────────┘               │
│  (chunk → dot-points)                        │
│                                              │
└──────────────────────────────────────────────┘
```

## Tech Stack
- **Frontend**: HTML/JS (or React if preferred) — single page
- **Speech**: `microsoft-cognitiveservices-speech-sdk` (npm)
- **AI**: Azure OpenAI SDK — GPT-4o for summarization
- **Hosting**: localhost (no deployment)

## Azure Resources Required
| Resource | Purpose | Tier |
|---|---|---|
| Azure AI Speech | Real-time speech-to-text | Free (5h/mo) or S0 |
| Azure OpenAI | Transcript → dot-point summarization | GPT-4o deployment |

## UX Flow
1. User opens browser → sees "Start Meeting" button
2. Clicks "Start Meeting" → browser requests mic permission → transcription begins
3. Dashboard below populates with dot-points as meeting progresses
4. Categories: Key Points, Decisions, Action Items
5. Meeting ends → user clicks "End Meeting" → final summary generated
6. Optional: "Export" button to download summary

## Frozen Constraints
- No audio recording / storage
- No speaker identification
- Browser-only, runs locally
- Azure services only

## Fallback Plan
If live dashboard updates are unreliable:
- Remove chunking/timer logic
- Accumulate full transcript in memory
- Add "Summarize Meeting" button
- Same dashboard, populated once at end
- **Same codebase, just remove one feature**

## Stakeholder Map
- **Builders**: Hackathon team
- **Users**: Team members in meetings
- **Facilitator**: Person who clicks "Start Meeting"
