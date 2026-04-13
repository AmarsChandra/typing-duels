import { NextResponse } from "next/server";

import { createRoom } from "@/lib/duels";

export async function POST(request: Request) {
  const body = (await request.json()) as { hostName?: string };
  const { room, player } = createRoom(body.hostName ?? "Host");

  return NextResponse.json({ room, player });
}
