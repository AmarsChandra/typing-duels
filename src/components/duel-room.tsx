"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

type Player = {
  id: string;
  name: string;
  progress: number;
  typedText: string;
  finishedAt: number | null;
  isHost: boolean;
};

type Room = {
  id: string;
  status: RoomStatus;
  countdownStartedAt: number | null;
  raceStartedAt: number | null;
  winnerId: string | null;
  text: string;
  players: Player[];
};

type RoomResponse = {
  room: Room;
  player?: Player;
  error?: string;
};

const PLAYER_STORAGE_PREFIX = "typing-duels-player";

function getLocalPlayerId(roomId: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(`${PLAYER_STORAGE_PREFIX}:${roomId}`) ?? "";
}

function setLocalPlayerId(roomId: string, playerId: string) {
  window.localStorage.setItem(`${PLAYER_STORAGE_PREFIX}:${roomId}`, playerId);
}

export function DuelRoom({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [typedText, setTypedText] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const existingPlayerId = getLocalPlayerId(roomId);

    if (existingPlayerId) {
      setPlayerId(existingPlayerId);
    }
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;

    async function buildInviteAssets() {
      const link = `${window.location.origin}/duel/${roomId}`;
      const qr = await QRCode.toDataURL(link, {
        margin: 1,
        width: 220,
        color: {
          dark: "#f2efe5",
          light: "#111111",
        },
      });

      if (!cancelled) {
        setShareLink(link);
        setQrCode(qr);
      }
    }

    void buildInviteAssets();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;

    async function pollRoom() {
      const response = await fetch(`/api/duels/${roomId}`, { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as RoomResponse;

      if (!cancelled) {
        setRoom(data.room);
      }
    }

    void pollRoom();
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void pollRoom();
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId]);

  useEffect(() => {
    if (!room || !playerId) {
      return;
    }

    const currentPlayer = room.players.find((entry) => entry.id === playerId);

    if (!currentPlayer || currentPlayer.typedText === typedText) {
      return;
    }

    setTypedText(currentPlayer.typedText);
  }, [playerId, room, typedText]);

  const currentPlayer = room?.players.find((entry) => entry.id === playerId) ?? null;
  const opponent = room?.players.find((entry) => entry.id !== playerId) ?? null;

  const countdownSeconds = useMemo(() => {
    if (!room?.countdownStartedAt || room.status !== "countdown") {
      return 10;
    }

    const remaining = Math.ceil((room.countdownStartedAt + 10_000 - now) / 1000);
    return Math.max(0, remaining);
  }, [now, room]);

  const winner = room?.players.find((entry) => entry.id === room.winnerId) ?? null;
  const playerProgress = room ? Math.round(((currentPlayer?.progress ?? 0) / room.text.length) * 100) : 0;
  const opponentProgress = room && opponent ? Math.round((opponent.progress / room.text.length) * 100) : 0;
  const isHost = Boolean(currentPlayer?.isHost);

  const textMarkup = useMemo(() => {
    if (!room) {
      return null;
    }

    return room.text.split("").map((character, index) => {
      let className = "text-pending";

      if (index < typedText.length) {
        className = typedText[index] === character ? "text-correct" : "text-incorrect";
      }

      return (
        <span key={`${character}-${index}`} className={className}>
          {character}
        </span>
      );
    });
  }, [room, typedText]);

  async function handleJoinRoom() {
    setIsJoining(true);
    setJoinError("");

    try {
      const response = await fetch(`/api/duels/${roomId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerName }),
      });
      const data = (await response.json()) as RoomResponse;

      if (!response.ok || !data.player) {
        throw new Error(data.error ?? "Unable to join room");
      }

      setLocalPlayerId(roomId, data.player.id);
      setPlayerId(data.player.id);
      setRoom(data.room);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join room");
    } finally {
      setIsJoining(false);
    }
  }

  async function submitText(value: string) {
    setTypedText(value);

    if (!playerId) {
      return;
    }

    const response = await fetch(`/api/duels/${roomId}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId,
        typedText: value,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as RoomResponse;
      setRoom(data.room);
    }
  }

  if (!room) {
    return (
      <main className="page-shell">
        <section className="room-card">
          <p>Excavating fossil arena...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="room-card">
        <div className="room-header">
          <div>
            <p className="eyebrow">Fossil Arena {room.id}</p>
            <h1>Outtype your rival before extinction.</h1>
          </div>
          <div className={`status-pill status-${room.status}`}>{room.status}</div>
        </div>

        {!currentPlayer && room.players.length < 2 ? (
          <div className="join-panel">
            <p>Choose your dinosaur name and stomp in. The 10 second meteor countdown starts when both beasts arrive.</p>
            <div className="join-row">
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="TriceraTop"
                maxLength={24}
              />
              <button className="primary-button" type="button" disabled={isJoining} onClick={handleJoinRoom}>
                {isJoining ? "Entering arena..." : "Join arena"}
              </button>
            </div>
            {joinError ? <p className="error-text">{joinError}</p> : null}
          </div>
        ) : null}

        {!currentPlayer && room.players.length >= 2 ? (
          <div className="join-panel">
            <p>This fossil arena already has two dinosaurs. Hatch a new room to start another showdown.</p>
          </div>
        ) : null}

        <div className="scoreboard">
          <article className={`player-card ${currentPlayer ? "is-active" : ""}`}>
            <p>Your dino</p>
            <strong>{currentPlayer?.name ?? "Spectator"}</strong>
            <div className="progress-bar">
              <span style={{ width: `${playerProgress}%` }} />
            </div>
            <small>{playerProgress}% through the trail</small>
          </article>

          <article className="player-card">
            <p>Rival dino</p>
            <strong>{opponent?.name ?? "Waiting in the jungle..."}</strong>
            <div className="progress-bar">
              <span style={{ width: `${opponentProgress}%` }} />
            </div>
            <small>{opponent ? `${opponentProgress}% through the trail` : "Not joined yet"}</small>
          </article>
        </div>

        {room.status === "waiting" ? (
          <div className="stage-banner">Share this fossil link with a friend and wait for them to stomp into the arena.</div>
        ) : null}

        {isHost ? (
          <div className="share-card">
            <div>
              <p className="share-label">Summon your rival</p>
              <h2>Send this fossil link</h2>
              <p className="share-link">{shareLink}</p>
            </div>

            {qrCode ? (
              <Image className="qr-code" src={qrCode} alt="QR code for the duel link" width={220} height={220} />
            ) : null}

            <div className="share-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigator.clipboard.writeText(shareLink)}
              >
                Copy fossil link
              </button>
            </div>
          </div>
        ) : null}

        {room.status === "countdown" ? (
          <div className="countdown-panel">
            <p>Both dinosaurs are locked in</p>
            <div className="countdown-number">{countdownSeconds}</div>
            <small>The meteor hits zero and the stampede begins.</small>
          </div>
        ) : null}

        <div className="text-panel">
          <p className="eyebrow">Fossil trail</p>
          <p className="duel-text">{textMarkup}</p>
        </div>

        <textarea
          className="typing-input"
          value={typedText}
          onChange={(event) => void submitText(event.target.value)}
          placeholder={currentPlayer ? "Type here when the stampede begins..." : "Join the arena to start typing"}
          disabled={!currentPlayer || room.status !== "racing" || Boolean(winner)}
          spellCheck={false}
        />

        {winner ? (
          <div className="winner-banner">
            <p className="eyebrow">Alpha predator</p>
            <h2>{winner.id === playerId ? "You rule the valley." : `${winner.name} rules the valley.`}</h2>
            <small>The race ends the moment one dinosaur clears the entire fossil trail.</small>
          </div>
        ) : null}
      </section>
    </main>
  );
}
