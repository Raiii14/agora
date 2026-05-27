import { NextResponse } from "next/server";

import { checkCapellaConnection } from "@/lib/capella-data-api";

export async function GET() {
  try {
    const { user } = await checkCapellaConnection();

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Capella test failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: message.startsWith("Unable to reach Couchbase Data API") ? 503 : 500 }
    );
  }
}
