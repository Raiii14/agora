import { NextResponse } from 'next/server';
import {
  buildRtcToken,
  generateChannelName,
  generateUserUid,
  getAgoraConfig,
} from '@/lib/agora-server';

export async function POST() {
  try {
    const config = getAgoraConfig();
    const channel = generateChannelName();
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
