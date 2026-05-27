import { NextRequest, NextResponse } from 'next/server';
import {
  buildRtcToken,
  generateChannelName,
  generateUserUid,
  getAgoraConfig,
} from '@/lib/agora-server';

type SessionRequest = {
  channel?: string;
};

function normalizeRequestedChannel(channel: unknown) {
  if (typeof channel !== 'string') return null;

  const trimmed = channel.trim();
  if (!trimmed) return null;

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new Error('channel must be 1-64 characters and use letters, numbers, underscores, or hyphens');
  }

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SessionRequest;
    const config = getAgoraConfig();
    const channel = normalizeRequestedChannel(body.channel) ?? generateChannelName();
    const uid = generateUserUid();
    const token = buildRtcToken(channel, uid);

    return NextResponse.json({
      appId: config.appId,
      channel,
      uid: uid.toString(),
      token,
      agentUid: config.agentUid,
    });
  } catch (error) {
    console.error('Failed to create session:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
