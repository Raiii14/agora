# ARIA — Agora Revenue Intelligence Agent

> "Agora gives you voice. ARIA gives you intelligence."

---

## Project Overview

Agora built the voice pipe. Nobody built the sales brain on top of it.

**ARIA** fills three gaps that don't exist anywhere in Agora's current offering:

1. **Behavioral Trigger Engine** — instead of waiting for a prospect to click a button, monitor their browsing behavior (page depth, dwell time, return visits, pricing page hits) and have the AI proactively invite them to a voice conversation at peak intent.

2. **Live Intelligence Overlay** — while the call happens, a Streamlit dashboard shows the sales rep a real-time transcript, a lead score updating live, detected objections, and suggested rebuttals — all during the call.

3. **Persistent Prospect Memory** — Couchbase stores every past interaction. When a prospect calls back, the agent opens with full context:
   > *"Last time we spoke, you mentioned concerns about latency in Southeast Asia — has your team had a chance to test the SDRTN® demo?"*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Streamlit (Python) |
| Backend API | FastAPI (Python) |
| Database | Couchbase Capella |
| Voice Channel | Agora Conversational AI API |
| AI Models | OpenAI API (embeddings + chat completions) |
| Data Pipeline | Unstructured → JSON → vectorization |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│           Prospect Browser (JS snippet)                      │
│   Tracks: page depth · dwell time · return visits · pricing  │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────▼────────────┐     ┌──────────────────────┐
          │  Behavioral Trigger     │────▶│  Agora Conv. AI API  │
          │  Engine (FastAPI)       │     │  Real-time voice     │
          │  Scores intent, fires   │     │  channel             │
          │  invite at peak intent  │     └──────────┬───────────┘
          └────────────┬────────────┘                │
                       │                             │
          ┌────────────▼────────────┐     ┌──────────▼───────────┐
          │  FastAPI Call           │────▶│  Streamlit Dashboard  │
          │  Orchestrator           │     │  Live transcript      │
          │  Receives transcript    │     │  Lead score (live)    │
          │  Calls OpenAI for       │     │  Objections +         │
          │  objection/rebuttal     │     │  rebuttals            │
          └────────────┬────────────┘     └──────────────────────┘
                       │
          ┌────────────▼────────────────────────────────────────┐
          │         Unstructured Data → JSON Pipeline            │
          │  Transcript + metadata → chunk → embed (OpenAI)     │
          │  → vectorize · structured fields for lead scoring   │
          └──────────┬───────────────────────┬──────────────────┘
                     │                       │
          ┌──────────▼──────────┐  ┌─────────▼──────────────┐
          │  Couchbase Capella  │◀─▶│  OpenAI API            │
          │  Prospect profiles  │  │  text-embedding-3-small │
          │  Past call history  │  │  Chat completions for   │
          │  Vector index       │  │  rebuttals              │
          └──────────┬──────────┘  └────────────────────────┘
                     │
          ┌──────────▼──────────────────────────────────────────┐
          │       Persistent Prospect Memory — Context Retrieval │
          │  On new call: query Capella by prospect ID +         │
          │  vector similarity → inject prior context into       │
          │  Agora agent system prompt                           │
          └─────────────────────────────────────────────────────┘
                     │
                     └──────────────────────────▶ (loops back to Agora)
```

---

## Build Priority

### 1. Live Intelligence Overlay *(build first)*

The most demo-able piece — your "wow moment" for judges.

- Agora streams the transcript via **webhook** to FastAPI
- FastAPI calls **OpenAI** to detect objections and generate rebuttals
- Updates are pushed to **Streamlit** via shared state (Redis pub/sub or `st.session_state` with polling)

### 2. Persistent Prospect Memory

Every completed call gets processed and stored for future context retrieval.

- Call transcript is **chunked and embedded** using `text-embedding-3-small`
- Stored in **Couchbase Capella** with:
  - Structured fields: prospect ID, timestamps, key topics
  - Vector index for semantic similarity search
- On a new call, FastAPI queries Capella by **prospect ID + semantic similarity**
- Retrieved context is **injected into the Agora agent's system prompt** before the call starts

### 3. Behavioral Trigger Engine *(most architecturally novel)*

- A **JS snippet** on the prospect's page fires events to FastAPI
- The backend scores intent: `page_depth × dwell_time × return_visits`
- When score crosses a threshold, **Agora initiates an outbound voice invite**

---

## Data Pipeline Detail

```
Raw transcript (unstructured)
        │
        ▼
  OpenAI prompt: extract structured JSON
        │
        ▼
  {
    "prospect_id": "...",
    "speaker_turns": [...],
    "timestamps": [...],
    "detected_topics": [...],
    "objections": [...]
  }
        │
        ├──▶ Structured fields → Couchbase document store
        │
        └──▶ Full text → chunk → embed → Couchbase vector index
```

> The unstructured → JSON extraction can be done in a single OpenAI call: send the raw transcript, receive a structured JSON object. This keeps the pipeline lean.

---

## Implementation Notes

**Streamlit real-time updates**
The cleanest hackathon approach is to have FastAPI write to a Couchbase document (or Redis key) in real time during the call, and have Streamlit poll every 2–3 seconds. WebSockets are cleaner but add complexity.

**Single database**
Couchbase Capella handles both the **document store** (prospect profiles, call history) and **vector search** — one DB for the entire persistence layer.

**OpenAI model choices**
- Embeddings: `text-embedding-3-small` (fast, cheap, high quality)
- Rebuttals/objection detection: `gpt-4o` or `gpt-4o-mini` depending on latency budget

**Agora system prompt injection**
On every inbound call, the memory retrieval step runs first. The top-k similar past interactions are formatted into a context block and prepended to the Agora agent's system prompt before the session starts.

---

## The Pitch

> Agora gives you voice.  
> ARIA gives you intelligence.

Three things no one else has built on top of Agora:

| Gap | What ARIA does |
|---|---|
| No proactive outreach | Behavioral triggers invite prospects at peak intent |
| No in-call intelligence | Live overlay shows objections + rebuttals in real time |
| No memory | Every past interaction informs every future call |
