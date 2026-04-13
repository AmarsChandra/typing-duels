import { randomUUID } from "node:crypto";

import { countTypedCharacters, DUEL_TEXT } from "@/lib/text";

export type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

export type Player = {
  id: string;
  name: string;
  progress: number;
  typedText: string;
  finishedAt: number | null;
  isHost: boolean;
};

export type Room = {
  id: string;
  status: RoomStatus;
  createdAt: number;
  countdownStartedAt: number | null;
  raceStartedAt: number | null;
  winnerId: string | null;
  text: string;
  players: Player[];
};

const COUNTDOWN_MS = 10_000;
const rooms = new Map<string, Room>();

function computeRoomState(room: Room) {
  if (room.status === "countdown" && room.countdownStartedAt) {
    const countdownEndsAt = room.countdownStartedAt + COUNTDOWN_MS;

    if (Date.now() >= countdownEndsAt) {
      room.status = "racing";
      room.raceStartedAt = countdownEndsAt;
    }
  }

  return room;
}

function getRoomOrThrow(roomId: string) {
  const room = rooms.get(roomId);

  if (!room) {
    throw new Error("Room not found");
  }

  return computeRoomState(room);
}

export function createRoom(hostName: string) {
  const host: Player = {
    id: randomUUID(),
    name: hostName.trim() || "Host",
    progress: 0,
    typedText: "",
    finishedAt: null,
    isHost: true,
  };

  const room: Room = {
    id: randomUUID().slice(0, 8),
    status: "waiting",
    createdAt: Date.now(),
    countdownStartedAt: null,
    raceStartedAt: null,
    winnerId: null,
    text: DUEL_TEXT,
    players: [host],
  };

  rooms.set(room.id, room);
  return { room: computeRoomState(room), player: host };
}

export function joinRoom(roomId: string, playerName: string) {
  const room = getRoomOrThrow(roomId);

  if (room.players.length >= 2) {
    throw new Error("Room is full");
  }

  const player: Player = {
    id: randomUUID(),
    name: playerName.trim() || "Guest",
    progress: 0,
    typedText: "",
    finishedAt: null,
    isHost: false,
  };

  room.players.push(player);

  if (room.players.length === 2 && room.status === "waiting") {
    room.status = "countdown";
    room.countdownStartedAt = Date.now();
  }

  return { room: computeRoomState(room), player };
}

export function getRoom(roomId: string) {
  return getRoomOrThrow(roomId);
}

export function submitProgress(roomId: string, playerId: string, typedText: string) {
  const room = getRoomOrThrow(roomId);
  const player = room.players.find((entry) => entry.id === playerId);

  if (!player) {
    throw new Error("Player not found");
  }

  if (room.status !== "racing" && room.status !== "finished") {
    return room;
  }

  player.typedText = typedText;
  player.progress = countTypedCharacters(typedText);

  if (player.progress >= room.text.length && !player.finishedAt) {
    player.finishedAt = Date.now();
  }

  if (!room.winnerId) {
    const finisher = room.players
      .filter((entry) => entry.finishedAt)
      .sort((left, right) => (left.finishedAt ?? Number.MAX_SAFE_INTEGER) - (right.finishedAt ?? Number.MAX_SAFE_INTEGER))[0];

    if (finisher) {
      room.status = "finished";
      room.winnerId = finisher.id;
    }
  }

  return computeRoomState(room);
}
