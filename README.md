# Agora Voice Agent

Minimal Next.js client for an Agora Conversational AI voice loop.

Project context lives in `context/`. Treat `context/eventguidelines.md` and
`context/judges.md` as the source of truth for hackathon constraints.

## Working Pipeline

The app currently uses one simple browser-to-agent loop:

1. You open the app and click **Start**.
2. The browser calls `POST /api/session`.
3. The backend creates an Agora channel, a browser user ID, and a browser token.
4. The browser joins that Agora channel and sends microphone audio.
5. The browser calls `POST /api/agent/start`.
6. The backend starts one Agora Conversational AI agent in the same channel.
7. Agora listens to the microphone audio and turns speech into text.
8. The text is sent to the configured LLM provider.
9. The LLM sends an AI text reply.
10. Agora sends the user and AI transcript messages back to the browser.
11. Agora should send the AI text reply to TTS, then publish voice audio back to the browser.
12. `POST /api/agent/stop` stops the agent and the browser leaves the channel.

Current working boundary: steps 1-10 work locally. Step 11, AI voice playback,
is still being debugged.

## Setup

Install dependencies:

```bash
pnpm install
```

Run the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Environment

Prefer server-only variable names for secrets. The app still accepts the older
`NEXT_PUBLIC_*` names as compatibility fallbacks, but do not use those for new
secrets.

Public client value:

```env
NEXT_PUBLIC_AGORA_APP_ID=...
```

Server-only Agora values:

```env
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...
AGORA_CUSTOMER_ID=...
AGORA_CUSTOMER_SECRET=...
AGORA_CONVO_AI_BASE_URL=https://api.agora.io/api/conversational-ai-agent/v2/projects
AGENT_UID=1000000001
```

Server-only LLM values:

```env
LLM_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

Server-only ElevenLabs values:

```env
TTS_VENDOR=elevenlabs
ELEVENLABS_BASE_URL=wss://api.elevenlabs.io/v1
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_SAMPLE_RATE=24000
```

Microsoft TTS is also supported by `lib/agora-server.ts` if
`TTS_VENDOR=microsoft` and the Microsoft key, region, and voice variables are
provided.

## API

- `POST /api/session`
- `POST /api/agent/start`
- `POST /api/agent/stop`

## Current Status

Verified locally:

- Browser joins the Agora channel.
- The agent receives speech and returns AI text replies.
- `/api/session` and `/api/agent/start` return successful responses.

Still in progress:

- AI voice playback is not working yet. The likely remaining issue is TTS
  provider rejection/configuration or the remote audio publish/playback path.
  Start by checking the Agora agent response/dump logs and ElevenLabs account
  permissions before changing the RTC flow again.
