# Agora Voice Agent

Minimal Next.js client for an Agora Conversational AI voice loop.

Project context lives in `context/`. Treat `context/eventguidelines.md`,
`context/judges.md`, and `context/HACKATHON_OPTIMIZED_WORKFLOW.md` as the
current source of truth for hackathon scope and workflow.

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

## Optimized Hackathon Workflow

The team direction is to keep the prototype simple, demoable, and aligned with
Agora's voice-first strengths:

1. Staff logs in on the Vercel-hosted website.
2. Staff opens the demo CRM dashboard.
3. Staff starts an Agora voice room from the app.
4. The AI joins that Agora channel as a participant.
5. The AI listens continuously and updates live lead signals.
6. When someone says a wake phrase like "Hey Agora" or clicks Ask AI, the
   agent replies with TTS.
7. After the call ends, the backend generates a summary, action items, and a
   lead score.
8. The final report is stored in Couchbase.
9. The CRM dashboard reads that report and shows the updated sales record.

This repo should stay focused on the voice room, post-call intelligence, and
demo CRM handoff. External meeting bots and full third-party CRM integrations
remain out of scope for the hackathon MVP.

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

## Couchbase Capella Data API

For the CRM dashboard, the app uses the Capella Data API from Next.js API
routes. The browser never connects to Couchbase directly.

Put these values in Vercel Project Settings > Environment Variables, and copy
the same values into `.env.local` for local development:

```env
CAPELLA_DATA_API_BASE_URL=https://<cluster-id>.data.cloud.couchbase.com
CAPELLA_DATA_API_USERNAME=...
CAPELLA_DATA_API_PASSWORD=...
CAPELLA_BUCKET=agora
CAPELLA_SCOPE=crm
CAPELLA_COLLECTION=leads
```

The Vercel app reads those values in server routes only:

- `GET /api/capella-test` checks the connection with `/v1/callerIdentity`
- `GET /api/leads` loads dashboard cards
- `POST /api/leads` creates a lead document
- `PATCH /api/leads/[id]` updates a lead
- `DELETE /api/leads/[id]` removes a lead

If you want to move the same data into a different bucket or collection later,
change the env vars only. No code change is needed unless the schema changes.

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
