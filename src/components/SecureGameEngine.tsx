"use client";
import Button from "@/components/button";
import Card from "@/components/card";
import FloatingNotesBackground from "@/components/floatingnotesbg";
import { extractSoundCloudURL } from "@/util/SCUtils";
import { GameMode } from "@/util/enums/GameMode";
import { SoundCloudWidget } from "@/util/types/SoundCloudWidget";
import { redirect } from "next/navigation";
import React from "react";
import { motion } from "framer-motion";

interface GameEngineProps {
    gameMode: GameMode;
    playlistId: string;
}

declare global {
    interface Window {
        SC: {
            Widget: (element: HTMLIFrameElement | string) => SoundCloudWidget;
        };
    }
}

interface GameSong {
    _id: string;
    title: string;
    artist: string;
    soundcloudUrl: string;
    soundcloudTrackId: string;
    startingOffset: number;
    difficulty: string;
}

interface SecureGameState {
    gameSessionId: string | null;
    clientSessionId: string | null;

    currentRound: number;
    totalRounds: number;
    totalScore: number;
    maxPossibleScore: number;

    currentSong: GameSong | null;

    userGuess: string;
    guessResult: "correct" | "incorrect" | "revealed" | null;
    hasGuessed: boolean;
    gameStatus: "setup" | "loading" | "playing" | "submitting" | "finished";

    roundStartTime: number;
    hintsUsed: number;

    error: string | null;
}

const SecureGameEngine = ({ gameMode, playlistId }: GameEngineProps) => {
    const [widget, setWidget] = React.useState<SoundCloudWidget | null>(null);
    const [isWidgetReady, setIsWidgetReady] = React.useState(false);
    const [widgetError, setWidgetError] = React.useState<string | null>(null);
    const [currentStage, setCurrentStage] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackStartTime, setPlaybackStartTime] = React.useState(0);

    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const widgetTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const [gameState, setGameState] = React.useState<SecureGameState>({
        gameSessionId: null,
        clientSessionId: null,
        currentRound: 1,
        totalRounds: 10,
        totalScore: 0,
        maxPossibleScore: 50,
        currentSong: null,
        userGuess: "",
        guessResult: null,
        hasGuessed: false,
        gameStatus: "setup",
        roundStartTime: Date.now(),
        hintsUsed: 0,
        error: null,
    });

    const playbackDurations = [1, 3, 5, 10, 15];
    const WIDGET_TIMEOUT = 5000;

    const getAuthToken = () => {
        return localStorage.getItem("token");
    };

    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
        const token = getAuthToken();
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({ error: "Network error" }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return response.json();
    };

    const startGameSession = async () => {
        try {
            setGameState((prev) => ({
                ...prev,
                gameStatus: "loading",
                error: null,
            }));

            const result = await apiCall("/api/game/start", {
                method: "POST",
                body: JSON.stringify({
                    playlistId,
                    gameMode,
                    totalRounds: 10,
                }),
            });

            if (result.success) {
                setGameState((prev) => ({
                    ...prev,
                    gameSessionId: result.gameSession.id,
                    clientSessionId: result.gameSession.clientSessionId,
                    totalRounds: result.gameSession.totalRounds,
                    maxPossibleScore: result.gameSession.maxPossibleScore,
                    gameStatus: "playing",
                }));

                await getNextSong(
                    result.gameSession.id,
                    result.gameSession.clientSessionId
                );
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Failed to start game session:", error);
            setGameState((prev) => ({
                ...prev,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to start game",
                gameStatus: "setup",
            }));
        }
    };

    const getNextSong = async (sessionId?: string, clientId?: string) => {
        try {
            const gameSessionId = sessionId || gameState.gameSessionId;
            const clientSessionId = clientId || gameState.clientSessionId;

            if (!gameSessionId || !clientSessionId) {
                throw new Error("No active game session");
            }

            const result = await apiCall("/api/game/next-song", {
                method: "POST",
                body: JSON.stringify({
                    gameSessionId,
                    clientSessionId,
                }),
            });

            if (result.success) {
                setGameState((prev) => ({
                    ...prev,
                    currentSong: result.song,
                    currentRound: result.gameSession.currentRound,
                    totalScore: result.gameSession.totalScore,
                    userGuess: "",
                    guessResult: null,
                    hasGuessed: false,
                    roundStartTime: Date.now(),
                    hintsUsed: 0,
                    error: null,
                }));

                setCurrentStage(0);
                setIsPlaying(false);
                setPlaybackStartTime(result.song.startingOffset || 0);
                setWidget(null);
                setIsWidgetReady(false);
                setWidgetError(null);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Failed to get next song:", error);
            setGameState((prev) => ({
                ...prev,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get next song",
            }));
        }
    };

    const submitAnswer = async (userGuess: string, revealed = false) => {
        try {
            if (
                !gameState.gameSessionId ||
                !gameState.clientSessionId ||
                !gameState.currentSong
            ) {
                throw new Error("Invalid game state");
            }

            setGameState((prev) => ({ ...prev, gameStatus: "submitting" }));

            const timeToGuess = Date.now() - gameState.roundStartTime;
            const hintsUsed = Math.max(1, currentStage);

            const result = await apiCall("/api/game/submit", {
                method: "POST",
                body: JSON.stringify({
                    gameSessionId: gameState.gameSessionId,
                    songId: gameState.currentSong._id,
                    userGuess: revealed ? "" : userGuess,
                    hintsUsed,
                    timeToGuess,
                    clientSessionId: gameState.clientSessionId,
                }),
            });

            if (result.success) {
                setGameState((prev) => ({
                    ...prev,
                    guessResult: revealed
                        ? "revealed"
                        : result.round.isCorrect
                        ? "correct"
                        : "incorrect",
                    hasGuessed: true,
                    gameStatus: result.gameSession.isComplete
                        ? "finished"
                        : "playing",
                    totalScore: result.gameSession.totalScore,
                    currentRound: result.gameSession.currentRound,
                }));

                if (widget && isWidgetReady) {
                    try {
                        if (
                            iframeRef.current &&
                            iframeRef.current.contentWindow
                        ) {
                            widget.pause();
                        }
                        setIsPlaying(false);
                    } catch (error) {
                        console.warn(
                            "Widget pause failed (iframe may be destroyed):",
                            error
                        );
                        setIsPlaying(false);
                    }
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Failed to submit answer:", error);
            setGameState((prev) => ({
                ...prev,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to submit answer",
                gameStatus: "playing",
            }));
        }
    };

    const handleSubmitGuess = () => {
        if (!gameState.userGuess.trim()) return;
        submitAnswer(gameState.userGuess);
    };

    const handleRevealAnswer = () => {
        submitAnswer("", true);
    };

    const handleNextRound = () => {
        if (gameState.gameStatus === "finished") {
            return;
        }
        getNextSong();
    };

    React.useEffect(() => {
        if (!window.SC) {
            const script = document.createElement("script");
            script.src = "https://w.soundcloud.com/player/api.js";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    React.useEffect(() => {
        const initWidget = () => {
            if (!iframeRef.current || !gameState.currentSong) return;

            setWidgetError(null);
            setIsWidgetReady(false);

            const iframe = iframeRef.current;

            if (widgetTimeoutRef.current) {
                clearTimeout(widgetTimeoutRef.current);
            }

            widgetTimeoutRef.current = setTimeout(() => {
                if (!isWidgetReady) {
                    setWidgetError("Widget initialization timed out");
                }
            }, WIDGET_TIMEOUT);

            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        if (window.SC && iframeRef.current) {
                            const widgetInstance = window.SC.Widget(
                                iframeRef.current
                            );
                            setWidget(widgetInstance);

                            widgetInstance.bind("ready", () => {
                                if (widgetTimeoutRef.current) {
                                    clearTimeout(widgetTimeoutRef.current);
                                }
                                setIsWidgetReady(true);
                                setWidgetError(null);
                            });

                            widgetInstance.bind("error", () => {
                                if (widgetTimeoutRef.current) {
                                    clearTimeout(widgetTimeoutRef.current);
                                }
                                setWidgetError("Failed to load audio");
                            });
                        }
                    } catch (error) {
                        console.error("Widget initialization error:", error);
                        setWidgetError("Widget initialization failed");
                    }
                }, 1500);
            };
        };

        if (gameState.currentSong) {
            initWidget();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState.currentSong, WIDGET_TIMEOUT]);

    const startProgressivePlayback = () => {
        if (
            !widget ||
            !isWidgetReady ||
            currentStage >= playbackDurations.length
        )
            return;

        const duration = playbackDurations[currentStage];
        setIsPlaying(true);

        try {
            widget.seekTo(playbackStartTime * 1000);
            widget.play();

            timeoutRef.current = setTimeout(() => {
                if (widget && isWidgetReady) {
                    try {
                        widget.pause();
                    } catch (error) {
                        console.error(
                            "Error pausing widget in timeout:",
                            error
                        );
                    }
                }
                setIsPlaying(false);
                setCurrentStage((prev) => prev + 1);
                setGameState((prev) => ({
                    ...prev,
                    hintsUsed: Math.max(prev.hintsUsed, currentStage + 1),
                }));
            }, duration * 1000);
        } catch (error) {
            console.error("Error starting progressive playback:", error);
            setIsPlaying(false);
        }
    };

    const repeatCurrentStage = () => {
        if (!widget || !isWidgetReady) return;

        const stageToPlay = Math.max(0, currentStage - 1);
        const duration = playbackDurations[stageToPlay];

        try {
            widget.seekTo(playbackStartTime * 1000);
            widget.play();
            setIsPlaying(true);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                if (widget && isWidgetReady) {
                    try {
                        widget.pause();
                    } catch (error) {
                        console.error(
                            "Error pausing widget in repeat timeout:",
                            error
                        );
                    }
                }
                setIsPlaying(false);
            }, duration * 1000);
        } catch (error) {
            console.error("Error repeating current stage:", error);
            setIsPlaying(false);
        }
    };

    const handleProgressivePlay = () => {
        if (
            currentStage < playbackDurations.length &&
            !isPlaying &&
            !gameState.hasGuessed
        ) {
            startProgressivePlayback();
        }
    };

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (widgetTimeoutRef.current) {
                clearTimeout(widgetTimeoutRef.current);
            }
        };
    }, []);

    React.useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "Enter" && gameState.hasGuessed) {
                handleNextRound();
            }
        };

        document.addEventListener("keydown", handleKeyPress);
        return () => document.removeEventListener("keydown", handleKeyPress);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState.hasGuessed]);

    const getGameModeText = () => {
        switch (gameMode) {
            case GameMode.CLASSIC:
                return "song title";
            case GameMode.ARTIST:
                return "artist name";
            default:
                return "song";
        }
    };

    const getGameModePrompt = () => {
        switch (gameMode) {
            case GameMode.CLASSIC:
                return "What's this song?";
            case GameMode.ARTIST:
                return "Who's the artist?";
            default:
                return "What's your guess?";
        }
    };

    const getGameModeIcon = () => {
        switch (gameMode) {
            case GameMode.CLASSIC:
                return "🎵";
            case GameMode.ARTIST:
                return "🎤";
            default:
                return "🎮";
        }
    };

    const getStageButtonText = () => {
        if (currentStage >= playbackDurations.length) {
            return "All hints used";
        }
        if (currentStage === 0) {
            return `Play first hint (${playbackDurations[0]}s)`;
        }
        return `Next hint (${playbackDurations[currentStage]}s)`;
    };

    return (
        <div className="min-h-screen bg-[var(--background)] relative mt-16">
            <div className="relative z-10 p-6 max-w-4xl mx-auto pt-8">
                {/* Game Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
                        {getGameModeIcon()} SongGuesser
                    </h1>
                    <div className="flex justify-center items-center gap-6 text-lg flex-wrap">
                        <span className="bg-[var(--card)] px-4 py-2 rounded-lg border border-[var(--border)] text-md">
                            Round {gameState.currentRound}/
                            {gameState.totalRounds}
                        </span>
                        <span className="bg-[var(--card)] px-4 py-2 rounded-lg border border-[var(--border)] font-semibold text-md">
                            Score: {gameState.totalScore}
                        </span>
                        <span className="bg-[var(--card)] px-4 py-2 rounded-lg border border-[var(--border)] text-md">
                            {gameMode.charAt(0).toUpperCase() +
                                gameMode.slice(1)}{" "}
                            Mode
                        </span>
                    </div>
                </div>

                {/* Error Display */}
                {gameState.error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <Card
                            variant="primary"
                            className="border-red-300 bg-red-50"
                        >
                            <div className="text-center">
                                <div className="text-4xl mb-2">⚠️</div>
                                <p className="text-red-600 mb-4">
                                    {gameState.error}
                                </p>
                                <Button
                                    label="Try Again"
                                    onClick={() =>
                                        setGameState((prev) => ({
                                            ...prev,
                                            error: null,
                                        }))
                                    }
                                    variant="secondary"
                                />
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Game Setup */}
                {gameState.gameStatus === "setup" && !gameState.error && (
                    <div className="text-center mb-6">
                        <Card variant="primary" className="mb-6 p-8">
                            <div className="text-6xl mb-6 animate-bounce">
                                🎮
                            </div>
                            <h2 className="text-2xl font-semibold mb-4">
                                Ready to Play?
                            </h2>
                            <p className="mb-6 text-lg">
                                You&apos;ll hear song clips of increasing
                                length. Guess the {getGameModeText()} for more
                                points!
                            </p>

                            {/* Hint duration visual */}
                            <div className="mb-6">
                                <p className="text-sm mb-4 text-[var(--text-secondary)]">
                                    Hint durations:{" "}
                                    {playbackDurations
                                        .map((d) => `${d}s`)
                                        .join(" → ")}
                                </p>
                                <div className="flex justify-center gap-3">
                                    {playbackDurations.map(
                                        (duration, index) => (
                                            <div
                                                key={index}
                                                className="flex flex-col items-center"
                                            >
                                                <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                    {duration}s
                                                </div>
                                                {index <
                                                    playbackDurations.length -
                                                        1 && (
                                                    <div className="w-6 h-0.5 bg-[var(--border)] mt-2"></div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Button
                            label="Start Game"
                            onClick={startGameSession}
                            variant="accent"
                            className="text-lg px-8 py-4"
                        />
                    </div>
                )}

                {/* Loading State */}
                {gameState.gameStatus === "loading" && (
                    <div className="text-center mb-6">
                        <Card variant="primary" className="p-8">
                            <div className="text-4xl mb-4 animate-spin">🎵</div>
                            <p className="text-lg">Setting up your game...</p>
                        </Card>
                    </div>
                )}

                {/* Game Finished */}
                {gameState.gameStatus === "finished" && (
                    <div className="text-center mb-6">
                        <Card variant="primary" className="mb-6 p-8">
                            <div className="text-6xl mb-6 animate-bounce">
                                🎉
                            </div>
                            <h2 className="text-2xl font-bold mb-4">
                                Game Complete!
                            </h2>

                            <div className="mb-6">
                                <p className="text-2xl mb-4">
                                    Final Score: {gameState.totalScore}/
                                    {gameState.maxPossibleScore}
                                </p>
                                <div className="w-full bg-[var(--border)] rounded-full h-3 mb-3">
                                    <div
                                        className="bg-[var(--accent)] h-3 rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${
                                                (gameState.totalScore /
                                                    gameState.maxPossibleScore) *
                                                100
                                            }%`,
                                        }}
                                    ></div>
                                </div>
                                <p className="text-lg">
                                    You scored{" "}
                                    {Math.round(
                                        (gameState.totalScore /
                                            gameState.maxPossibleScore) *
                                            100
                                    )}
                                    %
                                </p>
                            </div>

                            <Card variant="secondary" className="mb-6">
                                <p className="text-lg">
                                    {gameState.totalScore /
                                        gameState.maxPossibleScore >=
                                    0.8
                                        ? "🌟 Outstanding performance!"
                                        : gameState.totalScore /
                                              gameState.maxPossibleScore >=
                                          0.6
                                        ? "🎯 Great job!"
                                        : gameState.totalScore /
                                              gameState.maxPossibleScore >=
                                          0.4
                                        ? "👍 Good effort!"
                                        : "📚 Keep practicing!"}
                                </p>
                            </Card>
                        </Card>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8 items-center justify-center">
                            <Button
                                label="Play Again"
                                onClick={() => window.location.reload()}
                                variant="accent"
                            />
                            <Button
                                label="Choose Different Playlist"
                                onClick={() => window.history.back()}
                                variant="secondary"
                            />
                            <Button
                                label="Return to Home"
                                onClick={() => redirect("/")}
                                variant="primary"
                            />
                        </div>
                    </div>
                )}

                {/* Active Game */}
                {gameState.gameStatus === "playing" &&
                    gameState.currentSong && (
                        <div className="space-y-6">
                            {/* Progress Indicator */}
                            <Card className="p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium">
                                        Hints Used:
                                    </span>
                                    <span className="text-sm bg-[var(--accent)] text-white px-2 py-1 rounded">
                                        {Math.max(
                                            currentStage,
                                            gameState.hintsUsed
                                        )}
                                        /{playbackDurations.length}
                                    </span>
                                </div>
                                <div className="flex space-x-1">
                                    {playbackDurations.map(
                                        (duration, index) => (
                                            <div
                                                key={index}
                                                className={`flex-1 h-3 rounded ${
                                                    index <
                                                    Math.max(
                                                        currentStage,
                                                        gameState.hintsUsed
                                                    )
                                                        ? "bg-[var(--accent)]"
                                                        : index ===
                                                              currentStage &&
                                                          isPlaying
                                                        ? "bg-[var(--secondary)] animate-pulse"
                                                        : "bg-gray-300"
                                                }`}
                                            />
                                        )
                                    )}
                                </div>
                                <div className="flex justify-between text-xs mt-2 text-[var(--text-secondary)]">
                                    {playbackDurations.map(
                                        (duration, index) => (
                                            <span key={index}>{duration}s</span>
                                        )
                                    )}
                                </div>
                            </Card>

                            {/* Audio Player */}
                            <Card variant="secondary">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <span className="text-2xl">🎵</span>
                                        Audio Player
                                    </h3>
                                    <iframe
                                        ref={iframeRef}
                                        src={extractSoundCloudURL(
                                            gameState.currentSong.soundcloudUrl
                                        )}
                                        width="100%"
                                        height={
                                            gameState.hasGuessed ? "166" : "1"
                                        }
                                        allow="autoplay"
                                        className={`rounded ${
                                            gameState.hasGuessed
                                                ? ""
                                                : "opacity-0 pointer-events-none"
                                        }`}
                                    />
                                </div>

                                {/* Playback Controls */}
                                {!gameState.hasGuessed && (
                                    <div className="text-center">
                                        {widgetError ? (
                                            <div className="space-y-3">
                                                <div className="text-4xl mb-2">
                                                    ⚠️
                                                </div>
                                                <p className="text-red-500 text-sm mb-3">
                                                    {widgetError}
                                                </p>
                                            </div>
                                        ) : !isWidgetReady ? (
                                            <div className="py-4">
                                                <div className="text-4xl mb-3 animate-spin">
                                                    🎧
                                                </div>
                                                <p className="mb-4">
                                                    Loading song...
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                <Button
                                                    label={
                                                        isPlaying
                                                            ? `Playing (${
                                                                  playbackDurations[
                                                                      currentStage
                                                                  ] ||
                                                                  playbackDurations[
                                                                      playbackDurations.length -
                                                                          1
                                                                  ]
                                                              }s)...`
                                                            : getStageButtonText()
                                                    }
                                                    onClick={
                                                        handleProgressivePlay
                                                    }
                                                    disabled={
                                                        isPlaying ||
                                                        currentStage >=
                                                            playbackDurations.length ||
                                                        !isWidgetReady
                                                    }
                                                    variant="accent"
                                                    className="flex-1"
                                                />
                                                <Button
                                                    label={
                                                        isPlaying
                                                            ? "Playing..."
                                                            : `Repeat (${
                                                                  playbackDurations[
                                                                      Math.max(
                                                                          0,
                                                                          currentStage -
                                                                              1
                                                                      )
                                                                  ]
                                                              }s)`
                                                    }
                                                    onClick={repeatCurrentStage}
                                                    disabled={
                                                        !isWidgetReady ||
                                                        currentStage === 0
                                                    }
                                                    variant="secondary"
                                                    className="flex-1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>

                            {/* Guessing Interface */}
                            <Card variant="secondary">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span className="text-2xl">
                                        {getGameModeIcon()}
                                    </span>
                                    {getGameModePrompt()}
                                </h3>

                                {!gameState.hasGuessed ? (
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder={`Enter the ${getGameModeText()}...`}
                                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                                            value={gameState.userGuess}
                                            onChange={(e) =>
                                                setGameState((prev) => ({
                                                    ...prev,
                                                    userGuess: e.target.value,
                                                }))
                                            }
                                            onKeyPress={(e) =>
                                                e.key === "Enter" &&
                                                handleSubmitGuess()
                                            }
                                            disabled={
                                                gameState.gameStatus !==
                                                "playing"
                                            }
                                        />
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button
                                                label={
                                                    gameState.gameStatus !==
                                                    "playing"
                                                        ? "Submitting..."
                                                        : "Submit Guess"
                                                }
                                                onClick={handleSubmitGuess}
                                                disabled={
                                                    !gameState.userGuess.trim() ||
                                                    gameState.gameStatus !==
                                                        "playing"
                                                }
                                                variant="accent"
                                                className="flex-1"
                                            />
                                            <Button
                                                label="Reveal Answer"
                                                onClick={handleRevealAnswer}
                                                disabled={
                                                    gameState.gameStatus !==
                                                    "playing"
                                                }
                                                variant="secondary"
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Result Display */}
                                        <div
                                            className={`p-4 rounded-lg ${
                                                gameState.guessResult ===
                                                "correct"
                                                    ? "bg-green-100 border-green-300"
                                                    : gameState.guessResult ===
                                                      "incorrect"
                                                    ? "bg-red-100 border-red-300"
                                                    : "bg-yellow-100 border-yellow-300"
                                            }`}
                                        >
                                            {gameState.guessResult ===
                                            "correct" ? (
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">
                                                        🎉
                                                    </div>
                                                    <p className="font-semibold text-green-800 mb-2">
                                                        Correct!
                                                    </p>
                                                    <p className="text-green-700 mt-2">
                                                        <strong>
                                                            {
                                                                gameState
                                                                    .currentSong
                                                                    .title
                                                            }
                                                        </strong>{" "}
                                                        by{" "}
                                                        <strong>
                                                            {
                                                                gameState
                                                                    .currentSong
                                                                    .artist
                                                            }
                                                        </strong>
                                                    </p>
                                                </div>
                                            ) : gameState.guessResult ===
                                              "incorrect" ? (
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">
                                                        ❌
                                                    </div>
                                                    <p className="font-semibold text-red-800 mb-2">
                                                        Incorrect
                                                    </p>
                                                    <p className="text-red-700 text-sm">
                                                        Your guess:{" "}
                                                        <em>
                                                            {
                                                                gameState.userGuess
                                                            }
                                                        </em>
                                                    </p>
                                                    <p className="text-red-700 text-xs mt-2">
                                                        <strong>
                                                            {
                                                                gameState
                                                                    .currentSong
                                                                    .title
                                                            }
                                                        </strong>{" "}
                                                        by{" "}
                                                        <strong>
                                                            {
                                                                gameState
                                                                    .currentSong
                                                                    .artist
                                                            }
                                                        </strong>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">
                                                        🔍
                                                    </div>
                                                    <p className="font-semibold text-yellow-800 mb-2">
                                                        Answer Revealed
                                                    </p>
                                                    <p className="text-yellow-700 text-xs mt-2">
                                                        <strong>
                                                            {
                                                                gameState
                                                                    .currentSong
                                                                    .title
                                                            }
                                                        </strong>{" "}
                                                        by{" "}
                                                        <strong>
                                                            {
                                                                gameState
                                                                    .currentSong
                                                                    .artist
                                                            }
                                                        </strong>
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Next Round Button */}
                                        <div className="text-center">
                                            <Button
                                                label={
                                                    gameState.currentRound >=
                                                    gameState.totalRounds
                                                        ? "Finish Game"
                                                        : "Next Round"
                                                }
                                                onClick={handleNextRound}
                                                variant="accent"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
            </div>
            <FloatingNotesBackground />
        </div>
    );
};

export default SecureGameEngine;
