# Method 2: Technical Research — Meeting Agent Spike

## Research Focus
Which Azure services enable: Browser mic → live transcription → summarized notes dashboard?

---

## Finding 1: Azure Speech SDK for JavaScript (Browser)
**Confidence: HIGH**

Azure AI Speech Service provides a JavaScript SDK (`microsoft-cognitiveservices-speech-sdk`) that runs **directly in the browser**. This is the same underlying technology that powers Microsoft Teams transcription.

### Key Capabilities
- **Real-time continuous recognition**: Streams audio from browser mic to Azure, returns text via WebSocket
- **Two event types**:
  - `recognizing` — partial/interim results (words as they're being spoken)
  - `recognized` — final confirmed text segments
- **No audio stored** — Azure processes the stream and returns text; audio is not persisted (aligns with privacy constraint)
- **No speaker diarization required** — can be explicitly disabled (aligns with anonymity constraint)
- **Language support**: Handles multiple English accents, conversational speech
- **SDK install**: `npm install microsoft-cognitiveservices-speech-sdk`

### How It Works in Browser
```
navigator.mediaDevices.getUserMedia({ audio: true })
  → AudioConfig.fromDefaultMicrophoneInput()
  → SpeechRecognizer with continuous recognition
  → Events fire with transcript text
```

### Constraint: Shared Room Mic
- Single mic picking up multiple speakers in a room WILL work but quality depends on:
  - Mic quality (conference mic vs laptop mic)
  - Room acoustics (echo, background noise)
  - Distance from speakers to mic
- Azure Speech handles overlapping speech reasonably but not perfectly
- For a spike, this is acceptable. Production would want a conference mic.

---

## Finding 2: Azure OpenAI Service (Summarization)
**Confidence: HIGH**

Azure OpenAI (GPT-4o) can process transcript text and produce structured summaries, dot-points, and action items.

### Two Processing Modes

**Mode A — Chunked Live Summarization:**
- Accumulate transcript text in chunks (e.g., every 30-60 seconds or after detected pauses)
- Send each chunk to Azure OpenAI with context: "Here's the meeting transcript so far. Extract key points as dot-points."
- Append/merge new dot-points into the dashboard
- Challenge: Need to manage context window, avoid duplicate points, handle partial sentences at chunk boundaries
- Latency: ~1-3 seconds per API call for summarization

**Mode B — Full Post-Meeting Summarization:**
- Accumulate the entire transcript during the meeting
- On "Summarize" button click, send full transcript to Azure OpenAI
- Single API call produces comprehensive summary
- Much simpler to implement; no chunking/dedup logic needed
- GPT-4o handles ~128K tokens ≈ roughly 2-3 hours of meeting transcript

### Prompt Strategy
```
System: You are a meeting note-taker. Given a transcript, extract:
- Key discussion points (as dot-points)
- Decisions made
- Action items (if any)
Do NOT attribute statements to individuals. Summarize themes, not speakers.
```

---

## Finding 3: Real-Time Dashboard Updates
**Confidence: MEDIUM**

### Option A — Live Dashboard (WebSocket/SignalR)
For live updates, the architecture needs a push mechanism:

**Architecture:**
```
Browser Mic → Azure Speech SDK (in-browser, real-time)
  → Transcript chunks sent to backend (every 30-60s)
  → Backend calls Azure OpenAI for chunk summarization
  → Backend pushes updated dot-points to dashboard via WebSocket/SignalR
  → Dashboard re-renders with new points
```

**Azure services:**
- **Azure Web PubSub** or **Azure SignalR Service** for real-time push to dashboard
- OR simpler: just use a plain WebSocket from your backend (for a spike, no need for managed service)

**Challenges:**
- Chunking strategy: Too frequent = noisy/duplicate points. Too infrequent = stale dashboard.
- Deduplication: Same topic discussed over 2 chunks → need to merge, not duplicate
- Partial sentences at chunk boundaries → need overlap or buffering strategy
- More complex architecture (3 moving parts: speech, LLM, push)

### Option B — Post-Meeting Summary (Simple HTTP)
**Architecture:**
```
Browser Mic → Azure Speech SDK (in-browser, real-time)
  → Full transcript accumulated in browser/backend memory
  → User clicks "Summarize Meeting"
  → Single API call to Azure OpenAI with full transcript
  → Summary displayed on dashboard
```

**Much simpler**: No chunking, no dedup, no real-time push. Just accumulate and summarize.

---

## Finding 4: Simplified Architecture for Spike
**Confidence: HIGH**

For a hackathon spike, the simplest viable architecture:

### Minimum Components
1. **Frontend**: React/HTML page with "Start Meeting" button
2. **Azure Speech SDK**: Runs in-browser, captures mic, streams to Azure Speech
3. **Transcript accumulator**: JavaScript variable collecting recognized text
4. **Azure OpenAI**: Called for summarization (live chunks or post-meeting)
5. **Dashboard panel**: Displays dot-points (same page or split view)

### Azure Resources Needed
| Resource | Purpose | SKU for Spike |
|---|---|---|
| Azure AI Speech | Real-time speech-to-text | Free tier (5 hrs/month) or S0 |
| Azure OpenAI | Transcript summarization | GPT-4o deployment |
| (Optional) Azure Static Web Apps | Host the frontend | Free tier |
| (Optional) Azure Functions | Backend for OpenAI calls (to protect API key) | Consumption plan |

### Key Insight: Speech SDK Runs Client-Side
The Speech SDK operates entirely in the browser. Audio goes directly from browser → Azure Speech Service → text returned to browser. No backend needed for transcription. This simplifies the spike significantly.

**However**: The Speech API key would be exposed in the browser. For a spike this is acceptable. For production, you'd proxy through a backend that issues short-lived tokens.

---

## Finding 5: Feasibility Assessment
**Confidence: HIGH**

| Question | Assessment |
|---|---|
| Can we get live speech-to-text in browser via Azure? | ✅ YES — Speech SDK JS works in browser with mic |
| Can we avoid storing audio? | ✅ YES — streaming only, no audio persisted |
| Can we avoid speaker identification? | ✅ YES — just don't enable diarization |
| Can we do live dashboard updates? | ⚠️ FEASIBLE but complex — chunking, dedup, push |
| Can we do post-meeting summary? | ✅ YES — straightforward, single API call |
| Can shared room mic produce usable transcription? | ⚠️ DEPENDS on mic quality and room conditions |

### Spike Recommendation
**Start with Option B (post-meeting summary)** as the baseline, then attempt Option A (live dashboard) as a stretch goal. This way you have a working demo even if live updates prove too complex in the hackathon timeframe.

---

## Environmental Observations (for spike context)
- Hackathon setting: speed matters more than polish
- Team is Microsoft-internal: Azure resource provisioning should be fast
- Browser-based: no native app installation, lowers barrier
- Shared mic in room: transcription quality is a real variable to test early
