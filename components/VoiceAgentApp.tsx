'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import {
  EMessageEngineMode,
  IMessageListItem,
  MessageEngine,
} from '@/lib/message';

type SessionData = {
  appId: string;
  channel: string;
  uid: string;
  token: string;
  agentUid: string;
};

type AgentStartResponse = {
  agent_id?: string;
  agentId?: string;
  [key: string]: unknown;
};

type CallState =
  | 'idle'
  | 'creating-session'
  | 'joining'
  | 'starting-agent'
  | 'live'
  | 'stopping'
  | 'error';

const stateLabel: Record<CallState, string> = {
  idle: 'Ready',
  'creating-session': 'Creating session',
  joining: 'Joining channel',
  'starting-agent': 'Starting agent',
  live: 'Live',
  stopping: 'Stopping',
  error: 'Needs attention',
};

type StreamChunk = {
  partIdx: number;
  partSum: number;
  content: string;
};

function messageRole(message: IMessageListItem, session: SessionData | null) {
  const uid = message.uid.toString();

  if (session && uid === session.uid) return 'You';
  if (session && uid === session.agentUid) return 'AI';
  if (uid === '0') return 'AI';

  return `UID ${uid}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export default function VoiceAgentApp() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [session, setSession] = useState<SessionData | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [messages, setMessages] = useState<IMessageListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  const clientRef = useRef<any>(null);
  const micTrackRef = useRef<any>(null);
  const messageEngineRef = useRef<MessageEngine | null>(null);
  const streamChunkCacheRef = useRef<Record<string, StreamChunk[]>>({});
  const stoppingRef = useRef(false);

  const logEvent = useCallback((event: string) => {
    const stamp = new Date().toLocaleTimeString();
    setEvents((current) => [`${stamp} ${event}`, ...current].slice(0, 12));
    console.log(`[VoiceAgent] ${event}`);
  }, []);

  const cleanupLocalResources = useCallback(async () => {
    const client = clientRef.current;
    const micTrack = micTrackRef.current;

    try {
      if (messageEngineRef.current) {
        messageEngineRef.current.teardownInterval();
        messageEngineRef.current.cleanup();
        messageEngineRef.current = null;
      }
      streamChunkCacheRef.current = {};

      if (client && micTrack) {
        await client.unpublish([micTrack]).catch(() => undefined);
      }

      if (micTrack) {
        micTrack.close();
        micTrackRef.current = null;
      }

      if (client) {
        await client.leave().catch(() => undefined);
        client.removeAllListeners?.();
        clientRef.current = null;
      }
    } finally {
      setAgentConnected(false);
      setMicEnabled(true);
    }
  }, []);

  const inspectStreamPayload = useCallback((payload: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(payload);
      const [messageId, partIdx, partSum, content] = text.split('|');
      const parsedPartSum = partSum === '???' ? -1 : Number(partSum);

      if (!messageId || !partIdx || !content || parsedPartSum < 1) {
        return null;
      }

      const cache = streamChunkCacheRef.current;
      cache[messageId] = cache[messageId] ?? [];

      if (!cache[messageId].some((part) => part.partIdx === Number(partIdx))) {
        cache[messageId].push({
          partIdx: Number(partIdx),
          partSum: parsedPartSum,
          content,
        });
      }

      if (cache[messageId].length !== parsedPartSum) {
        return null;
      }

      const encoded = cache[messageId]
        .sort((a, b) => a.partIdx - b.partIdx)
        .map((part) => part.content)
        .join('');
      delete cache[messageId];

      return JSON.parse(window.atob(encoded)) as {
        object?: string;
        text?: string;
        stream_id?: number;
        turn_status?: number;
        quiet?: boolean;
      };
    } catch (error) {
      console.debug('[VoiceAgent] Failed to inspect stream payload', error);
      return null;
    }
  }, []);

  const stopConversation = useCallback(async () => {
    if (stoppingRef.current) return;

    stoppingRef.current = true;
    setCallState('stopping');
    setError(null);

    try {
      if (agentId) {
        await fetch('/api/agent/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });
      }
    } finally {
      await cleanupLocalResources();
      setAgentId(null);
      setSession(null);
      setMessages([]);
      setCallState('idle');
      stoppingRef.current = false;
      logEvent('Conversation stopped');
    }
  }, [agentId, cleanupLocalResources, logEvent]);

  const startConversation = useCallback(async () => {
    if (callState !== 'idle' && callState !== 'error') return;

    setError(null);
    setMessages([]);
    setEvents([]);
    setCallState('creating-session');

    try {
      const sessionResponse = await fetch('/api/session', { method: 'POST' });
      const nextSession = await readJson<SessionData>(sessionResponse);
      setSession(nextSession);
      logEvent(`Session ${nextSession.channel} created for UID ${nextSession.uid}`);

      setCallState('joining');

      const { default: AgoraRTC } = await import('agora-rtc-react');
      const client = (AgoraRTC as any).createClient({
        mode: 'rtc',
        codec: 'vp8',
      });
      clientRef.current = client;

      client.on('connection-state-change', (current: string, previous: string) => {
        logEvent(`RTC ${previous} -> ${current}`);
      });

      client.on('user-joined', (user: { uid: string | number }) => {
        logEvent(`Remote user joined: ${user.uid}`);
        if (user.uid.toString() === nextSession.agentUid) {
          setAgentConnected(true);
        }
      });

      client.on('user-left', (user: { uid: string | number }) => {
        logEvent(`Remote user left: ${user.uid}`);
        if (user.uid.toString() === nextSession.agentUid) {
          setAgentConnected(false);
        }
      });

      client.on('user-published', async (user: any, mediaType: string) => {
        logEvent(`Remote user ${user.uid} published ${mediaType}`);
        await client.subscribe(user, mediaType);

        if (mediaType === 'audio') {
          user.audioTrack?.play();
          setAgentConnected(user.uid.toString() === nextSession.agentUid);
          logEvent(`Playing remote audio from ${user.uid}`);
        }
      });

      client.on('stream-message', (uid: string | number, payload: Uint8Array) => {
        const decoded = inspectStreamPayload(payload);
        if (!decoded) return;

        console.debug('[VoiceAgent] Decoded stream message', decoded);

        if (decoded.object === 'assistant.transcription') {
          logEvent(
            decoded.text
              ? `Assistant transcript: ${decoded.text.slice(0, 80)}`
              : `Assistant transcript received, quiet=${String(decoded.quiet)}`
          );
        }
      });

      const joinedUid = await client.join(
        nextSession.appId,
        nextSession.channel,
        nextSession.token,
        Number(nextSession.uid)
      );
      logEvent(`Joined RTC as UID ${joinedUid}`);

      const micTrack = await (AgoraRTC as any).createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
      });
      micTrackRef.current = micTrack;
      await client.publish([micTrack]);
      logEvent('Microphone published');

      messageEngineRef.current = new MessageEngine(
        client,
        EMessageEngineMode.TEXT,
        (updatedMessages) => {
          setMessages([...updatedMessages].sort((a, b) => a.turn_id - b.turn_id));
        }
      );
      messageEngineRef.current.run({ legacyMode: false });

      setCallState('starting-agent');

      const agentResponse = await fetch('/api/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: nextSession.channel,
          userUid: nextSession.uid,
        }),
      });
      const agentData = await readJson<AgentStartResponse>(agentResponse);
      const nextAgentId =
        typeof agentData.agent_id === 'string'
          ? agentData.agent_id
          : typeof agentData.agentId === 'string'
            ? agentData.agentId
            : null;

      setAgentId(nextAgentId);
      setCallState('live');
      logEvent(`Agent started${nextAgentId ? `: ${nextAgentId}` : ''}`);
    } catch (startError) {
      console.error('Failed to start voice agent:', startError);
      await cleanupLocalResources();
      setError(
        startError instanceof Error
          ? startError.message
          : 'Failed to start voice agent'
      );
      setCallState('error');
    }
  }, [callState, cleanupLocalResources, inspectStreamPayload, logEvent]);

  const toggleMic = useCallback(async () => {
    if (!micTrackRef.current || callState !== 'live') return;

    const nextEnabled = !micEnabled;
    await micTrackRef.current.setEnabled(nextEnabled);
    setMicEnabled(nextEnabled);
    logEvent(nextEnabled ? 'Microphone unmuted' : 'Microphone muted');
  }, [callState, logEvent, micEnabled]);

  useEffect(() => {
    return () => {
      void cleanupLocalResources();
    };
  }, [cleanupLocalResources]);

  const isBusy =
    callState === 'creating-session' ||
    callState === 'joining' ||
    callState === 'starting-agent' ||
    callState === 'stopping';
  const isLive = callState === 'live';

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Agora Voice Agent
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Minimal RTC session, one agent, one microphone path.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLive ? 'bg-emerald-400' : isBusy ? 'bg-amber-300' : 'bg-zinc-500'
              }`}
            />
            <span className="text-sm text-zinc-300">{stateLabel[callState]}</span>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-[520px] flex-col rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
              <div>
                <div className="text-sm font-medium text-zinc-200">
                  {session ? session.channel : 'No active channel'}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  User UID {session?.uid ?? '-'} / Agent UID{' '}
                  {session?.agentUid ?? '-'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!isLive}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
                  title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                {isLive || isBusy ? (
                  <button
                    type="button"
                    onClick={stopConversation}
                    disabled={callState === 'stopping'}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <PhoneOff size={17} />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startConversation}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400"
                  >
                    <Phone size={17} />
                    Start
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
                  {isLive
                    ? 'Speak into your microphone. Transcripts will appear here.'
                    : 'Start a session to connect the browser and agent.'}
                </div>
              ) : (
                messages.map((message) => {
                  const role = messageRole(message, session);
                  const isAgent = role === 'AI';

                  return (
                    <div
                      key={`${message.uid}-${message.turn_id}`}
                      className={`max-w-[82%] rounded-lg px-4 py-3 text-sm ${
                        isAgent
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'ml-auto bg-emerald-500 text-zinc-950'
                      }`}
                    >
                      <div className="mb-1 text-xs font-semibold opacity-70">
                        {role}
                      </div>
                      <div>{message.text}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-sm font-semibold text-zinc-200">Status</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Agent audio</dt>
                  <dd className="text-zinc-200">
                    {agentConnected ? 'Connected' : 'Waiting'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Microphone</dt>
                  <dd className="text-zinc-200">
                    {isLive ? (micEnabled ? 'Open' : 'Muted') : 'Idle'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Agent ID</dt>
                  <dd className="max-w-[190px] truncate text-zinc-200">
                    {agentId ?? '-'}
                  </dd>
                </div>
              </dl>
              {error && (
                <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-sm font-semibold text-zinc-200">Events</h2>
              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                {events.length === 0 ? (
                  <p>No events yet.</p>
                ) : (
                  events.map((event, index) => <p key={`${event}-${index}`}>{event}</p>)
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
