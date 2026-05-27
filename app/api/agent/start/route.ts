import { NextRequest, NextResponse } from 'next/server';
import {
  assertPositiveUid,
  basicAuthHeader,
  buildRtcAndRtmToken,
  getAgoraConfig,
  getLLMConfig,
  getTTSConfig,
} from '@/lib/agora-server';

type StartAgentRequest = {
  channel?: string;
  userUid?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartAgentRequest;
    const channel = body.channel?.trim();
    const userUid = body.userUid?.trim();

    if (!channel) {
      throw new Error('channel is required');
    }

    if (!userUid) {
      throw new Error('userUid is required');
    }

    assertPositiveUid(userUid);

    const agora = getAgoraConfig();
    const llm = getLLMConfig();
    const tts = getTTSConfig();
    const agentRtmUid = `${agora.agentUid}-${channel}`;
    const token = buildRtcAndRtmToken(channel, agora.agentUid, agentRtmUid);
    const agentName = `voice-agent-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const payload = {
      name: agentName,
      properties: {
        channel,
        token,
        agent_rtc_uid: agora.agentUid,
        agent_rtm_uid: agentRtmUid,
        remote_rtc_uids: ['*'],
        advanced_features: {
          enable_rtm: true,
        },
        enable_string_uid: false,
        idle_timeout: 120,
        llm: {
          url: llm.url,
          api_key: llm.api_key,
          style: 'openai',
          system_messages: [
            {
              role: 'system',
              content:
                'You are a concise voice sales assistant. Reply naturally in one or two short spoken sentences unless the user asks for detail.',
            },
          ],
          greeting_message: 'Hello. How can I help?',
          failure_message: 'Please give me a moment and try again.',
          max_history: 10,
          params: {
            model: llm.model,
            max_tokens: 512,
            temperature: 0.7,
          },
        },
        asr: {
          vendor: 'ares',
          language: 'en-US',
        },
        tts,
        parameters: {
          transcript: {
            enable: true,
            protocol_version: 'v2',
            enable_words: false,
          },
          enable_dump: true,
        },
        turn_detection: {
          config: {
            end_of_speech: {
              mode: 'semantic',
            },
          },
        },
      },
    };

    console.log('Starting Agora agent', {
      channel,
      agentUid: agora.agentUid,
      agentRtmUid,
      remoteRtcUids: ['*'],
      llmUrl: llm.url,
      llmModel: llm.model,
      ttsVendor: tts.vendor,
    });

    const response = await fetch(`${agora.baseUrl}/${agora.appId}/join`, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: unknown = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      console.error('Agora agent start failed:', {
        status: response.status,
        body: data,
      });
      return NextResponse.json(
        { error: 'Failed to start Agora agent', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to start agent:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to start agent',
      },
      { status: 500 }
    );
  }
}
