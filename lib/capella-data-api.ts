type CapellaConfig = {
  baseUrl: string;
  username: string;
  password: string;
  bucket: string;
  scope: string;
  collection: string;
};

export type LeadDocument = {
  id: string;
  type: "lead";
  name: string;
  company: string;
  stage: "new" | "outreach" | "in-call" | "closed";
  dealValue: number;
  score: number;
  urgency: "high" | "medium" | "low";
  starred: boolean;
  progress: number;
  summary: string;
  aiHint: string;
  scoreNotes: string[];
  tasks: Array<{ label: string; done: boolean }>;
  followUp: string;
  updatedAt: string;
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

export function getCapellaConfig(): CapellaConfig {
  return {
    baseUrl: env(
      "CAPELLA_DATA_API_BASE_URL",
      "NEXT_PUBLIC_CAPELLA_DATA_API_BASE_URL"
    ).replace(/\/+$/, ""),
    username: env("CAPELLA_DATA_API_USERNAME", "NEXT_PUBLIC_CAPELLA_DATA_API_USERNAME"),
    password: env("CAPELLA_DATA_API_PASSWORD", "NEXT_PUBLIC_CAPELLA_DATA_API_PASSWORD"),
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
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: authHeader(config),
      ...(init.headers ?? {}),
    },
  });

  const body = await readBody(response);

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: unknown }).message)
        : typeof body === "object" && body !== null && "error" in body
          ? String((body as { error?: unknown }).error)
          : `Capella request failed with ${response.status}`;

    throw new Error(message);
  }

  return { response, body };
}

export async function listLeadDocuments(): Promise<LeadDocument[]> {
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

  return (body as { results: LeadDocument[] }).results;
}

export async function getLeadDocument(id: string) {
  const config = getCapellaConfig();
  const { response, body } = await capellaRequest(
    `/v1/buckets/${encodeURIComponent(config.bucket)}/scopes/${encodeURIComponent(config.scope)}/collections/${encodeURIComponent(config.collection)}/documents/${encodeURIComponent(id)}`
  );

  return {
    document: body as LeadDocument,
    etag: response.headers.get("etag"),
  };
}

export async function createLeadDocument(document: LeadDocument) {
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
  document: LeadDocument,
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
