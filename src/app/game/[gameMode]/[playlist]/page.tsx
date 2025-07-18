"use client";
import GameEngine from "@/components/GameEngine";
import { GameMode } from "@/util/enums/GameMode";
import { redirect } from "next/navigation";
import React from "react";

interface GamePageProps {
    params: Promise<{
        gameMode: string;
        playlist: string;
    }>;
}

const GamePage = ({ params }: GamePageProps) => {
    const { gameMode, playlist } = React.use(params);

    React.useEffect(() => {
        if (!gameMode || !playlist) {
            redirect("/");
        }
        if (!Object.values(GameMode).includes(gameMode as GameMode)) {
            redirect("/");
        }
    }, [gameMode, playlist]);

    if (!Object.values(GameMode).includes(gameMode as GameMode)) {
        return null;
    }

    return <GameEngine gameMode={gameMode as GameMode} playlistId={playlist} />;
};

export default GamePage;
