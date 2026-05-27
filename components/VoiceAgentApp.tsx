'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
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

type MeetingReport = {
  durationSeconds: number;
  endedAt: string;
  summary: string;
  actionItems: string[];
  transcript: string;
  messageCount: number;
};

type CallState =
  | 'idle'
  | 'creating-session'
  | 'joining'
  | 'starting-agent'
  | 'live'
  | 'stopping'
  | 'report'
  | 'error';

const stateLabel: Record<CallState, string> = {
  idle: 'Ready',
  'creating-session': 'Creating session',
  joining: 'Joining channel',
  'starting-agent': 'Starting agent',
  live: 'Live',
  stopping: 'Stopping',
  report: 'Report ready',
  error: 'Needs attention',
};

function messageRole(message: IMessageListItem, session: SessionData | null) {
  const uid = message.uid.toString();

  if (session && uid === session.uid) return 'You';
  if (session && uid === session.agentUid) return 'AI';
  if (uid === '0') return 'AI';

  return `UID ${uid}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds}s`;

  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

function buildMeetingReport(
  startTime: number,
  messages: IMessageListItem[],
  session: SessionData | null
): MeetingReport {
  const durationSeconds = startTime > 0 ? Math.round((Date.now() - startTime) / 1000) : 0;
  const transcript = messages
    .map((message) => `${messageRole(message, session)}: ${message.text}`)
    .join('\n');
  const userTurns = messages.filter((message) => messageRole(message, session) === 'You');
  const aiTurns = messages.filter((message) => messageRole(message, session) === 'AI');

  return {
    durationSeconds,
    endedAt: new Date().toLocaleString(),
    messageCount: messages.length,
    summary:
      messages.length > 0
        ? `Captured ${messages.length} transcript turn${
            messages.length === 1 ? '' : 's'
          } across ${formatDuration(durationSeconds)}. The conversation included ${
            userTurns.length
          } user turn${userTurns.length === 1 ? '' : 's'} and ${
            aiTurns.length
          } AI response${aiTurns.length === 1 ? '' : 's'}.`
        : `The meeting ended after ${formatDuration(
            durationSeconds
          )}, but no transcript messages were captured.`,
    actionItems:
      messages.length > 0
        ? [
            'Review the transcript for customer commitments and follow-up details.',
            'Add the meeting notes to the CRM record.',
            'Send a concise follow-up while the conversation is fresh.',
          ]
        : [
            'Confirm microphone, transcript, and agent settings before the next meeting.',
            'Add any manual notes from the conversation to the CRM record.',
          ],
    transcript: transcript || 'No transcript captured.',
  };
}

function requestedRoomFromUrl() {
  if (typeof window === 'undefined') return null;

  const room = new URLSearchParams(window.location.search).get('room')?.trim();
  return room || null;
}

function buildRoomLink(channel: string) {
  if (typeof window === 'undefined') return '';

  const url = new URL('/meeting', window.location.origin);
  url.searchParams.set('room', channel);
  return url.toString();
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
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [roomLink, setRoomLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const clientRef = useRef<any>(null);
  const micTrackRef = useRef<any>(null);
  const messageEngineRef = useRef<MessageEngine | null>(null);
  const stoppingRef = useRef(false);
  const startTimeRef = useRef(0);
  const messagesRef = useRef<IMessageListItem[]>([]);
  const sessionRef = useRef<SessionData | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const cleanupLocalResources = useCallback(async () => {
    const client = clientRef.current;
    const micTrack = micTrackRef.current;

    try {
      if (messageEngineRef.current) {
        messageEngineRef.current.teardownInterval();
        messageEngineRef.current.cleanup();
        messageEngineRef.current = null;
      }

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

  const copyRoomLink = useCallback(async () => {
    if (!roomLink) return;

    try {
      await navigator.clipboard.writeText(roomLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('Unable to copy the room link from this browser.');
    }
  }, [roomLink]);

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

      setReport(
        buildMeetingReport(startTimeRef.current, messagesRef.current, sessionRef.current)
      );
      setCallState('report');
    } catch (err) {
      console.error('Error stopping conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop conversation');
      setCallState('error');
    } finally {
      await cleanupLocalResources();
      setAgentId(null);
      setSession(null);
      setRoomLink('');
      stoppingRef.current = false;
    }
  }, [agentId, cleanupLocalResources]);

  const startConversation = useCallback(async () => {
    if (callState !== 'idle' && callState !== 'error' && callState !== 'report') {
      return;
    }

    setError(null);
    setReport(null);
    setMessages([]);
    setRoomLink('');
    startTimeRef.current = Date.now();
    setCallState('creating-session');

    try {
      const requestedRoom = requestedRoomFromUrl();
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestedRoom ? { channel: requestedRoom } : {}),
      });
      const nextSession = await readJson<SessionData>(sessionResponse);
      setSession(nextSession);
      setRoomLink(buildRoomLink(nextSession.channel));

      setCallState('joining');

      const { default: AgoraRTC } = await import('agora-rtc-react');
      const client = (AgoraRTC as any).createClient({
        mode: 'rtc',
        codec: 'vp8',
      });
      clientRef.current = client;

      client.on('user-joined', (user: { uid: string | number }) => {
        if (user.uid.toString() === nextSession.agentUid) {
          setAgentConnected(true);
        }
      });

      client.on('user-left', (user: { uid: string | number }) => {
        if (user.uid.toString() === nextSession.agentUid) {
          setAgentConnected(false);
        }
      });

      client.on('user-published', async (user: any, mediaType: string) => {
        await client.subscribe(user, mediaType);

        if (mediaType === 'audio') {
          user.audioTrack?.play();
          setAgentConnected(user.uid.toString() === nextSession.agentUid);
        }
      });

      await client.join(
        nextSession.appId,
        nextSession.channel,
        nextSession.token,
        Number(nextSession.uid)
      );

      const micTrack = await (AgoraRTC as any).createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
      });
      micTrackRef.current = micTrack;
      await client.publish([micTrack]);

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
  }, [callState, cleanupLocalResources]);

  const toggleMic = useCallback(async () => {
    if (!micTrackRef.current || callState !== 'live') return;

    const nextEnabled = !micEnabled;
    await micTrackRef.current.setEnabled(nextEnabled);
    setMicEnabled(nextEnabled);
  }, [callState, micEnabled]);

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
                  onClick={copyRoomLink}
                  disabled={!roomLink}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Copy room link"
                >
                  {linkCopied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                  {linkCopied ? 'Copied' : 'Share'}
                </button>
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
              {roomLink && (
                <p className="mt-4 truncate rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                  {roomLink}
                </p>
              )}
              {error && (
                <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            {report && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Meeting report
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-zinc-500">Duration</dt>
                    <dd className="mt-1 text-zinc-200">
                      {formatDuration(report.durationSeconds)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Transcript turns</dt>
                    <dd className="mt-1 text-zinc-200">{report.messageCount}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {report.summary}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Action items
                  </p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                    {report.actionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-200">
                    Transcript
                  </summary>
                  <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-400">
                    {report.transcript}
                  </pre>
                </details>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
