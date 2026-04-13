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
  const [didCopyLink, setDidCopyLink] = useState(false);
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
  const footprintCount = 10;

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

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareLink);
    setDidCopyLink(true);
  }

  if (!room) {
    return (
      <main className="page-shell">
        <section className="room-card">
          <p>Loading room...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="room-card">
        <div className="room-header">
          <div>
            <p className="eyebrow">Room {room.id}</p>
            <h1>First to finish wins.</h1>
          </div>
          <div className={`status-pill status-${room.status}`}>{room.status}</div>
        </div>

        {!currentPlayer && room.players.length < 2 ? (
          <div className="join-panel">
            <p>Pick a name and jump in. The 10 second countdown starts as soon as both players are here.</p>
            <div className="join-row">
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Your nickname"
                maxLength={24}
              />
              <button className="primary-button" type="button" disabled={isJoining} onClick={handleJoinRoom}>
                {isJoining ? "Joining..." : "Join duel"}
              </button>
            </div>
            {joinError ? <p className="error-text">{joinError}</p> : null}
          </div>
        ) : null}

        {!currentPlayer && room.players.length >= 2 ? (
          <div className="join-panel">
            <p>This duel already has two players. Open a new room to start another race.</p>
          </div>
        ) : null}

        <div className="scoreboard">
          <article className={`player-card ${currentPlayer ? "is-active" : ""}`}>
            <p>You</p>
            <strong>{currentPlayer?.name ?? "Spectator"}</strong>
            <div className="progress-bar">
              <div className="progress-footprints" aria-hidden="true">
                {Array.from({ length: footprintCount }).map((_, index) => (
                  <span
                    key={`self-footprint-${index}`}
                    className={`footprint ${playerProgress >= ((index + 1) / footprintCount) * 100 ? "is-filled" : ""}`}
                  />
                ))}
              </div>
              <span className="progress-fill" style={{ width: `${playerProgress}%` }} />
            </div>
            <small>{playerProgress}% complete</small>
          </article>

          <article className="player-card">
            <p>Opponent</p>
            <strong>{opponent?.name ?? "Waiting for challenger..."}</strong>
            <div className="progress-bar">
              <div className="progress-footprints" aria-hidden="true">
                {Array.from({ length: footprintCount }).map((_, index) => (
                  <span
                    key={`opponent-footprint-${index}`}
                    className={`footprint ${opponentProgress >= ((index + 1) / footprintCount) * 100 ? "is-filled" : ""}`}
                  />
                ))}
              </div>
              <span className="progress-fill" style={{ width: `${opponentProgress}%` }} />
            </div>
            <small>{opponent ? `${opponentProgress}% complete` : "Not joined yet"}</small>
          </article>
        </div>

        {room.status === "waiting" ? (
          <div className="stage-banner">Share this room link with a friend and wait for them to join.</div>
        ) : null}

        {isHost ? (
          <div className="share-card">
            <div>
              <p className="share-label">Invite your opponent</p>
              <h2>Send this room link</h2>
              <p className="share-link">{shareLink}</p>
            </div>

            {qrCode ? (
              <Image className="qr-code" src={qrCode} alt="QR code for the duel link" width={220} height={220} />
            ) : null}

            <div className="share-actions">
              <button
                className={`secondary-button ${didCopyLink ? "is-copied" : ""}`}
                type="button"
                onClick={() => void handleCopyLink()}
              >
                {didCopyLink ? "Copied link" : "Copy link"}
              </button>
            </div>
          </div>
        ) : null}

        {room.status === "countdown" ? (
          <div className="countdown-panel">
            <p>Both players locked in</p>
            <div className="countdown-number">{countdownSeconds}</div>
            <small>Race starts when the timer hits zero.</small>
          </div>
        ) : null}

        <div className="text-panel">
          <p className="eyebrow">Typing course</p>
          <p className="duel-text">{textMarkup}</p>
        </div>

        <textarea
          className="typing-input"
          value={typedText}
          onChange={(event) => void submitText(event.target.value)}
          placeholder={currentPlayer ? "Start typing here when the race begins..." : "Join the duel to start typing"}
          disabled={!currentPlayer || room.status !== "racing" || Boolean(winner)}
          spellCheck={false}
        />

        {winner ? (
          <div className="winner-banner">
            <p className="eyebrow">Winner</p>
            <h2>{winner.id === playerId ? "You win the duel." : `${winner.name} wins the duel.`}</h2>
            <small>The race ends the moment someone completes the full passage.</small>
          </div>
        ) : null}
      </section>
    </main>
  );
}
