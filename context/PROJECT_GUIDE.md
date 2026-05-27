# PROJECT_GUIDE.md

Stable project context for teammates and AI tools.

Keep this file short. If a rule becomes obsolete, update or remove it instead of adding a competing rule.

## Project Snapshot

- Project: Agora Hackathon Philippines 2026 AI Sales Agent
- Users:
- Goal: Build the next generation of AI-powered sales solutions using real-time Voice AI.
- Current stage: Working prototype; text replies work, AI voice playback still needs TTS/audio debugging
- Primary repository/app: Next.js app in this repository
- Non-goals:

## Tech Stack

- Language(s): TypeScript
- Frontend: Next.js App Router, React, Tailwind, Agora RTC client
- Backend: Next.js API routes for session creation and Agora agent start/stop
- Database: Demo CRM storage is planned around Couchbase; the current repo still centers on the voice loop
- Infrastructure: Agora RTC and Agora Conversational AI Agent REST API
- Key dependencies: `agora-rtc-react`, `agora-token`, LLM provider, TTS provider

## Current Working Pipeline

Plain-English flow:

1. User clicks Start in the browser.
2. Browser calls `/api/session`.
3. Backend creates the Agora channel, browser UID, and browser RTC token.
4. Browser joins Agora and publishes microphone audio.
5. Browser calls `/api/agent/start`.
6. Backend starts one Agora Conversational AI agent in that same channel.
7. Agora transcribes the user's speech.
8. The transcript goes to the configured LLM provider.
9. The LLM reply returns as text.
10. Agora sends user and AI transcript messages back to the browser.
11. Agora should synthesize the AI reply through TTS and publish audio back to the browser.
12. `/api/agent/stop` stops the agent and cleans up the session.

Known boundary: steps 1-10 are working. Step 11, AI voice playback, is the next
debugging target.

## Optimized Hackathon Workflow

The current product direction is:

1. Vercel-hosted Next.js website with staff login and demo CRM dashboard.
2. Agora Voice Calling room as the meeting surface.
3. AI participant joins the same Agora channel, listens, scores, and only
   speaks when triggered by a wake phrase or Ask AI action.
4. Post-call intelligence writes a report object to Couchbase.
5. CRM dashboard reads the stored report and surfaces the updated lead record.

Keep the meeting layer, intelligence layer, and CRM UI separate so teammates
can work in parallel without stepping on each other.

## Commit Format

- Convention: Conventional-style commits such as `feat: ...`, `fix: ...`, `chore: ...`

## Source Order

Use this order when project files conflict:

1. `context/eventguidelines.md` & `context/judges.md` - absolute source of truth for hackathon rules and constraints
2. `context/PROJECT_GUIDE.md` - stable project context and collaboration rules
3. `context/DECISIONS.md` - major decisions and rationale
4. `context/PROJECT_HANDOFF.md` - latest working state and next focus
5. `context/HACKATHON_OPTIMIZED_WORKFLOW.md` - demo workflow and task split for the hackathon
6. `context/UI.md` - current visual design system (tokens, type, spacing, rules)
7. `context/TEAM_INTERNAL.md` - private team workflow and repository safety rules
8. `README.md` - public-facing orientation
9. Other project documentation

If two files conflict, trust the highest source and update the stale lower-priority file.

## Start Here / End Here Protocol

Use this protocol for substantial AI or teammate work. For tiny, self-contained tasks, read only the files needed for the task.

### Start Here

1. Read `context/PROJECT_GUIDE.md` for source order, boundaries, and collaboration rules.
2. Read `context/DECISIONS.md` for durable decisions that should not be reopened casually.
3. Read `context/PROJECT_HANDOFF.md` for current state, risks, and next focus.
4. Read `context/HACKATHON_OPTIMIZED_WORKFLOW.md` when the task involves the hackathon demo workflow or task split.
5. Read `context/UI.md` when the task involves any frontend or visual work.
6. Read `context/TEAM_INTERNAL.md` only when the task involves private workflow, public release safety, fork/upstream workflow, deployment coordination, or private context syncing.
7. Inspect the relevant code/docs before acting. Resolve low-risk ambiguity through inspection when it is faster than asking.

Ask before acting when the remaining assumption affects architecture, data deletion, credentials, production behavior, billing, privacy, public/private exposure, broad refactors, dependencies, or user-visible behavior.

### End Here

Before ending a meaningful work session:

1. Run the lightest meaningful verification available, such as readback, targeted command, lint, test, or build.
2. Update the owning context file only when the change affects future work.
3. Move durable decisions into `context/DECISIONS.md`.
4. Replace `context/PROJECT_HANDOFF.md` with current continuity notes, risks, and next focus.
5. Update `context/UI.md` in place if visual tokens or rules changed — no log entry needed.
6. Remove or correct stale facts discovered in touched files.
7. Note verification gaps if checks could not be run.

Do not turn `PROJECT_HANDOFF.md` into a session diary or duplicate facts already owned by another file.

## AI Collaboration Rules

1. Inspect the relevant files before editing.
2. Resolve low-risk ambiguity by inspecting files; ask clarifying questions when scope, data flow, privacy, safety, or expected behavior remains risky or unclear.
3. State assumptions when acting without full certainty.
4. Surgical Debugging: Target the exact error line; do not perform broad refactors to fix single bugs.
5. Make the smallest useful change.
6. Do not invent project facts, APIs, dependencies, deadlines, or team decisions.
7. Do not overwrite teammate changes to make your own work easier.
8. Prefer existing project patterns over new abstractions.
9. Verify with the lightest meaningful check: readback, targeted command, lint, test, or build.
10. Update documentation only when the change affects future work.

## Context Ownership

- Product goal and user scope:
- Major decisions and rationale: `context/DECISIONS.md`
- Current work state and next focus: `context/PROJECT_HANDOFF.md`
- Visual design system (tokens, type, spacing, rules): `context/UI.md`
- Private team workflow and repository safety: `context/TEAM_INTERNAL.md`
- Public setup and usage instructions: `README.md`
- Private credentials, keys, and secrets: never commit; keep in local environment files or secret managers

## Boundaries

Allowed:

- Keep changes scoped to the voice-agent flow and public-safe documentation.

Avoid:

- Do not add debug endpoints that expose environment variable presence or values.
- Do not commit `.env.local`, live keys, private context, or local MCP tooling config.

Requires confirmation:

- Risky commands, destructive changes, broad refactors, dependency changes, public/private data exposure, or scope expansion

## Maintenance Rules

- Do not duplicate the same fact across multiple files unless one file clearly links to the owner. Use pointers.
- Do not let `PROJECT_HANDOFF.md` become a permanent history log.
- Move durable decisions into `DECISIONS.md`.
- Keep private team process in `TEAM_INTERNAL.md`.
- Remove stale references when files, features, commands, or workflows change.
- Keep AI instructions focused on the current project stage.
- When auditing or resuming the project, flag conflicts as stale-context issues instead of treating every context file as equally authoritative.
- If a fact appears in multiple files, keep the owning file and replace the duplicate with a pointer or remove it.
- If the handoff names a latest commit, deployment version, or current status, verify it before relying on it for important work.
