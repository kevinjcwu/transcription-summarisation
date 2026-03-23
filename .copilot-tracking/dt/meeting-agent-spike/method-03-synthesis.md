# Method 3: Input Synthesis — Meeting Agent Spike

## Themes from Research

### Theme 1: The Tech Stack is Viable
Azure Speech SDK (JS) runs directly in the browser, streams mic audio to Azure, and returns text — no audio stored, no speaker ID. This aligns perfectly with every frozen constraint. **Confidence: HIGH**

### Theme 2: Live vs Post-Meeting is a Complexity Tradeoff, Not a Feasibility Question
Both options are technically feasible. The difference is implementation complexity:
- **Post-meeting (Option B)**: 1 API call, no real-time plumbing. Buildable in hours.
- **Live dashboard (Option A)**: Needs chunking strategy, deduplication logic, and push mechanism. Buildable but significantly more complex.

**Confidence: HIGH**

### Theme 3: The Shared Mic is the Biggest Unknown
Everything else is well-understood Azure services. The wild card is: how well does Azure Speech handle a room full of people talking through one mic? This can only be answered by testing. **Confidence: MEDIUM**

---

## Problem Statement

> **A team needs a way to capture and summarize meeting discussions through a browser-based tool that feels like a note-taking participant — not a recorder — so that meetings produce structured output (dot-points, key decisions) without anyone having to manually take notes or feel surveilled.**

### Constraints Baked In
- No audio storage, no speaker identification
- Browser-only, Azure services, minimal friction ("Start meeting" → auto-transcribe)
- Spike-grade: prove feasibility, not production-readiness

### Core Spike Questions (ranked)
1. Does Azure Speech SDK produce usable transcription from a shared room mic?
2. Can Azure OpenAI turn that transcript into meaningful dot-point summaries?
3. Can we do this live (Option A), or only post-meeting (Option B)?

---

## Transition Readiness: Problem → Solution Space

| Dimension | Rating | Notes |
|---|---|---|
| Research fidelity | ✅ Strong | Azure service capabilities well-understood |
| Stakeholder completeness | ✅ Strong | Single team, clear use case |
| Pattern robustness | ✅ Strong | Two clear architectural patterns identified |
| Actionability | ✅ Strong | Can start building immediately |
| Team alignment | ✅ Strong | Spike scope is tight and agreed |

**→ Ready to cross into Solution Space (Method 4+)**
