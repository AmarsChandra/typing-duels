import { NextResponse } from "next/server";

import { joinRoom } from "@/lib/duels";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const body = (await request.json()) as { playerName?: string };
    const { roomId } = await params;
    const { room, player } = joinRoom(roomId, body.playerName ?? "Guest");

    return NextResponse.json({ room, player });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to join room" },
      { status: 400 },
    );
  }
}
