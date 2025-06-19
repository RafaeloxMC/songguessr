"use client";
import { useEffect, useState } from "react";

const GamePage = () => {
    const [gameData, setGameData] = useState<{
        gameMode: string;
        playlist: string;
    } | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("gameData");
        if (stored) {
            setGameData(JSON.parse(stored));
        }
    }, []);

    if (!gameData) return <div>Loading...</div>;

    return (
        <div>
            <h1>Game Page</h1>
            <p>Playlist: {gameData.playlist}</p>
            <p>Game Mode: {gameData.gameMode}</p>
        </div>
    );
};

export default GamePage;
