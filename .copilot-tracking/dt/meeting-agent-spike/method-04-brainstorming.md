# Method 4: Brainstorming — Live Dashboard Architecture

## Problem Statement
> A team needs a browser-based tool that captures and summarizes meeting discussions
> like a note-taking participant — producing live dot-points on a dashboard —
> without storing audio or identifying speakers.

## Strategy
> Try Option A (live dashboard) first → fall back to Option B (post-meeting summary) if needed.

---

## Divergent Ideas: How Could the Live Dashboard Work?

### Cluster 1: Chunking Strategies (how often to summarize)
1. **Time-based chunks** — Every 30-60 seconds, send accumulated text to Azure OpenAI
2. **Silence-based chunks** — Detect pauses in speech (2-3 second gaps) as natural breakpoints
3. **Sentence-count chunks** — Every 5-10 recognized sentences, trigger a summarization
4. **Hybrid chunks** — Combine silence detection + minimum time threshold (whichever comes first)
5. **Rolling window** — Always send the last 2 minutes of transcript, letting the LLM re-summarize with context

### Cluster 2: Dashboard Update Patterns (how to display)
6. **Append-only dot-points** — New points added to the bottom, never modified
7. **Smart-merge dot-points** — LLM groups related points, merges duplicates on each update
8. **Category-based sections** — Dashboard auto-organizes into "Decisions", "Discussion Points", "Action Items"
9. **Timeline view** — Dot-points with rough timestamps showing meeting flow
10. **Running transcript + sidebar summary** — Left panel shows raw transcript scrolling, right panel shows curated dot-points

### Cluster 3: Architecture Patterns (how to wire it up)
11. **Full client-side** — Speech SDK + OpenAI calls all from the browser (simplest, exposes API key)
12. **Thin backend** — Browser does speech, sends chunks to a small API that calls OpenAI and returns summaries
13. **WebSocket backend** — Backend maintains state, pushes updates to all connected dashboard viewers
14. **Azure Functions** — Serverless backend: HTTP trigger receives chunks, calls OpenAI, returns points
15. **Server-Sent Events (SSE)** — Simpler than WebSocket for one-way push (server → dashboard)

### Cluster 4: Transcript Management
16. **In-memory only** — Transcript lives in browser/server memory, gone when meeting ends
17. **Session storage** — Browser sessionStorage for transcript, cleared on tab close
18. **Ephemeral backend store** — Server holds transcript during meeting, auto-deletes after summary
19. **Export-on-demand** — No persistence, but user can click "Export" to download the summary as a file

### Cluster 5: UX Flow
20. **Single-page app** — One page: "Start Meeting" → live transcript + dashboard side-by-side
21. **Split screen** — Meeting controls on left, live dot-points on right
22. **Minimal view** — Just the dot-points dashboard, no transcript shown (cleaner, less intimidating)
23. **Facilitator vs participant views** — Facilitator sees controls + dashboard; participants see read-only dashboard
24. **Projector mode** — Dashboard designed to be shown on a room screen/TV during the meeting

---

## Convergence: Recommended Directions for Spike

### 🏗️ Architecture: Thin Backend (Idea #12 + #14)
**Why**: Browser handles Speech SDK (client-side). A small Azure Function or Express API receives transcript chunks and calls Azure OpenAI. Returns dot-points. Keeps API keys secure without overengineering.

### ⏱️ Chunking: Hybrid (Idea #4)
**Why**: Pure time-based misses natural conversation breaks. Pure silence-based may fire too often. Hybrid = "summarize on 3-second pause OR every 45 seconds, whichever comes first" gives the best balance.

### 📊 Dashboard: Category-based append (Ideas #6 + #8)
**Why**: For a spike, append-only is simplest. Adding basic categories (Key Points / Decisions / Action Items) gives structure without needing smart-merge logic. Can upgrade to smart-merge later.

### 💾 Transcript: In-memory + export (Ideas #16 + #19)
**Why**: No persistence by default (privacy). But let users export the final summary if they want to keep it.

### 🖥️ UX: Single-page minimal (Ideas #20 + #22)
**Why**: One page. "Start Meeting" button at top. Live dot-points below, updating as the meeting goes. No raw transcript shown (less intimidating, aligns with "participant not recorder" philosophy). Optional projector-friendly styling.

---

## Proposed Architecture (spike-grade)

```
┌─────────────────────────────────────────────────┐
│                    BROWSER                       │
│                                                  │
│  [Start Meeting]  ──→  Azure Speech SDK (JS)     │
│                        │                         │
│                        ▼                         │
│               Transcript Buffer                  │
│          (accumulates recognized text)           │
│                        │                         │
│            On pause or 45s timer:                │
│                        │                         │
│                        ▼                         │
│              POST /summarize                     │
│              { chunk, context }                  │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │         LIVE DASHBOARD                      │ │
│  │                                             │ │
│  │  📌 Key Points                              │ │
│  │  • Point from chunk 1                       │ │
│  │  • Point from chunk 2                       │ │
│  │                                             │ │
│  │  ✅ Decisions                                │ │
│  │  • (none yet)                               │ │
│  │                                             │ │
│  │  📋 Action Items                            │ │
│  │  • (none yet)                               │ │
│  └─────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              BACKEND (Azure Function)            │
│                                                  │
│  POST /summarize                                 │
│    → Receives transcript chunk + running context │
│    → Calls Azure OpenAI GPT-4o                   │
│    → Returns { keyPoints[], decisions[],         │
│                actionItems[] }                   │
│    → Optionally: sends running summary context   │
│      back so next chunk has continuity           │
└─────────────────────────────────────────────────┘
```

## Fallback Path (Option B)
If live chunking proves unreliable:
- Remove chunking logic and timer
- Accumulate full transcript in browser memory
- Add "Summarize Meeting" button
- Single POST to backend with full transcript
- Same dashboard layout, just populated once at the end

**The architecture is identical** — just remove the chunking loop. This is why trying Option A first makes sense: the fallback is just removing a feature, not rebuilding.
