import { NextResponse } from "next/server";

export const runtime = "edge";

const headers = {
  "Cache-Control": "no-store, max-age=0",
};

export async function HEAD() {
  return new NextResponse(null, { status: 204, headers });
}

export async function GET() {
  return NextResponse.json({ ok: true, timestamp: Date.now() }, { headers });
}
