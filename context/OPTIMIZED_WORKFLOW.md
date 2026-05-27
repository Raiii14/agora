# Hackathon Optimized Workflow

## Goal

Build a sales-focused AI copilot that is easy to demo, fast to ship, and aligned with Agora's voice-first strengths.

## Recommended MVP

- **Frontend:** Vercel-hosted Next.js website
- **Meeting surface:** Agora Voice Calling room
- **AI behavior:** listen continuously, analyze conversation, speak only when triggered
- **CRM:** demo CRM inside the website, backed by Couchbase
- **Output:** post-call report, lead score, action items, follow-up draft

## Simple Optimized Workflow

1. Staff logs in on the website.
2. Staff opens the CRM dashboard and creates or selects a lead.
3. Staff starts an Agora voice room from the app.
4. The AI joins the same Agora channel as a participant.
5. The AI listens to the conversation and updates live score signals.
6. If someone says a wake phrase like "Hey Agora" or clicks Ask AI, the agent replies with TTS.
7. When the call ends, the backend generates a final summary and recommendation.
8. The report is saved to Couchbase.
9. The CRM dashboard refreshes and shows the new report, score, and next steps.

## Why This Is the Right Shape

- Avoids fragile Zoom/Meet/Teams bot integration.
- Keeps the whole demo inside infrastructure the team controls.
- Matches the hackathon theme: real-time voice + sales workflow.
- Lets the CRM remain a demo product, not a full enterprise CRM.

## Split for the 3 Heavy Tasks

### 1. Meeting / Voice Room Layer

Own the Agora channel flow end to end.

Scope:
- create/join/leave room
- token generation
- AI participant join
- speech capture and transcript stream
- wake-phrase or Ask AI trigger
- TTS reply back into the room

Interface contract:
- emits transcript chunks
- emits speaker turns
- emits call start/end events

### 2. Post-Call Intelligence Layer

Own everything that happens after the meeting ends.

Scope:
- final transcript assembly
- summary generation
- action-item extraction
- lead scoring consolidation
- follow-up email draft
- CRM note payload

Interface contract:
- consumes transcript + call metadata
- writes one final report object to Couchbase

### 3. CRM Dashboard Layer

Own the website-facing sales view.

Scope:
- staff login
- lead list and lead detail pages
- live call status
- summary display
- score history
- next-step/task display

Interface contract:
- reads report objects from Couchbase or backend API
- never depends on live call internals

## Rules to Avoid Merge Conflicts

- Use one shared data schema for lead, transcript, and report objects.
- Keep the meeting layer focused on realtime events only.
- Keep the intelligence layer stateless except for final report generation.
- Keep the CRM layer UI-only with API reads, not business logic.
- Put shared types in one file so all three tracks use the same contract.

## What Not to Build

- No Zoom/Google Meet/Teams bot in MVP.
- No desktop app.
- No full Salesforce/HubSpot integration in MVP.
- No complex booking automation unless time remains.

