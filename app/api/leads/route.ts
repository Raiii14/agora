import { NextRequest, NextResponse } from "next/server";

import { createLeadDocument, listLeadDocuments } from "@/lib/capella-data-api";

export async function GET() {
  try {
    const leads = await listLeadDocuments();
    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load leads",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const leadId =
      typeof body.id === "string"
        ? body.id
        : typeof body.leadId === "string"
          ? body.leadId
          : `lead_${Date.now()}`;

    const document = {
      ...body,
      id: leadId,
      type: "lead" as const,
      updatedAt: new Date().toISOString(),
    } as any;

    const lead = await createLeadDocument(document);

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create lead",
      },
      { status: 500 }
    );
  }
}
