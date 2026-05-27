# DECISIONS.md

Record public-safe decisions that affect future work.

The reason behind a decision is as important as the decision itself. Use this file to help teammates and AI tools avoid reopening settled debates without context.

Do not log brainstorming, temporary ideas, routine edits, credentials, private personal details, internal strategy, or observations that do not change future work.

Do not edit accepted entries. If a decision changes, write a new entry and mark the old one as superseded.

## Entry Template

```md
### YYYY-MM-DD - Short Decision Title

Decision:

Why:

Alternatives considered:

Consequences:
- Positive:
- Negative:
- Risks:

Supersedes: <!-- YYYY-MM-DD [title] or N/A -->

Status: <!-- active | superseded by YYYY-MM-DD [title] | deprecated -->

References:
```

## Decisions

### 2026-05-27 - Keep Minimal Next.js Voice Agent

Decision:

Use the current minimal Next.js app as the working hackathon prototype, and align its Agora agent payload with the official `agent-samples` contract instead of migrating wholesale to the sample repo.

Why:

The browser-to-agent-to-LLM text reply loop now works in this app. A full sample-repo migration would add a Python backend, RTM/toolkit dependencies, and more moving parts while the remaining issue is narrower: AI voice playback through TTS/audio.

Alternatives considered:

- Replace the app with Agora's official `agent-samples` React client and Python backend.
- Continue low-level browser debugging without first matching the official payload shape.

Consequences:
- Positive: Faster path to a demoable prototype; teammates can pull one focused Next.js app.
- Negative: The app still owns some transcript/audio handling instead of using the official client toolkit.
- Risks: If TTS/audio remains blocked, the team may still need to adopt the official sample client/toolkit or Agent Builder pipeline mode.

Supersedes: N/A

Status: active

References:
- `README.md`
- `context/PROJECT_HANDOFF.md`
