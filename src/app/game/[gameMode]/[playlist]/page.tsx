"use client";
import Button from "@/components/button";
import Card from "@/components/card";
import { IPlaylist } from "@/database/schemas/Playlist";
import { ISong } from "@/database/schemas/Song";
import { extractSoundCloudURL } from "@/util/SCUtils";
import { SoundCloudWidget } from "@/util/types/SoundCloudWidget";
import { redirect } from "next/navigation";
import React, { useCallback } from "react";
import useSWR from "swr";

interface GamePageProps {
    params: Promise<{
        gameMode: string;
        playlist: string;
    }>;
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

const GamePage = ({ params }: GamePageProps) => {
    const { gameMode, playlist } = React.use(params);
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

    const playbackDurations = [1, 3, 5, 10, 15];
    const decodedPlaylist = decodeURIComponent(playlist);

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
        playlist_data,
        gameState.currentSongId,
        isSelectingNewSong,
        failedSongIds,
    ]);

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
        songData,
        songError,
        isSongLoading,
        gameState.currentSongId,
        selectDifferentSong,
        isSelectingNewSong,
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

    const startNewRound = useCallback(() => {
        if (!playlist_data) return;

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
    ]);

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
        if (!gameState.userGuess.trim() || !gameState.currentSongTitle) return;

        const normalizedGuess = normalizeString(gameState.userGuess);
        const normalizedTitle = normalizeString(gameState.currentSongTitle);
        const isCorrect = normalizedGuess === normalizedTitle;

        const points = isCorrect ? Math.max(1, 6 - currentStage) : 0;

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
        <div className="min-h-screen p-6 max-w-4xl mx-auto">
            {/* Game Header */}
            <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold mb-2">🎵 Song Guesser</h1>
                <div className="flex justify-center items-center gap-6 text-lg">
                    <span>
                        Round {gameState.currentRound}/{gameState.totalRounds}
                    </span>
                    <span className="font-semibold">
                        Score: {gameState.score}
                    </span>
                    <span className="text-sm">
                        {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}{" "}
                        Mode
                    </span>
                </div>
                <p className="text-sm mt-1">
                    Playlist:{" "}
                    {isLoading
                        ? "Loading..."
                        : playlist_data?.name || "Unknown"}
                </p>
            </div>

            {/* Game Setup */}
            {gameState.gameStatus === "setup" && (
                <div className="text-center mb-6">
                    <Card variant="primary" className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">
                            Ready to Play?
                        </h2>
                        <p className="mb-4">
                            You&apos;ll hear song clips of increasing length.
                            Guess the song title for more points!
                        </p>
                        <p className="text-smmb-4">
                            Hint durations:{" "}
                            {playbackDurations.map((d) => `${d}s`).join(" → ")}
                        </p>
                    </Card>
                    <Button
                        label={
                            isLoading
                                ? "Loading Playlist..."
                                : playlist_data?.songCount === 0
                                ? "No Songs Available"
                                : "Start Game"
                        }
                        onClick={
                            isLoading
                                ? () => {}
                                : playlist_data?.songCount === 0
                                ? () => {
                                      redirect("/");
                                  }
                                : startNewRound
                        }
                        disabled={!playlist_data}
                    />
                </div>
            )}

            {/* Game Finished */}
            {gameState.gameStatus === "finished" && (
                <div className="text-center mb-6">
                    <Card variant="primary" className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">
                            🎉 Game Complete!
                        </h2>
                        <p className="text-xl mb-2">
                            Final Score: {gameState.score}/
                            {gameState.totalRounds * 5}
                        </p>
                        <p>
                            You scored{" "}
                            {Math.round(
                                (gameState.score /
                                    (gameState.totalRounds * 5)) *
                                    100
                            )}
                            %
                        </p>
                    </Card>
                    <div className="space-x-4">
                        <Button label="Play Again" onClick={resetGame} />
                        <Button
                            label="Choose Different Playlist"
                            onClick={() => window.history.back()}
                        />
                    </div>
                </div>
            )}

            {/* Active Game */}
            {gameState.gameStatus === "playing" && gameState.currentSongId && (
                <div className="space-y-6">
                    {/* Progress Indicator */}
                    <Card className="p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                                Hints Used:
                            </span>
                            <span className="text-sm">
                                {currentStage}/{playbackDurations.length}
                            </span>
                        </div>
                        <div className="flex space-x-1">
                            {playbackDurations.map((duration, index) => (
                                <div
                                    key={index}
                                    className={`flex-1 h-2 rounded ${
                                        index < currentStage
                                            ? "bg-[var(--accent)]"
                                            : index === currentStage &&
                                              isPlaying
                                            ? "bg-[var(--secondary)] animate-pulse"
                                            : "bg-gray-300"
                                    }`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                            {playbackDurations.map((duration, index) => (
                                <span key={index}>{duration}s</span>
                            ))}
                        </div>
                    </Card>

                    {/* Audio Player */}
                    {songData && (
                        <Card variant="secondary">
                            <div className={gameState.hasGuessed ? "" : "mb-4"}>
                                <iframe
                                    ref={iframeRef}
                                    src={extractSoundCloudURL(
                                        songData.soundcloudUrl
                                    )}
                                    width="100%"
                                    height={`${
                                        gameState.hasGuessed ? 166 : 1
                                    }px`}
                                    allow="autoplay"
                                    className={`rounded ${
                                        gameState.hasGuessed
                                            ? ""
                                            : "opacity-0 pointer-events-none"
                                    }`}
                                />
                            </div>

                            {/* Playback Controls */}
                            {gameState.hasGuessed ? (
                                <></>
                            ) : (
                                <div className="text-center">
                                    {widgetError ? (
                                        <div className="space-y-3">
                                            <p className="text-red-500 text-sm">
                                                {widgetError}
                                            </p>
                                            {retryCount < MAX_RETRIES ? (
                                                <Button
                                                    label={`Retry (${
                                                        retryCount + 1
                                                    }/${MAX_RETRIES + 1})`}
                                                    onClick={retryWidgetInit}
                                                />
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-red-500 text-sm">
                                                        Selecting different
                                                        song...
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <Button
                                                label={
                                                    !isWidgetReady &&
                                                    !widgetError
                                                        ? "Loading..."
                                                        : isPlaying
                                                        ? `Playing (${playbackDurations[currentStage]}s)...`
                                                        : getStageButtonText()
                                                }
                                                onClick={handleProgressivePlay}
                                                disabled={
                                                    isPlaying ||
                                                    currentStage >=
                                                        playbackDurations.length ||
                                                    !isWidgetReady
                                                }
                                                className="mb-4"
                                            />
                                            {!isWidgetReady && !widgetError && (
                                                <div className="mt-2">
                                                    {/* <p className="text-sm">
                                                        {isSelectingNewSong
                                                            ? "Finding new song..."
                                                            : "Preparing audio player..."}
                                                    </p>
                                                    <Button
                                                        label="Manual Retry"
                                                        onClick={
                                                            retryWidgetInit
                                                        }
                                                    /> */}
                                                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                                                        <div
                                                            className="bg-[var(--accent)] h-1 rounded-full animate-pulse"
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
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Guessing Interface */}
                    {gameState.currentSongTitle && (
                        <Card variant="secondary">
                            <h3 className="text-lg font-semibold mb-4">
                                What&apos;s this song?
                            </h3>

                            {!gameState.hasGuessed ? (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Enter your guess..."
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={gameState.userGuess}
                                        onChange={(e) =>
                                            setGameState((prev) => ({
                                                ...prev,
                                                userGuess: e.target.value,
                                            }))
                                        }
                                        onKeyPress={(e) =>
                                            e.key === "Enter" && submitGuess()
                                        }
                                    />
                                    <div className="flex space-x-3">
                                        <Button
                                            label="Submit Guess"
                                            onClick={submitGuess}
                                            disabled={
                                                !gameState.userGuess.trim()
                                            }
                                        />
                                        <Button
                                            label="Reveal Answer"
                                            onClick={revealAnswer}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Result Display */}
                                    <div
                                        className={`p-4 rounded-lg ${
                                            gameState.guessResult === "correct"
                                                ? "bg-green-100 border-green-300"
                                                : gameState.guessResult ===
                                                  "incorrect"
                                                ? "bg-red-100 border-red-300"
                                                : "bg-yellow-100 border-yellow-300"
                                        }`}
                                    >
                                        {gameState.guessResult === "correct" ? (
                                            <div>
                                                <p className="font-semibold text-green-800">
                                                    🎉 Correct!
                                                </p>
                                                <p className="text-green-700">
                                                    +
                                                    {Math.max(
                                                        1,
                                                        6 - currentStage
                                                    )}{" "}
                                                    points • The song is:{" "}
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
                                            <div>
                                                <p className="font-semibold text-red-800">
                                                    ❌ Incorrect
                                                </p>
                                                <p className="text-red-700">
                                                    Your guess:{" "}
                                                    <em>
                                                        {gameState.userGuess}
                                                    </em>
                                                    <br />
                                                    Correct answer:{" "}
                                                    <strong>
                                                        {
                                                            gameState.currentSongTitle
                                                        }
                                                    </strong>
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-semibold text-yellow-800">
                                                    🔍 Answer Revealed
                                                </p>
                                                <p className="text-yellow-700">
                                                    The song was:{" "}
                                                    <strong>
                                                        {
                                                            gameState.currentSongTitle
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
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Loading States */}
                    {(isSongLoading || isSelectingNewSong) && (
                        <div className="text-center py-8">
                            <p>
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
    );
};

export default GamePage;
