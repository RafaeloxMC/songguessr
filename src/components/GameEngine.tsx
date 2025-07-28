"use client";
import Button from "@/components/button";
import Card from "@/components/card";
import FloatingNotesBackground from "@/components/floatingnotesbg";
import { IPlaylist } from "@/database/schemas/Playlist";
import { ISong } from "@/database/schemas/Song";
import { extractSoundCloudURL } from "@/util/SCUtils";
import { GameMode } from "@/util/enums/GameMode";
import { SoundCloudWidget } from "@/util/types/SoundCloudWidget";
import Link from "next/link";
import { redirect } from "next/navigation";
import React, { useCallback } from "react";
import useSWR from "swr";

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

interface GameState {
    currentRound: number;
    totalRounds: number;
    score: number;
    currentSongId: string | null;
    currentSongTitle: string;
    currentArtist: string;
    userGuess: string;
    guessResult: "correct" | "incorrect" | "revealed" | null;
    hasGuessed: boolean;
    gameStatus: "setup" | "playing" | "paused" | "finished";
    roundStartTime: number;
    alreadyPlayedSongIds?: Set<string>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const GameEngine = ({ gameMode, playlistId }: GameEngineProps) => {
    const [playlist_data, setPlaylistData] = React.useState<IPlaylist | null>(
        null
    );
    const [widget, setWidget] = React.useState<SoundCloudWidget | null>(null);
    const [isWidgetReady, setIsWidgetReady] = React.useState(false);
    const [widgetError, setWidgetError] = React.useState<string | null>(null);
    const [retryCount, setRetryCount] = React.useState(0);
    const [failedSongIds, setFailedSongIds] = React.useState<Set<string>>(
        new Set()
    );
    const [isSelectingNewSong, setIsSelectingNewSong] = React.useState(false);

    const [currentStage, setCurrentStage] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackStartTime, setPlaybackStartTime] = React.useState(0);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const widgetTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const [gameState, setGameState] = React.useState<GameState>({
        currentRound: 1,
        totalRounds:
            (playlist_data?.songCount || 0) > 10
                ? 10
                : playlist_data?.songCount || 0,
        score: 0,
        currentSongId: null,
        currentSongTitle: "",
        currentArtist: "",
        userGuess: "",
        guessResult: null,
        hasGuessed: false,
        gameStatus: "setup",
        roundStartTime: Date.now(),
        alreadyPlayedSongIds: new Set(),
    });

    const [gameSessionId, setGameSessionId] = React.useState<string | null>(
        null
    );
    const [sessionError, setSessionError] = React.useState<string | null>(null);

    const playbackDurations = [1, 3, 5, 10, 15];
    const decodedPlaylist = decodeURIComponent(playlistId);

    const { data, isLoading } = useSWR<{
        success: boolean;
        playlist: IPlaylist;
    }>(`/api/playlists/${decodedPlaylist}`, fetcher);

    const {
        data: songData,
        error: songError,
        isLoading: isSongLoading,
    } = useSWR<ISong>(
        gameState.currentSongId
            ? `/api/songs/${gameState.currentSongId}`
            : null,
        fetcher
    );

    React.useEffect(() => {
        if (!window.SC) {
            const script = document.createElement("script");
            script.src = "https://w.soundcloud.com/player/api.js";
            script.async = true;
            script.onload = () => {
                console.log("SoundCloud API script loaded");
            };
            document.head.appendChild(script);
        }
    }, []);

    React.useEffect(() => {
        if (data?.playlist) {
            setPlaylistData(data.playlist);

            setGameState((prev) => ({
                ...prev,
                totalRounds:
                    (playlist_data?.songCount || 0) > 10
                        ? 10
                        : playlist_data?.songCount || 0,
            }));
        }
    }, [data, playlist_data?.songCount]);

    const MAX_RETRIES = 3;
    const WIDGET_TIMEOUT = 5000;

    const getRandomSong = (playlist: IPlaylist): string | null => {
        if (!playlist.songIds || playlist.songIds.length === 0) return null;

        const availableSongs = playlist.songIds.filter(
            (songId) => !failedSongIds.has(songId.toString())
        );

        if (availableSongs.length === 0) {
            setFailedSongIds(new Set());
            const randomIndex = Math.floor(
                Math.random() * playlist.songIds.length
            );
            return playlist.songIds[randomIndex].toString();
        }

        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        return availableSongs[randomIndex].toString();
    };
    // TODO: Fix the warning here, changing it to a useCallback will break finding random songs in a not really predictable way.
    // The 'getRandomSong' function makes the dependencies of useCallback Hook (at line 434) change on every render. To fix this, wrap the definition of 'getRandomSong' in its own useCallback() Hook. eslint(react-hooks/exhaustive-deps)

    const selectDifferentSong = React.useCallback(() => {
        if (!playlist_data || isSelectingNewSong) return;

        setIsSelectingNewSong(true);

        if (gameState.currentSongId) {
            setFailedSongIds(
                (prev) => new Set([...prev, gameState.currentSongId!])
            );
        }

        let newSongId = getRandomSong(playlist_data) ?? "";

        if (
            gameState.alreadyPlayedSongIds?.size ===
            playlist_data.songIds?.length
        ) {
            setGameState((prev) => ({
                ...prev,
                gameStatus: "finished",
                totalRounds: prev.alreadyPlayedSongIds?.size || 0,
            }));
            return;
        } else if (gameState.alreadyPlayedSongIds?.has(newSongId)) {
            while (gameState.alreadyPlayedSongIds?.has(newSongId)) {
                newSongId = getRandomSong(playlist_data) ?? "";
            }
        }

        if (newSongId) {
            setGameState((prev) => ({
                ...prev,
                currentSongId: newSongId,
                currentSongTitle: "",
                currentArtist: "",
            }));

            setWidget(null);
            setIsWidgetReady(false);
            setWidgetError(null);
            setRetryCount(0);
        }

        setIsSelectingNewSong(false);
    }, [
        // TODO: Fix this dependency array / works like this but when using "Update the dependencies" it breaks.
        // React Hook React.useCallback has missing dependencies: 'gameState.alreadyPlayedSongIds' and 'getRandomSong'. Either include them or remove the dependency array. eslint(react-hooks/exhaustive-deps)
        playlist_data,
        gameState.currentSongId,
        isSelectingNewSong,
        failedSongIds,
    ]);

    const initializeWidget = () => {
        if (!iframeRef.current || !songData) return;

        setWidgetError(null);
        setIsWidgetReady(false);

        const iframe = iframeRef.current;

        if (widgetTimeoutRef.current) {
            clearTimeout(widgetTimeoutRef.current);
        }

        widgetTimeoutRef.current = setTimeout(() => {
            if (!isWidgetReady) {
                setWidgetError("Widget initialization timed out");
                if (retryCount < MAX_RETRIES) {
                    setRetryCount((prev) => prev + 1);
                } else {
                    selectDifferentSong();
                }
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
                            setRetryCount(0);

                            setTimeout(() => {
                                widgetInstance.getCurrentSound((sound) => {
                                    if (sound && sound.title) {
                                        setGameState((prev) => ({
                                            ...prev,
                                            currentSongTitle:
                                                songData.title ?? sound.title,
                                            currentArtist:
                                                songData.artist ??
                                                (sound.user?.username ||
                                                    "Unknown Artist"),
                                        }));
                                    } else {
                                        setTimeout(() => {
                                            widgetInstance.getCurrentSound(
                                                (retrySound) => {
                                                    if (
                                                        retrySound &&
                                                        retrySound.title
                                                    ) {
                                                        setGameState(
                                                            (prev) => ({
                                                                ...prev,
                                                                currentSongTitle:
                                                                    retrySound.title,
                                                                currentArtist:
                                                                    retrySound.user
                                                                        ? retrySound
                                                                              .user
                                                                              .username
                                                                        : "Unknown Artist",
                                                            })
                                                        );
                                                    } else {
                                                        selectDifferentSong();
                                                    }
                                                }
                                            );
                                        }, 2000);
                                    }
                                });
                            }, 1000);
                        });

                        widgetInstance.bind("error", () => {
                            if (widgetTimeoutRef.current) {
                                clearTimeout(widgetTimeoutRef.current);
                            }
                            setWidgetError("Failed to load audio");
                            if (retryCount < MAX_RETRIES) {
                                setRetryCount((prev) => prev + 1);
                            } else {
                                selectDifferentSong();
                            }
                        });
                    }
                } catch (error) {
                    console.error("Widget initialization error:", error);
                    setWidgetError("Widget initialization failed");
                    if (retryCount < MAX_RETRIES) {
                        setRetryCount((prev) => prev + 1);
                    } else {
                        selectDifferentSong();
                    }
                }
            }, 1500);
        };

        iframe.onerror = () => {
            setWidgetError("Failed to load iframe");
            if (retryCount < MAX_RETRIES) {
                setRetryCount((prev) => prev + 1);
            } else {
                selectDifferentSong();
            }
        };
    };

    React.useEffect(() => {
        if (songData && iframeRef.current) {
            initializeWidget();
        } else if (
            songError &&
            gameState.currentSongId &&
            !isSelectingNewSong
        ) {
            selectDifferentSong();
        } else if (
            !songData &&
            !isSongLoading &&
            gameState.currentSongId &&
            !isSelectingNewSong
        ) {
            selectDifferentSong();
        }
    }, [
        // TODO: When using "Update the dependencies" it breaks. Also, when doing this, it wants initializeWidget as a useCallback.
        songData,
        songError,
        isSongLoading,
        gameState.currentSongId,
        selectDifferentSong,
        isSelectingNewSong,
    ]);

    const retryWidgetInit = () => {
        selectDifferentSong();
        fetchCurrentSongInfo();
        setRetryCount((prev) => prev + 1);
    };

    const fetchCurrentSongInfo = React.useCallback(() => {
        if (widget && isWidgetReady) {
            widget.getCurrentSound((sound) => {
                if (sound && sound.title) {
                    setGameState((prev) => ({
                        ...prev,
                        currentSongTitle: sound.title,
                        currentArtist: sound.user
                            ? sound.user.username
                            : "Unknown Artist",
                    }));
                }
            });
        }
    }, [widget, isWidgetReady]);

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

    const createGameSession = async () => {
        try {
            const token = localStorage.getItem("token");

            const endpoint = token
                ? "/api/game/start"
                : "/api/game/guest/start";
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };

            if (token) {
                headers.Authorization = token;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    playlistId: decodedPlaylist,
                    gameMode: gameMode,
                    totalRounds: gameState.totalRounds,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setGameSessionId(data.gameSession.id);
                setSessionError(null);
                return true;
            } else {
                setSessionError(data.error || "Failed to create game session");
                return false;
            }
        } catch (error) {
            console.error("Error creating game session:", error);
            setSessionError("Failed to create game session");
            return false;
        }
    };

    const startNewRound = useCallback(async () => {
        if (!playlist_data) return;

        if (gameState.currentRound === 1 && !gameSessionId) {
            const sessionCreated = await createGameSession();
            if (!sessionCreated) {
                return;
            }
        }

        const newSongId = getRandomSong(playlist_data);
        if (!newSongId) return;

        if (
            playlist_data.songIds?.length ===
            gameState.alreadyPlayedSongIds?.size
        ) {
            setGameState((prev) => ({
                ...prev,
                gameStatus: "finished",
            }));
            return;
        }

        if (gameState.alreadyPlayedSongIds?.has(newSongId)) {
            setIsSelectingNewSong(true);
            setTimeout(() => {
                setIsSelectingNewSong(false);
                startNewRound();
            }, 1000);
            return;
        }

        setGameState((prev) => ({
            ...prev,
            currentSongId: newSongId,
            userGuess: "",
            guessResult: null,
            hasGuessed: false,
            gameStatus: "playing",
            roundStartTime: Date.now(),
            currentSongTitle: "",
        }));

        const newState = gameState.alreadyPlayedSongIds?.add(newSongId);
        setGameState((prev) => ({
            ...prev,
            alreadyPlayedSongIds: newState ? new Set(newState) : new Set(),
        }));

        setCurrentStage(0);
        setIsPlaying(false);
        setPlaybackStartTime(songData?.startingOffset || 0);
        setWidget(null);
        setIsWidgetReady(false);
        setWidgetError(null);
        setRetryCount(0);
        setIsSelectingNewSong(false);
    }, [
        gameState.alreadyPlayedSongIds,
        getRandomSong,
        playlist_data,
        songData?.startingOffset,
        gameSessionId,
    ]);

    const repeatCurrentStage = () => {
        if (!widget || !isWidgetReady) return;

        if (currentStage === 0) {
            setCurrentStage(1);
        }

        widget.seekTo(playbackStartTime * 1000);
        widget.play();
        setIsPlaying(true);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        const duration =
            currentStage > 0
                ? playbackDurations[currentStage - 1]
                : playbackDurations[0];
        timeoutRef.current = setTimeout(() => {
            widget.pause();
            setIsPlaying(false);
        }, duration * 1000);
    };

    const startProgressivePlayback = () => {
        if (!widget || currentStage >= playbackDurations.length) return;

        const duration = playbackDurations[currentStage];
        setIsPlaying(true);

        widget.seekTo(playbackStartTime * 1000);
        widget.play();

        timeoutRef.current = setTimeout(() => {
            widget.pause();
            setIsPlaying(false);
            setCurrentStage((prev) => prev + 1);
        }, duration * 1000);
    };

    const handleProgressivePlay = () => {
        if (currentStage < playbackDurations.length && !isPlaying) {
            startProgressivePlayback();
        }
    };

    const normalizeString = (str: string): string => {
        return str
            .toLowerCase()
            .replace(/\([^)]*\)/g, "")
            .replace(/\[[^\]]*\]/g, "")
            .replace(/\{[^}]*\}/g, "")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    };

    const submitGuess = () => {
        if (
            !gameState.userGuess.trim() ||
            (!gameState.currentSongTitle && !gameState.currentArtist)
        )
            return;

        const normalizedGuess = normalizeString(gameState.userGuess);
        let isCorrect = false;

        if (gameMode === GameMode.CLASSIC) {
            const normalizedTitle = normalizeString(gameState.currentSongTitle);
            isCorrect = normalizedGuess === normalizedTitle;
        } else if (gameMode === GameMode.ARTIST) {
            const normalizedArtist = normalizeString(gameState.currentArtist);
            isCorrect = normalizedGuess === normalizedArtist;
        }

        const effectiveStage = Math.max(1, currentStage);
        const points = isCorrect
            ? Math.min(Math.max(1, 5 - (effectiveStage - 1)), 5)
            : 0;

        widget?.seekTo(playbackStartTime * 1000);
        widget?.pause();

        setGameState((prev) => ({
            ...prev,
            guessResult: isCorrect ? "correct" : "incorrect",
            hasGuessed: true,
            score: prev.score + points,
        }));
    };

    const revealAnswer = () => {
        setGameState((prev) => ({
            ...prev,
            guessResult: "revealed",
            hasGuessed: true,
        }));
    };

    const nextRound = useCallback(() => {
        if (gameState.currentRound >= gameState.totalRounds) {
            setGameState((prev) => ({ ...prev, gameStatus: "finished" }));
        } else {
            if (
                (gameState.alreadyPlayedSongIds?.size || 0) >=
                (playlist_data?.songIds?.length || 0)
            ) {
                setGameState((prev) => ({
                    ...prev,
                    gameStatus: "finished",
                    totalRounds: prev.alreadyPlayedSongIds?.size || 0,
                }));
            } else {
                setGameState((prev) => ({
                    ...prev,
                    currentRound: prev.currentRound + 1,
                }));
                startNewRound();
            }
        }
    }, [
        gameState.alreadyPlayedSongIds?.size,
        gameState.currentRound,
        gameState.totalRounds,
        playlist_data?.songIds?.length,
        startNewRound,
    ]);

    const resetGame = () => {
        setGameState({
            currentRound: 1,
            totalRounds:
                (playlist_data?.songCount || 0) > 10
                    ? 10
                    : playlist_data?.songCount || 0,
            score: 0,
            currentSongId: null,
            currentSongTitle: "",
            currentArtist: "",
            userGuess: "",
            guessResult: null,
            hasGuessed: false,
            gameStatus: "setup",
            roundStartTime: Date.now(),
        });
        setCurrentStage(0);
        setIsPlaying(false);
        setWidget(null);
        setIsWidgetReady(false);
        setFailedSongIds(new Set());
        setIsSelectingNewSong(false);
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

    const getCorrectAnswer = () => {
        switch (gameMode) {
            case GameMode.CLASSIC:
                return gameState.currentSongTitle;
            case GameMode.ARTIST:
                return gameState.currentArtist;
            default:
                return gameState.currentSongTitle;
        }
    };

    React.useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "Enter" && gameState.hasGuessed) {
                nextRound();
            }
        };

        document.addEventListener("keydown", handleKeyPress);
        return () => document.removeEventListener("keydown", handleKeyPress);
    }, [gameState.hasGuessed, nextRound]);

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
                            Score: {gameState.score}
                        </span>
                        <span className="bg-[var(--card)] px-4 py-2 rounded-lg border border-[var(--border)] text-md">
                            {gameMode.charAt(0).toUpperCase() +
                                gameMode.slice(1)}{" "}
                            Mode
                        </span>
                    </div>
                    <p className="text-sm mt-3 text-[var(--text-secondary)]">
                        Playlist:{" "}
                        {isLoading
                            ? "Loading..."
                            : playlist_data?.name || "Unknown"}
                    </p>
                </div>

                {!localStorage.getItem("token") && (
                    <div className="mb-4 text-center">
                        <div className="bg-yellow-200 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg inline-block">
                            🎮 Playing as Guest -
                            <Link href="/auth/login" className="underline ml-1">
                                Login
                            </Link>{" "}
                            to save your progress!
                        </div>
                    </div>
                )}

                {/* Game Setup */}
                {gameState.gameStatus === "setup" && (
                    <div className="text-center mb-6">
                        {sessionError && (
                            <Card variant="accent" className="mb-6 text-center">
                                <div className="text-4xl mb-4">⚠️</div>
                                <h3 className="text-xl font-bold mb-2">
                                    Session Error
                                </h3>
                                <p className="text-sm mb-4">{sessionError}</p>
                                <Button
                                    label="Retry"
                                    onClick={() => {
                                        setSessionError(null);
                                        createGameSession();
                                    }}
                                    variant="primary"
                                />
                            </Card>
                        )}
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
                            label={
                                isLoading
                                    ? "Loading Playlist..."
                                    : playlist_data?.songCount === 0
                                    ? "No Songs Available"
                                    : "Start Game"
                            }
                            onClick={startNewRound}
                            disabled={!playlist_data}
                            variant="accent"
                            className="text-lg px-8 py-4"
                        />
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
                                    Final Score: {gameState.score}/
                                    {gameState.totalRounds * 5}
                                </p>
                                <div className="w-full bg-[var(--border)] rounded-full h-3 mb-3">
                                    <div
                                        className="bg-[var(--accent)] h-3 rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${
                                                (gameState.score /
                                                    (gameState.totalRounds *
                                                        5)) *
                                                100
                                            }%`,
                                        }}
                                    ></div>
                                </div>
                                <p className="text-lg">
                                    You scored{" "}
                                    {Math.round(
                                        (gameState.score /
                                            (gameState.totalRounds * 5)) *
                                            100
                                    )}
                                    %
                                </p>
                            </div>

                            <Card variant="secondary" className="mb-6">
                                <p className="text-lg">
                                    {gameState.score /
                                        (gameState.totalRounds * 5) >=
                                    0.8
                                        ? "🌟 Outstanding performance!"
                                        : gameState.score /
                                              (gameState.totalRounds * 5) >=
                                          0.6
                                        ? "🎯 Great job!"
                                        : gameState.score /
                                              (gameState.totalRounds * 5) >=
                                          0.4
                                        ? "👍 Good effort!"
                                        : "📚 Keep practicing!"}
                                </p>
                            </Card>
                        </Card>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8 items-center justify-center">
                            <Button
                                label="Play Again"
                                onClick={resetGame}
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
                    gameState.currentSongId && (
                        <div className="space-y-6">
                            {/* Progress Indicator */}
                            <Card className="p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium">
                                        Hints Used:
                                    </span>
                                    <span className="text-sm bg-[var(--accent)] text-white px-2 py-1 rounded">
                                        {currentStage}/
                                        {playbackDurations.length}
                                    </span>
                                </div>
                                <div className="flex space-x-1">
                                    {playbackDurations.map(
                                        (duration, index) => (
                                            <div
                                                key={index}
                                                className={`flex-1 h-3 rounded ${
                                                    index < currentStage
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
                            {songData && (
                                <Card variant="secondary">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <span className="text-2xl">🎵</span>
                                            Audio Player
                                        </h3>
                                        <iframe
                                            ref={iframeRef}
                                            src={extractSoundCloudURL(
                                                songData.soundcloudUrl
                                            )}
                                            width="100%"
                                            height={
                                                gameState.hasGuessed
                                                    ? "166"
                                                    : "1"
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
                                                    {retryCount <
                                                    MAX_RETRIES ? (
                                                        <Button
                                                            label={`Retry (${
                                                                retryCount + 1
                                                            }/${
                                                                MAX_RETRIES + 1
                                                            })`}
                                                            onClick={
                                                                retryWidgetInit
                                                            }
                                                            variant="secondary"
                                                        />
                                                    ) : (
                                                        <p className="text-red-500 text-sm">
                                                            Selecting different
                                                            song...
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    {!isWidgetReady &&
                                                    !widgetError ? (
                                                        <div className="py-4">
                                                            <div className="text-4xl mb-3 animate-spin">
                                                                🎧
                                                            </div>
                                                            <p className="mb-4">
                                                                Loading song...
                                                            </p>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-[var(--accent)] h-2 rounded-full animate-pulse"
                                                                    style={{
                                                                        width: `${Math.min(
                                                                            100,
                                                                            (retryCount +
                                                                                1) *
                                                                                25
                                                                        )}%`,
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                            <Button
                                                                label={
                                                                    isPlaying
                                                                        ? `Playing (${playbackDurations[currentStage]}s)...`
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
                                                                                  currentStage -
                                                                                      1
                                                                              ] ||
                                                                              playbackDurations[0]
                                                                          }s)`
                                                                }
                                                                onClick={
                                                                    repeatCurrentStage
                                                                }
                                                                disabled={
                                                                    !isWidgetReady
                                                                }
                                                                variant="secondary"
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Guessing Interface */}
                            {(gameState.currentSongTitle ||
                                gameState.currentArtist) && (
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
                                                        userGuess:
                                                            e.target.value,
                                                    }))
                                                }
                                                onKeyPress={(e) =>
                                                    e.key === "Enter" &&
                                                    submitGuess()
                                                }
                                            />
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <Button
                                                    label="Submit Guess"
                                                    onClick={submitGuess}
                                                    disabled={
                                                        !gameState.userGuess.trim()
                                                    }
                                                    variant="accent"
                                                    className="flex-1"
                                                />
                                                <Button
                                                    label="Reveal Answer"
                                                    onClick={revealAnswer}
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
                                                        <p className="text-green-700 text-sm">
                                                            +
                                                            {Math.min(
                                                                Math.max(
                                                                    1,
                                                                    5 -
                                                                        (Math.max(
                                                                            1,
                                                                            currentStage
                                                                        ) -
                                                                            1)
                                                                ),
                                                                5
                                                            )}{" "}
                                                            points
                                                        </p>
                                                        <p className="text-green-700 mt-2">
                                                            <strong>
                                                                {
                                                                    gameState.currentSongTitle
                                                                }
                                                            </strong>{" "}
                                                            by{" "}
                                                            <strong>
                                                                {
                                                                    gameState.currentArtist
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
                                                        <p className="text-red-700 text-sm">
                                                            Correct answer:{" "}
                                                            <strong>
                                                                {getCorrectAnswer()}
                                                            </strong>
                                                        </p>
                                                        <p className="text-red-700 text-xs mt-2">
                                                            <strong>
                                                                {
                                                                    gameState.currentSongTitle
                                                                }
                                                            </strong>{" "}
                                                            by{" "}
                                                            <strong>
                                                                {
                                                                    gameState.currentArtist
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
                                                        <p className="text-yellow-700 text-sm">
                                                            The answer was:{" "}
                                                            <strong>
                                                                {getCorrectAnswer()}
                                                            </strong>
                                                        </p>
                                                        <p className="text-yellow-700 text-xs mt-2">
                                                            <strong>
                                                                {
                                                                    gameState.currentSongTitle
                                                                }
                                                            </strong>{" "}
                                                            by{" "}
                                                            <strong>
                                                                {
                                                                    gameState.currentArtist
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
                                                    onClick={nextRound}
                                                    variant="accent"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Loading States */}
                            {(isSongLoading || isSelectingNewSong) && (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4 animate-spin">
                                        🎵
                                    </div>
                                    <p className="text-lg">
                                        {isSelectingNewSong
                                            ? "Finding new song..."
                                            : "Loading song..."}
                                    </p>
                                </div>
                            )}

                            {songError && !isSelectingNewSong && (
                                <div className="text-center py-8 text-red-500">
                                    <p>Switching to different song...</p>
                                </div>
                            )}
                        </div>
                    )}
            </div>
            <FloatingNotesBackground />
        </div>
    );
};

export default GameEngine;
