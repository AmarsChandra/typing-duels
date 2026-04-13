import { NextResponse } from "next/server";

import { submitProgress } from "@/lib/duels";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const body = (await request.json()) as { playerId?: string; typedText?: string };
    const { roomId } = await params;
    const room = submitProgress(roomId, body.playerId ?? "", body.typedText ?? "");

    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit progress" },
      { status: 400 },
    );
  }
}
