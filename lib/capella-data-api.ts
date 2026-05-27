type CapellaConfig = {
  baseUrl: string;
  username: string;
  password: string;
  bucket: string;
  scope: string;
  collection: string;
};

export type LeadStage = "new" | "outreach" | "in-call" | "closed";
export type LeadUrgency = "high" | "medium" | "low";

export type RawLeadDocument = {
  id: string;
  type: "lead";
  leadId?: string;
  company: string;
  contactName?: string;
  name?: string;
  stage: LeadStage;
  dealValue: number;
  fitScore?: number;
  priority?: LeadUrgency;
  owner?: string;
  lastTouchAt?: string;
  notes?: string;
  summary?: string;
  starred?: boolean;
  progress?: number;
  aiHint?: string;
  scoreNotes?: string[];
  tasks: Array<{ label: string; done: boolean }>;
  followUp?: string;
  updatedAt: string;
};

export type LeadCardData = {
  id: string;
  name: string;
  company: string;
  stage: LeadStage;
  dealValue: number;
  score: number;
  urgency: LeadUrgency;
  starred: boolean;
  progress: number;
  summary: string;
  aiHint: string;
  scoreNotes: string[];
  tasks: Array<{ label: string; done: boolean }>;
  followUp: string;
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

function ensureConfiguredValue(name: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  if (trimmed === "..." || /<[^>]+>/.test(trimmed)) {
    throw new Error(
      `Environment variable ${name} still looks like a placeholder. Set it to the real Couchbase Capella value before starting the dashboard.`
    );
  }

  return trimmed;
}

function normalizeBaseUrl(value: string) {
  const baseUrl = ensureConfiguredValue("CAPELLA_DATA_API_BASE_URL", value).replace(/\/+$/, "");

  try {
    const parsedUrl = new URL(baseUrl);

    if (!parsedUrl.hostname || parsedUrl.hostname.includes("<")) {
      throw new Error("placeholder hostname");
    }
  } catch {
    throw new Error(
      "CAPELLA_DATA_API_BASE_URL must be the full Capella Data API endpoint, for example https://<cluster-id>.data.cloud.couchbase.com"
    );
  }

  return baseUrl;
}

export function getCapellaConfig(): CapellaConfig {
  return {
    baseUrl: normalizeBaseUrl(
      env("CAPELLA_DATA_API_BASE_URL", "NEXT_PUBLIC_CAPELLA_DATA_API_BASE_URL")
    ),
    username: ensureConfiguredValue(
      "CAPELLA_DATA_API_USERNAME",
      env("CAPELLA_DATA_API_USERNAME", "NEXT_PUBLIC_CAPELLA_DATA_API_USERNAME")
    ),
    password: ensureConfiguredValue(
      "CAPELLA_DATA_API_PASSWORD",
      env("CAPELLA_DATA_API_PASSWORD", "NEXT_PUBLIC_CAPELLA_DATA_API_PASSWORD")
    ),
    bucket: env("CAPELLA_BUCKET", "NEXT_PUBLIC_CAPELLA_BUCKET", "agora"),
    scope: env("CAPELLA_SCOPE", "NEXT_PUBLIC_CAPELLA_SCOPE", "crm"),
    collection: env(
      "CAPELLA_COLLECTION",
      "NEXT_PUBLIC_CAPELLA_COLLECTION",
      "leads"
    ),
  };
}

function authHeader(config: CapellaConfig) {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
}

async function readBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function capellaRequest(path: string, init: RequestInit = {}) {
  const config = getCapellaConfig();
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: authHeader(config),
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to reach Couchbase Data API at ${config.baseUrl}. Check outbound HTTPS access, proxy/firewall settings, and the cluster URL. (${detail})`
    );
  }

  const body = await readBody(response);

  if (!response.ok) {
    const message =
      typeof body === "string" && body.trim()
        ? body.trim()
        : typeof body === "object" && body !== null && "message" in body
          ? String((body as { message?: unknown }).message)
          : typeof body === "object" && body !== null && "error" in body
            ? String((body as { error?: unknown }).error)
            : `Capella request failed with ${response.status}`;

    throw new Error(message);
  }

  return { response, body };
}

export async function checkCapellaConnection() {
  const { body } = await capellaRequest("/v1/callerIdentity");

  return {
    user:
      typeof body === "object" && body !== null && "user" in body
        ? String((body as { user?: unknown }).user ?? "")
        : null,
  };
}

export function mapLeadDocumentToCard(document: RawLeadDocument): LeadCardData {
  const score = document.fitScore ?? 0;
  const urgency = document.priority ?? "low";
  const name = document.contactName ?? document.name ?? document.company;
  const summary = document.summary ?? document.notes ?? "";
  const dealValue = document.dealValue ?? 0;

  return {
    id: document.id,
    name,
    company: document.company,
    stage: document.stage,
    dealValue,
    score,
    urgency,
    starred: document.starred ?? urgency === "high",
    progress: document.progress ?? Math.min(score, 100),
    summary,
    aiHint:
      document.aiHint ??
      "AI signal: Review the lead notes and move it through the pipeline.",
    scoreNotes:
      document.scoreNotes ?? ([document.notes ?? "No notes yet"].filter(Boolean) as string[]),
    tasks:
      document.tasks ??
      ([
        { label: "Review lead details", done: true },
        { label: "Update next step", done: false },
      ] as Array<{ label: string; done: boolean }>),
    followUp:
      document.followUp ??
      document.notes ??
      "Follow up from the CRM dashboard.",
  };
}

export async function listLeadDocuments(): Promise<LeadCardData[]> {
  const config = getCapellaConfig();
  const statement = `SELECT META(lead).id AS id, lead.* FROM \`${config.bucket}\`.\`${config.scope}\`.\`${config.collection}\` AS lead WHERE lead.type = "lead" ORDER BY lead.updatedAt DESC`;

  const { body } = await capellaRequest("/_p/query/query/service", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      statement,
      readonly: true,
      query_context: `default:${config.bucket}.${config.scope}`,
      timeout: "10s",
    }),
  });

  if (!body || typeof body !== "object" || !Array.isArray((body as { results?: unknown[] }).results)) {
    return [];
  }

  return (body as { results: RawLeadDocument[] }).results.map(mapLeadDocumentToCard);
}

export async function getLeadDocument(id: string) {
  const config = getCapellaConfig();
  const { response, body } = await capellaRequest(
    `/v1/buckets/${encodeURIComponent(config.bucket)}/scopes/${encodeURIComponent(config.scope)}/collections/${encodeURIComponent(config.collection)}/documents/${encodeURIComponent(id)}`
  );

  return {
    document: body as RawLeadDocument,
    etag: response.headers.get("etag"),
  };
}

export async function createLeadDocument(document: RawLeadDocument) {
  const config = getCapellaConfig();

  await capellaRequest(
    `/v1/buckets/${encodeURIComponent(config.bucket)}/scopes/${encodeURIComponent(config.scope)}/collections/${encodeURIComponent(config.collection)}/documents/${encodeURIComponent(document.id)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(document),
    }
  );

  return document;
}

export async function updateLeadDocument(
  id: string,
  document: RawLeadDocument,
  etag?: string | null
) {
  const config = getCapellaConfig();

  await capellaRequest(
    `/v1/buckets/${encodeURIComponent(config.bucket)}/scopes/${encodeURIComponent(config.scope)}/collections/${encodeURIComponent(config.collection)}/documents/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(etag ? { "If-Match": etag } : {}),
      },
      body: JSON.stringify(document),
    }
  );

  return document;
}

export async function deleteLeadDocument(id: string, etag?: string | null) {
  const config = getCapellaConfig();

  await capellaRequest(
    `/v1/buckets/${encodeURIComponent(config.bucket)}/scopes/${encodeURIComponent(config.scope)}/collections/${encodeURIComponent(config.collection)}/documents/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        ...(etag ? { "If-Match": etag } : {}),
      },
    }
  );

  return { id };
}
