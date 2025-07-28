"use client";
import GameEngine from "@/components/GameEngine";
import SecureGameEngine from "@/components/SecureGameEngine";
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
    const [isAuthenticated, setIsAuthenticated] = React.useState<
        boolean | null
    >(null);
    const [authChecked, setAuthChecked] = React.useState(false);

    React.useEffect(() => {
        if (!gameMode || !playlist) {
            redirect("/");
        }
        if (!Object.values(GameMode).includes(gameMode as GameMode)) {
            redirect("/");
        }
    }, [gameMode, playlist]);

    React.useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setIsAuthenticated(false);
                    setAuthChecked(true);
                    return;
                }

                const response = await fetch("/api/auth/validate", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setIsAuthenticated(response.ok);
            } catch (error) {
                console.error("Error checking authentication:", error);
                setIsAuthenticated(false);
            } finally {
                setAuthChecked(true);
            }
        };

        checkAuthentication();
    }, []);

    if (!Object.values(GameMode).includes(gameMode as GameMode)) {
        return null;
    }

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-spin">🎵</div>
                    <p className="text-[var(--text)]">Loading game...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <SecureGameEngine
                gameMode={gameMode as GameMode}
                playlistId={playlist}
            />
        );
    } else {
        return (
            <GameEngine gameMode={gameMode as GameMode} playlistId={playlist} />
        );
    }
};

export default GamePage;
