# ARIA — Agora Revenue Intelligence Agent

> "Agora gives you voice. ARIA gives you intelligence."

This document reflects the current hackathon direction in this repository:
**a Next.js/Vercel voice app with an Agora Voice Calling room, a demo CRM
dashboard, and a post-call intelligence layer backed by Couchbase**.

---

## Product Goal

ARIA is an internal sales copilot demo for the Agora hackathon. It should:

- join an Agora voice room as a participant
- listen to live sales conversations
- update lead scoring during the call
- speak when explicitly triggered
- generate a post-call report
- surface that report inside a CRM dashboard

The product is intentionally scoped to a demoable sales workflow, not a full
enterprise CRM or a desktop meeting bot.

---

## Current Repository Shape

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router + React |
| Deployment target | Vercel |
| Realtime voice | Agora Voice Calling / RTC |
| Agent control | Next.js API routes |
| LLM | Configured text model provider |
| TTS | Configured TTS provider |
| Persistence | Couchbase for CRM/report data |

---

## Optimized Workflow

1. Staff logs into the website.
2. Staff opens the demo CRM dashboard.
3. Staff starts an Agora voice room.
4. The AI joins the same Agora channel as a participant.
5. The AI listens and updates live lead signals.
6. When triggered by wake phrase or Ask AI, the AI responds with TTS.
7. After the call ends, the backend generates a final report.
8. The report is stored in Couchbase.
9. The CRM dashboard reads the report and shows updated lead intelligence.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js / Vercel Website                  │
│  Login · CRM dashboard · meeting controls · report view      │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                Next.js API Routes / Backend                  │
│  /api/session  /api/agent/start  /api/agent/stop             │
│  token creation · room setup · report write                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                 Agora Voice Calling Channel                   │
│  staff participant + AI participant + live transcript         │
└───────────────┬───────────────────────────┬──────────────────┘
                │                           │
                ▼                           ▼
      live transcript / score         wake phrase / Ask AI
                │                           │
                └──────────────┬────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                Post-Call Intelligence Layer                  │
│ summary · action items · lead score · follow-up draft        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                        Couchbase                              │
│   CRM lead record · call report · score history               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     CRM Dashboard UI                         │
│  reads report objects and shows the updated sales record     │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Boundaries

### 1. Meeting / Voice Room Layer

Own the Agora channel lifecycle.

Responsibilities:
- create and join rooms
- generate tokens
- attach the AI participant
- stream transcript chunks
- handle wake phrase or Ask AI trigger
- publish TTS audio back to the room

### 2. Post-Call Intelligence Layer

Own everything after the meeting ends.

Responsibilities:
- merge transcript chunks
- summarize the call
- extract action items
- generate a lead score
- draft follow-up text
- write the report object to Couchbase

### 3. CRM Dashboard Layer

Own the sales UI.

Responsibilities:
- staff login
- lead list and lead detail screens
- report display
- score history
- next-step visibility

This layer should read data from the backend or Couchbase and avoid business
logic that belongs in the intelligence layer.

---

## Data Shape

Example shared object/json file (needs to be referenced from couchbase official docs):

```json
{
  "type": "conversation",
  "conversationId": "call_123",
  "channel": "voice-agent-abc",
  "prospectId": "prospect_456",
  "startedAt": "2026-05-27T10:00:00Z",
  "endedAt": null,
  "status": "live",
  "messages": [
    { "role": "user", "text": "I need a demo", "ts": "..." },
    { "role": "assistant", "text": "Absolutely.", "ts": "..." }
  ],
  "summary": null,
  "leadScore": null
}
```

Use one shared schema for the meeting layer, post-call layer, and CRM UI so the
team can work in parallel without breaking contracts.

---

## Practical Constraints

- Do not use Zoom/Google Meet/Teams for the MVP.
- Do not build a desktop meeting bot.
- Do not make third-party CRM integration the core demo.
- Keep wake-word TTS as a triggered response, not continuous speaking.

---

## Pitch Positioning

ARIA should be described as:

**An AI sales copilot for Agora staff that listens in real time, scores leads
live, and turns every call into a CRM-ready report.**

