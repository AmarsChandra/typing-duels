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
        <div className="eyebrow">Prehistoric 1v1 typing</div>
        <h1>DinosaurType is built for apex predators.</h1>
        <p className="hero-copy">
          Open a fossil arena, lure in a rival dinosaur, and race through the same passage when the meteor
          countdown hits zero.
        </p>

        <form className="create-form" onSubmit={handleCreateDuel}>
          <label className="field">
            <span>Dino name</span>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="RaptorRacer"
              maxLength={24}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "Opening fossil arena..." : "Start Dino Duel"}
          </button>
        </form>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
