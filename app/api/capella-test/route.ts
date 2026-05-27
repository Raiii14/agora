import { NextResponse } from "next/server";

import { getCapellaConfig } from "@/lib/capella-data-api";

export async function GET() {
  try {
    const config = getCapellaConfig();
    const response = await fetch(`${config.baseUrl}/v1/callerIdentity`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(
          `${config.username}:${config.password}`
        ).toString("base64")}`,
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof body === "object" && body && "message" in body
          ? String((body as { message?: unknown }).message)
          : `Capella test failed with ${response.status}`
      );
    }

    return NextResponse.json({
      ok: true,
      user: typeof body === "object" && body && "user" in body ? body.user : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Capella test failed",
      },
      { status: 500 }
    );
  }
}
