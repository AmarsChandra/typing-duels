"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type CreateRoomResponse = {
  room: {
    id: string;
  };
  player: {
    id: string;
  };
};

const PLAYER_STORAGE_PREFIX = "typing-duels-player";

export function DuelLobby() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreateDuel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/duels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hostName: playerName }),
        });

        if (!response.ok) {
          throw new Error("Unable to create duel");
        }

        const data = (await response.json()) as CreateRoomResponse;
        window.localStorage.setItem(`${PLAYER_STORAGE_PREFIX}:${data.room.id}`, data.player.id);
        router.push(`/duel/${data.room.id}`);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to create duel");
      }
    });
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Live head-to-head typing</div>
        <h1>Typing duels built for bragging rights.</h1>
        <p className="hero-copy">
          Create a room, share the link or QR code, wait for your challenger, then sprint through the same
          passage when the countdown hits zero.
        </p>

        <form className="create-form" onSubmit={handleCreateDuel}>
          <label className="field">
            <span>Your name</span>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="SpeedDemon99"
              maxLength={24}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "Preparing duel..." : "Start Duel"}
          </button>
        </form>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
