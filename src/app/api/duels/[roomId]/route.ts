import { NextResponse } from "next/server";

import { getRoom } from "@/lib/duels";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { roomId } = await params;
    const room = getRoom(roomId);

    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch room" },
      { status: 404 },
    );
  }
}
