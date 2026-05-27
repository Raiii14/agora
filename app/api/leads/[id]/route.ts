import { NextRequest, NextResponse } from "next/server";

import {
  deleteLeadDocument,
  getLeadDocument,
  updateLeadDocument,
} from "@/lib/capella-data-api";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { document } = await getLeadDocument(id);
    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load lead",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const changes = (await request.json()) as Record<string, unknown>;
    const { document, etag } = await getLeadDocument(id);
    const nextDocument = {
      ...document,
      ...changes,
      id,
      type: "lead" as const,
      updatedAt: new Date().toISOString(),
    };

    const lead = await updateLeadDocument(id, nextDocument, etag);
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update lead",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { etag } = await getLeadDocument(id);
    await deleteLeadDocument(id, etag);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete lead",
      },
      { status: 500 }
    );
  }
}
