import { NextRequest, NextResponse } from 'next/server';
import { basicAuthHeader, getAgoraConfig } from '@/lib/agora-server';

type StopAgentRequest = {
  agentId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StopAgentRequest;
    const agentId = body.agentId?.trim();

    if (!agentId) {
      return NextResponse.json({ ok: true, skipped: 'missing agentId' });
    }

    const agora = getAgoraConfig();
    const response = await fetch(
      `${agora.baseUrl}/${agora.appId}/agents/${agentId}/leave`,
      {
        method: 'POST',
        headers: {
          Authorization: basicAuthHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    const text = await response.text();
    let data: unknown = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      console.error('Agora agent stop failed:', {
        status: response.status,
        body: data,
      });
      return NextResponse.json(
        { error: 'Failed to stop Agora agent', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, details: data });
  } catch (error) {
    console.error('Failed to stop agent:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to stop agent',
      },
      { status: 500 }
    );
  }
}
