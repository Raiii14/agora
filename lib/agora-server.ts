import { RtcRole, RtcTokenBuilder } from 'agora-token';

const TOKEN_TTL_SECONDS = 60 * 60;

export type TTSVendor = 'microsoft' | 'elevenlabs';

type TTSConfig =
  | {
      vendor: 'microsoft';
      params: {
        key: string;
        region: string;
        voice_name: string;
        rate?: number;
        volume?: number;
      };
    }
  | {
      vendor: 'elevenlabs';
      params: {
        base_url: string;
        key: string;
        voice_id: string;
        model_id: string;
        sample_rate: number;
      };
    };

function env(name: string, fallbackName?: string, defaultValue?: string) {
  const value =
    process.env[name] ||
    (fallbackName ? process.env[fallbackName] : undefined) ||
    defaultValue;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function maybeEnv(name: string, fallbackName?: string) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
}

export function getAgoraConfig() {
  return {
    appId: env('AGORA_APP_ID', 'NEXT_PUBLIC_AGORA_APP_ID'),
    appCertificate: env(
      'AGORA_APP_CERTIFICATE',
      'NEXT_PUBLIC_AGORA_APP_CERTIFICATE'
    ),
    customerId: env('AGORA_CUSTOMER_ID', 'NEXT_PUBLIC_AGORA_CUSTOMER_ID'),
    customerSecret: env(
      'AGORA_CUSTOMER_SECRET',
      'NEXT_PUBLIC_AGORA_CUSTOMER_SECRET'
    ),
    baseUrl: env(
      'AGORA_CONVO_AI_BASE_URL',
      'NEXT_PUBLIC_AGORA_CONVO_AI_BASE_URL',
      'https://api.agora.io/api/conversational-ai-agent/v2/projects'
    ).replace(/\/+$/, ''),
    agentUid: env('AGENT_UID', 'NEXT_PUBLIC_AGENT_UID', '1000000001'),
  };
}

export function getLLMConfig() {
  return {
    url: env('LLM_URL', 'NEXT_PUBLIC_LLM_URL'),
    api_key: env('LLM_API_KEY', 'NEXT_PUBLIC_LLM_API_KEY'),
    model: env('LLM_MODEL', 'NEXT_PUBLIC_LLM_MODEL', 'gpt-4o-mini'),
  };
}

export function getTTSConfig(): TTSConfig {
  const vendor = env(
    'TTS_VENDOR',
    'NEXT_PUBLIC_TTS_VENDOR',
    'elevenlabs'
  ) as TTSVendor;

  if (vendor === 'microsoft') {
    return {
      vendor,
      params: {
        key: env('MICROSOFT_TTS_KEY', 'NEXT_PUBLIC_MICROSOFT_TTS_KEY'),
        region: env(
          'MICROSOFT_TTS_REGION',
          'NEXT_PUBLIC_MICROSOFT_TTS_REGION'
        ),
        voice_name: env(
          'MICROSOFT_TTS_VOICE_NAME',
          'NEXT_PUBLIC_MICROSOFT_TTS_VOICE_NAME',
          'en-US-AndrewMultilingualNeural'
        ),
        rate: Number(maybeEnv('MICROSOFT_TTS_RATE', 'NEXT_PUBLIC_MICROSOFT_TTS_RATE') ?? 1),
        volume: Number(
          maybeEnv('MICROSOFT_TTS_VOLUME', 'NEXT_PUBLIC_MICROSOFT_TTS_VOLUME') ??
            100
        ),
      },
    };
  }

  if (vendor === 'elevenlabs') {
    return {
      vendor,
      params: {
        base_url: env(
          'ELEVENLABS_BASE_URL',
          'NEXT_PUBLIC_ELEVENLABS_BASE_URL',
          'wss://api.elevenlabs.io/v1'
        ),
        key: env('ELEVENLABS_API_KEY', 'NEXT_PUBLIC_ELEVENLABS_API_KEY'),
        voice_id: env('ELEVENLABS_VOICE_ID', 'NEXT_PUBLIC_ELEVENLABS_VOICE_ID'),
        model_id: env(
          'ELEVENLABS_MODEL_ID',
          'NEXT_PUBLIC_ELEVENLABS_MODEL_ID',
          'eleven_flash_v2_5'
        ),
        sample_rate: Number(
          maybeEnv('ELEVENLABS_SAMPLE_RATE', 'NEXT_PUBLIC_ELEVENLABS_SAMPLE_RATE') ??
            24000
        ),
      },
    };
  }

  throw new Error(`Unsupported TTS vendor: ${vendor}`);
}

export function generateChannelName() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `voice-agent-${timestamp}-${random}`;
}

export function generateUserUid() {
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}

export function assertPositiveUid(uid: string | number) {
  const parsed = typeof uid === 'number' ? uid : Number(uid);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('uid must be a positive integer');
  }

  return parsed;
}

export function buildRtcToken(channel: string, uid: string | number) {
  const config = getAgoraConfig();
  const numericUid = assertPositiveUid(uid);

  return RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channel,
    numericUid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS
  );
}

export function buildRtcAndRtmToken(
  channel: string,
  rtcUid: string | number,
  rtmUid: string
) {
  const config = getAgoraConfig();
  const numericUid = assertPositiveUid(rtcUid);

  return RtcTokenBuilder.buildTokenWithRtm2(
    config.appId,
    config.appCertificate,
    channel,
    numericUid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
    rtmUid,
    TOKEN_TTL_SECONDS
  );
}

export function basicAuthHeader() {
  const config = getAgoraConfig();
  const credentials = Buffer.from(
    `${config.customerId}:${config.customerSecret}`
  ).toString('base64');

  return `Basic ${credentials}`;
}
