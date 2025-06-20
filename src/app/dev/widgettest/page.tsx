"use client";
import { SoundCloudSound } from "@/util/interfaces/SoundCloudSound";
import { extractSoundCloudURL } from "@/util/SCUtils";
import { SoundCloudWidget } from "@/util/types/SoundCloudWidget";
import React from "react";

declare global {
    interface Window {
        SC: {
            Widget: (element: HTMLIFrameElement | string) => SoundCloudWidget;
        };
    }
}

const WidgetTest = () => {
    const [iframeUrl, setIframeUrl] = React.useState("");
    const [widget, setWidget] = React.useState<SoundCloudWidget | null>(null);
    const [currentStage, setCurrentStage] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackStartTime, setPlaybackStartTime] = React.useState(0);
    const [userGuess, setUserGuess] = React.useState("");
    const [currentSongTitle, setCurrentSongTitle] = React.useState("");
    const [guessResult, setGuessResult] = React.useState<
        "correct" | "incorrect" | "revealed" | null
    >(null);
    const [hasGuessed, setHasGuessed] = React.useState(false);
    const [isWidgetReady, setIsWidgetReady] = React.useState(false);
    const [debugInfo, setDebugInfo] = React.useState("");
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const playbackDurations = [0.5, 1, 3, 5, 10];

    React.useEffect(() => {
        if (!window.SC) {
            const script = document.createElement("script");
            script.src = "https://w.soundcloud.com/player/api.js";
            script.async = true;
            script.onload = () => {
                setDebugInfo((prev) => prev + "SoundCloud API loaded. ");
            };
            document.head.appendChild(script);
        }
    }, []);

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const url = extractSoundCloudURL(event.target.value);
        setIframeUrl(url);
        resetGuessState();
        setWidget(null);
        setIsWidgetReady(false);
        setDebugInfo("");
    };

    const resetGuessState = () => {
        setUserGuess("");
        setGuessResult(null);
        setHasGuessed(false);
        setCurrentSongTitle("");
    };

    const fetchCurrentSongInfo = React.useCallback(() => {
        if (widget && isWidgetReady) {
            setDebugInfo((prev) => prev + "Fetching song info... ");
            widget.getCurrentSound((sound: SoundCloudSound | null) => {
                setDebugInfo(
                    (prev) =>
                        prev +
                        `Got sound: ${
                            sound ? sound.title || "No title" : "No sound"
                        }. `
                );
                if (sound && sound.title) {
                    setCurrentSongTitle(sound.title);
                    setDebugInfo(
                        (prev) => prev + `Song title set: ${sound.title}. `
                    );
                }
            });
        } else {
            if (!widget) {
                setDebugInfo((prev) => prev + "Widget not initialized. ");
            }
            if (!isWidgetReady) {
                setDebugInfo((prev) => prev + "Widget not ready. ");
            }
        }
    }, [widget, isWidgetReady]);

    const normalizeString = (str: string): string => {
        return str
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    };

    const checkGuess = () => {
        if (!userGuess.trim() || !currentSongTitle) {
            return;
        }

        const normalizedGuess = normalizeString(userGuess);
        const normalizedTitle = normalizeString(currentSongTitle);

        const isCorrect = normalizedGuess === normalizedTitle;

        setGuessResult(isCorrect ? "correct" : "incorrect");
        setHasGuessed(true);
    };

    const handleGuessSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        checkGuess();
    };

    const handleGuessInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setUserGuess(event.target.value);
        if (hasGuessed) {
            setGuessResult(null);
            setHasGuessed(false);
        }
    };

    const initializeWidget = React.useCallback(() => {
        if (iframeRef.current && window.SC) {
            setDebugInfo((prev) => prev + "Initializing widget... ");
            const widgetInstance = window.SC.Widget(iframeRef.current);
            setWidget(widgetInstance);

            let readyFired = false;

            widgetInstance.bind("ready", () => {
                setDebugInfo((prev) => prev + "Widget ready event fired. ");
                readyFired = true;
                setIsWidgetReady(true);

                setTimeout(() => {
                    fetchCurrentSongInfo();
                }, 2000);
            });

            setTimeout(() => {
                if (!readyFired) {
                    setDebugInfo((prev) => prev + "Backup initialization... ");
                    setIsWidgetReady(true);
                    setTimeout(() => {
                        fetchCurrentSongInfo();
                    }, 500);
                }
            }, 3000);
        } else {
            setDebugInfo(
                (prev) => prev + "Widget init failed - no SC or iframe. "
            );
        }
    }, [fetchCurrentSongInfo]);

    const resetPlayback = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setCurrentStage(0);
        setIsPlaying(false);
        if (widget) {
            widget.pause();
            widget.seekTo(playbackStartTime * 1000);
        }
    };

    const startProgressivePlayback = () => {
        if (!widget || currentStage >= playbackDurations.length) return;

        const duration = playbackDurations[currentStage];
        setIsPlaying(true);

        widget.play();

        timeoutRef.current = setTimeout(() => {
            widget.pause();
            setIsPlaying(false);
            setCurrentStage((prev) => prev + 1);
        }, duration * 1000);
    };

    const handleProgressivePlay = () => {
        if (currentStage === 0) {
            if (widget) {
                widget.seekTo(playbackStartTime * 1000);
            }
        }

        if (currentStage < playbackDurations.length && !isPlaying) {
            if (widget) {
                widget.seekTo(playbackStartTime * 1000);
            }
            startProgressivePlayback();
        }
    };

    const handleSetStartTime = () => {
        const time = prompt("Enter start time in seconds:");
        if (time && !isNaN(Number(time))) {
            setPlaybackStartTime(Number(time));
            if (widget) {
                widget.seekTo(Number(time) * 1000);
            }
        }
    };

    const handlePlay = () => {
        if (widget) {
            widget.play();
        }
    };

    const handlePause = () => {
        if (widget) {
            widget.pause();
        }
    };

    const handleToggle = () => {
        if (widget) {
            widget.toggle();
        }
    };

    const revealAnswer = () => {
        setGuessResult("revealed");
        setHasGuessed(true);
    };

    const manualFetchSongInfo = () => {
        fetchCurrentSongInfo();
    };

    React.useEffect(() => {
        if (iframeUrl && iframeRef.current) {
            const iframe = iframeRef.current;
            iframe.onload = () => {
                setDebugInfo((prev) => prev + "Iframe loaded. ");
                setTimeout(initializeWidget, 2000);
            };
        }
    }, [iframeUrl, initializeWidget]);

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const getStageButtonText = () => {
        if (currentStage >= playbackDurations.length) {
            return "Playback Complete";
        }

        if (currentStage === 0) {
            return `Start Progressive Playback (${playbackDurations[0]}s)`;
        }

        return `Continue (${playbackDurations[currentStage]}s)`;
    };

    const getProgressInfo = () => {
        if (currentStage === 0) {
            return "Ready to start progressive playback";
        }

        if (currentStage >= playbackDurations.length) {
            return "All stages completed!";
        }

        const completedDurations = playbackDurations.slice(0, currentStage);

        return `Completed: ${completedDurations
            .map((d) => `${d}s`)
            .join(", ")}`;
    };

    return (
        <div
            className="min-h-screen p-6"
            style={{ background: "var(--background)", color: "var(--text)" }}
        >
            <h1
                className="text-2xl font-bold mb-4"
                style={{ color: "var(--text)" }}
            >
                SoundCloud Widget Test - Progressive Playback
            </h1>

            {/* Debug Information */}
            <div
                className="mb-4 p-3 rounded border"
                style={{
                    background: "var(--primary)",
                    borderColor: "var(--secondary)",
                    color: "var(--text)",
                }}
            >
                <h3 className="font-semibold text-sm">Debug Info:</h3>
                <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                >
                    {debugInfo || "No debug info yet..."}
                </p>
                <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Widget ready: {isWidgetReady ? "Yes" : "No"} | Current song
                    title: {currentSongTitle || "None"}
                </p>
                <button
                    onClick={manualFetchSongInfo}
                    className="mt-2 px-3 py-1 text-xs rounded font-medium transition-colors hover:opacity-80"
                    style={{
                        background: "var(--accent)",
                        color: "var(--text)",
                    }}
                >
                    Manually Fetch Song Info
                </button>
            </div>

            <input
                type="text"
                placeholder="Enter SoundCloud IFrame URL"
                className="w-full p-2 border rounded mb-4 transition-colors focus:outline-none focus:ring-2"
                style={
                    {
                        background: "var(--background)",
                        borderColor: "var(--secondary)",
                        color: "var(--text)",
                        "--tw-ring-color": "var(--accent)",
                    } as React.CSSProperties
                }
                value={iframeUrl}
                onChange={handleUrlChange}
            />

            {/* Song Guessing Section */}
            {widget && currentSongTitle && (
                <div
                    className="mb-4 p-4 rounded border"
                    style={{
                        background: "var(--primary)",
                        borderColor: "var(--secondary)",
                    }}
                >
                    <h3
                        className="text-lg font-semibold mb-3"
                        style={{ color: "var(--text)" }}
                    >
                        Song Guessing Game
                    </h3>

                    <form onSubmit={handleGuessSubmit} className="space-y-3">
                        <div>
                            <input
                                type="text"
                                placeholder="What's the name of this song?"
                                className="w-full p-3 border rounded transition-colors focus:outline-none focus:ring-2"
                                style={
                                    {
                                        background: "var(--background)",
                                        borderColor: "var(--secondary)",
                                        color: "var(--text)",
                                        "--tw-ring-color": "var(--accent)",
                                    } as React.CSSProperties
                                }
                                value={userGuess}
                                onChange={handleGuessInputChange}
                                disabled={
                                    hasGuessed && guessResult === "correct"
                                }
                            />
                        </div>

                        <div className="flex space-x-2">
                            <button
                                type="submit"
                                disabled={
                                    !userGuess.trim() ||
                                    (hasGuessed && guessResult === "correct")
                                }
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    !userGuess.trim() ||
                                    (hasGuessed && guessResult === "correct")
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:opacity-80"
                                }`}
                                style={{
                                    background: "var(--accent)",
                                    color: "var(--text)",
                                }}
                            >
                                Submit Guess
                            </button>

                            <button
                                type="button"
                                onClick={revealAnswer}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "var(--secondary)",
                                    color: "var(--text)",
                                }}
                            >
                                Reveal Answer
                            </button>

                            <button
                                type="button"
                                onClick={resetGuessState}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "var(--text-secondary)",
                                    color: "var(--background)",
                                }}
                            >
                                New Guess
                            </button>
                        </div>
                    </form>

                    {/* Guess Result */}
                    {guessResult && (
                        <div
                            className={`mt-3 p-3 rounded border`}
                            style={{
                                background:
                                    guessResult === "correct"
                                        ? "rgba(34, 197, 94, 0.1)"
                                        : guessResult === "incorrect"
                                        ? "rgba(239, 68, 68, 0.1)"
                                        : "rgba(245, 158, 11, 0.1)",
                                borderColor:
                                    guessResult === "correct"
                                        ? "rgba(34, 197, 94, 0.3)"
                                        : guessResult === "incorrect"
                                        ? "rgba(239, 68, 68, 0.3)"
                                        : "rgba(245, 158, 11, 0.3)",
                                color: "var(--text)",
                            }}
                        >
                            {guessResult === "correct" ? (
                                <div>
                                    <p className="font-semibold">🎉 Correct!</p>
                                    <p
                                        className="text-sm"
                                        style={{
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        The song is:{" "}
                                        <strong
                                            style={{ color: "var(--text)" }}
                                        >
                                            {currentSongTitle}
                                        </strong>
                                    </p>
                                </div>
                            ) : guessResult === "incorrect" ? (
                                <div>
                                    <p className="font-semibold">
                                        ❌ Incorrect
                                    </p>
                                    <p
                                        className="text-sm"
                                        style={{
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        Try again or reveal the answer!
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-semibold">
                                        🔍 Answer Revealed
                                    </p>
                                    <p
                                        className="text-sm"
                                        style={{
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        The song was:{" "}
                                        <strong
                                            style={{ color: "var(--text)" }}
                                        >
                                            {currentSongTitle}
                                        </strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Show message when widget exists but no song title */}
            {widget && !currentSongTitle && (
                <div
                    className="mb-4 p-4 rounded border"
                    style={{
                        background: "var(--secondary)",
                        borderColor: "var(--accent)",
                        color: "var(--text)",
                    }}
                >
                    <p>
                        Widget is loaded but song information is not available
                        yet. Try clicking &quot;Manually Fetch Song Info&quot;
                        above or wait a moment.
                    </p>
                </div>
            )}

            {/* Progressive Playback Controls */}
            {widget && (
                <div className="mb-4 space-y-4">
                    <div
                        className="p-4 rounded border"
                        style={{
                            background: "var(--primary)",
                            borderColor: "var(--secondary)",
                        }}
                    >
                        <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: "var(--text)" }}
                        >
                            Progressive Playback
                        </h3>
                        <p
                            className="text-sm mb-2"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Sequence:{" "}
                            {playbackDurations
                                .map((duration, index) =>
                                    index === playbackDurations.length - 1
                                        ? `${duration}s`
                                        : `${duration}s → pause → `
                                )
                                .join("")}
                        </p>
                        <p
                            className="text-sm mb-3"
                            style={{ color: "var(--accent)" }}
                        >
                            {getProgressInfo()}
                        </p>

                        <div className="space-x-2 mb-2">
                            <button
                                onClick={handleProgressivePlay}
                                disabled={
                                    isPlaying ||
                                    currentStage >= playbackDurations.length
                                }
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    isPlaying ||
                                    currentStage >= playbackDurations.length
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:opacity-80"
                                }`}
                                style={{
                                    background: "var(--accent)",
                                    color: "var(--text)",
                                }}
                            >
                                {isPlaying
                                    ? `Playing (${playbackDurations[currentStage]}s)...`
                                    : getStageButtonText()}
                            </button>

                            <button
                                onClick={resetPlayback}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "var(--secondary)",
                                    color: "var(--text)",
                                }}
                            >
                                Reset
                            </button>

                            <button
                                onClick={handleSetStartTime}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "var(--text-secondary)",
                                    color: "var(--background)",
                                }}
                            >
                                Set Start Time
                            </button>
                        </div>

                        <p
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Start time: {playbackStartTime}s | Current stage:{" "}
                            {currentStage + 1}/{playbackDurations.length}
                        </p>
                    </div>

                    {/* Original Control Buttons */}
                    <div
                        className="p-4 rounded border"
                        style={{
                            background: "var(--primary)",
                            borderColor: "var(--secondary)",
                        }}
                    >
                        <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: "var(--text)" }}
                        >
                            Manual Controls
                        </h3>
                        <div className="space-x-2">
                            <button
                                onClick={handlePlay}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "rgba(34, 197, 94, 0.8)",
                                    color: "var(--background)",
                                }}
                            >
                                Play
                            </button>
                            <button
                                onClick={handlePause}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "rgba(239, 68, 68, 0.8)",
                                    color: "var(--background)",
                                }}
                            >
                                Pause
                            </button>
                            <button
                                onClick={handleToggle}
                                className="px-4 py-2 rounded font-medium transition-colors hover:opacity-80"
                                style={{
                                    background: "var(--accent)",
                                    color: "var(--text)",
                                }}
                            >
                                Toggle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="w-full h-64 border rounded overflow-hidden"
                style={{
                    borderColor: "var(--secondary)",
                }}
            >
                {iframeUrl && (
                    <iframe
                        ref={iframeRef}
                        src={iframeUrl}
                        width="100%"
                        height="100%"
                        id="soundcloud-widget"
                        allow="autoplay"
                    />
                )}
            </div>
        </div>
    );
};

export default WidgetTest;
