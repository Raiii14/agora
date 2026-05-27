# PROJECT_HANDOFF.md

Use this at the end of a meaningful work session.

This file is for current continuity, not permanent history. Keep only what the next teammate or AI session needs to continue safely.

Before updating this file, check whether the new fact belongs in another owner:

- Durable decision: `context/DECISIONS.md`
- Stable project rule or source order: `context/PROJECT_GUIDE.md`
- Private team process or repository safety workflow: `context/TEAM_INTERNAL.md`
- Public setup, usage, or behavior: `README.md`
- Current state, risks, and next focus only: `context/PROJECT_HANDOFF.md`

## Current State

Working:

- Local `/api/session` returns a concrete positive numeric user UID for new conversations.
- Current minimal Next.js voice app now sends an Agora sample-compatible agent payload: RTC+RTM agent token, `agent_rtm_uid`, wildcard `remote_rtc_uids`, RTM enabled, transcript protocol v2 enabled, dump enabled, ASR vendor `ares`, LLM style `openai`, and semantic end-of-speech detection.
- Port 3000 dev server was restarted after a stale `.next` runtime error (`Cannot find module './79.js'`). Fresh HTTP and headless Chrome DevTools Protocol checks load `/` successfully.
- User reported the AI now sends text replies back, confirming the browser-to-Agora-to-LLM-to-transcript loop is working.
- Simple pipeline reference is documented in `README.md` and `context/PROJECT_GUIDE.md`.

In progress:

- Debugging AI voice playback. The remaining likely risks are TTS provider rejection/configuration or the remote audio publish/playback path.

Blocked:

- Chrome DevTools MCP is not exposed in the current Codex session. Direct Chrome DevTools Protocol checks are available as a fallback.

## Last Meaningful Changes

- Replaced the older token/invite/stop routes with `/api/session`, `/api/agent/start`, and `/api/agent/stop`; new conversations generate and require a positive non-zero user UID.
- Updated `lib/agora-server.ts` and `app/api/agent/start/route.ts` to align the start-agent payload with Agora's official agent-samples payload shape without adding new dependencies.
- Removed the `/api/test` debug route so certificate-related environment checks are not exposed.
- Added `.mcp.json` to `.gitignore` so local MCP tooling config is not accidentally staged.

## Risks or Stale Facts

- `.env.local` contains live-looking service keys and older `NEXT_PUBLIC_` prefixes for server-side secrets; do not expose or commit secrets.
- AI text replies work, but AI voice playback is not verified yet.

## Verification Gaps

<!-- What wasn't checked when this session ended. Next session: don't assume these are good. -->

- Live end-to-end AI voice playback was not verified.
- Browser console check via direct Chrome DevTools Protocol showed only the React DevTools info message on initial page load; no runtime exception reproduced after restarting the dev server.
- `pnpm build` and `pnpm exec tsc --noEmit --pretty false` passed after cleanup. HTTP smoke checks passed for `/` and `/api/session`; removed `/api/test` now returns 404.

## Next Focus

1. Inspect Agora agent response/dump logs and ElevenLabs account/provider errors for the missing voice audio.
2. Confirm whether the agent publishes a remote audio track and whether the browser receives `user-published` for audio.
3. If TTS/audio remains blocked, consider switching TTS provider or using Agora Agent Builder pipeline mode before migrating the full app to the official `agent-samples` client/toolkit.

## Closeout Checklist

- Add major durable decisions to `context/DECISIONS.md`.
- Update `context/PROJECT_GUIDE.md` if stable project rules changed.
- Update `README.md` if public setup, usage, or behavior changed.
- Remove or correct stale facts in touched files.
- Record only the next useful state here, not a full session diary.
- Verify with the lightest meaningful check and note any gaps.
