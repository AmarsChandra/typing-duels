import { DuelRoom } from "@/components/duel-room";

type Props = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function DuelPage({ params }: Props) {
  const { roomId } = await params;

  return <DuelRoom roomId={roomId} />;
}
