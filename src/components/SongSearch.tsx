"use client";
import React, { useState } from "react";
import Button from "@/components/button";
import Card from "@/components/card";
import { Difficulty } from "@/util/enums/Difficulty";
import {
    isValidSoundCloudUrl,
    convertToEmbedUrl,
    extractSoundCloudURL,
} from "@/util/SCUtils";
import { SoundCloudSound } from "@/util/interfaces/SoundCloudSound";
import { ISong } from "@/database/schemas/Song";

type SoundCloudWidget = {
    play: () => void;
    pause: () => void;
    toggle: () => void;
    seekTo: (milliseconds: number) => void;
    setVolume: (volume: number) => void;
    next: () => void;
    prev: () => void;
    skip: (soundIndex: number) => void;
    getCurrentSound: (
        callback: (sound: SoundCloudSound | null) => void
    ) => void;
    bind: (eventName: string, callback: () => void) => void;
};

declare global {
    interface Window {
        SC: {
            Widget: (element: HTMLIFrameElement | string) => SoundCloudWidget;
        };
    }
}

interface SongSearchProps {
    onSongAdd: (song: Partial<ISong>) => void;
    onClose: () => void;
}

const SongSearch: React.FC<SongSearchProps> = ({ onSongAdd, onClose }) => {
    const [soundcloudUrl, setSoundcloudUrl] = useState("");
    const [songDetails, setSongDetails] = useState<Partial<ISong>>({
        difficulty: Difficulty.MEDIUM,
        title: "",
        artist: "",
        genres: [],
        startingOffset: 0,
    });
    const [currentGenre, setCurrentGenre] = useState("");
    const [isValidUrl, setIsValidUrl] = useState(false);
    const [widget, setWidget] = useState<SoundCloudWidget | null>(null);
    const [isWidgetReady, setIsWidgetReady] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState("");
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

    React.useEffect(() => {
        if (!window.SC) {
            const script = document.createElement("script");
            script.src = "https://w.soundcloud.com/player/api.js";
            script.async = true;
            script.onload = () => {
                setIsWidgetReady(true);
                initializeWidget();
            };
            document.head.appendChild(script);
        }
    }, []);

    const validateSoundCloudUrl = (url: string): boolean => {
        return isValidSoundCloudUrl(url);
    };

    const handleUrlChange = (url: string) => {
        setSoundcloudUrl(extractSoundCloudURL(url).trim());
        url = extractSoundCloudURL(url).trim();
        const valid = validateSoundCloudUrl(url);
        setIsValidUrl(valid);

        if (valid) {
            setWidget(null);
            setIsWidgetReady(false);
            setSongDetails((prev) => ({
                ...prev,
                title: "",
                artist: "",
            }));
        }
    };

    const handleDetailChange = (field: keyof ISong, value: unknown) => {
        setSongDetails({
            ...songDetails,
            [field]: value,
        });
    };

    const addGenre = () => {
        if (currentGenre.trim()) {
            const currentGenres = songDetails.genres || [];
            if (!currentGenres.includes(currentGenre.trim().toLowerCase())) {
                setSongDetails({
                    ...songDetails,
                    genres: [
                        ...currentGenres,
                        currentGenre.trim().toLowerCase(),
                    ],
                });
            }
            setCurrentGenre("");
        }
    };

    const removeGenre = (genreToRemove: string) => {
        const currentGenres = songDetails.genres || [];
        setSongDetails({
            ...songDetails,
            genres: currentGenres.filter((genre) => genre !== genreToRemove),
        });
    };

    const convertToApiUrl = (url: string): string => {
        try {
            if (url.includes("api.soundcloud.com/tracks/")) {
                return url;
            }

            return convertToEmbedUrl(url);
        } catch {
            return url;
        }
    };

    const handleAddSong = () => {
        try {
            if (!isValidUrl || !soundcloudUrl.trim()) {
                alert("Please enter a valid SoundCloud URL");
                return;
            }

            if (!songDetails.title?.trim()) {
                alert("Please enter a song title");
                return;
            }

            const processedUrl = convertToApiUrl(soundcloudUrl);

            const song: Partial<ISong> = {
                soundcloudUrl: processedUrl,
                title: songDetails.title?.trim(),
                artist: songDetails.artist?.trim(),
                difficulty: songDetails.difficulty || Difficulty.MEDIUM,
                startingOffset: songDetails.startingOffset || 0,
                releaseYear: songDetails.releaseYear,
                genres: songDetails.genres || [],
                mood: songDetails.mood?.trim() || undefined,
                energy: songDetails.energy,
                popularityRange: songDetails.popularityRange,
            };

            onSongAdd(song);

            setSoundcloudUrl("");
            setSongDetails({
                difficulty: Difficulty.MEDIUM,
                title: "",
                artist: "",
                genres: [],
                startingOffset: 0,
            });
            setCurrentGenre("");
            setIsValidUrl(false);
        } catch (error) {
            console.error("Error adding song:", error);
            alert("An error occurred while adding the song.");
        }
    };

    const initializeWidget = React.useCallback(() => {
        if (iframeRef.current && window.SC && !widget) {
            console.log("Initializing widget...");
            const widgetInstance = window.SC.Widget(iframeRef.current);
            setWidget(widgetInstance);

            widgetInstance.bind("ready", () => {
                console.log("Widget ready!");
                setIsWidgetReady(true);
            });

            setTimeout(() => {
                widgetInstance.getCurrentSound(
                    (sound: SoundCloudSound | null) => {
                        if (sound) {
                            setSongDetails((prev) => ({
                                ...prev,
                                title: sound.title || prev.title,
                                artist: sound.user?.username || prev.artist,
                            }));
                        } else {
                            console.warn("No current sound found");
                        }
                    }
                );
            }, 0);
        }
    }, [isWidgetReady, widget]);

    const parseJsonInput = () => {
        if (!jsonInput.trim()) {
            setJsonError("Please enter JSON data");
            return;
        }

        let cleanedJson = jsonInput.trim();

        try {
            if (
                cleanedJson.startsWith("{") &&
                !cleanedJson.match(/"[\w]+"\s*:/)
            ) {
                const stringValues: string[] = [];
                const stringPlaceholder = "___STRING_PLACEHOLDER___";

                cleanedJson = cleanedJson.replace(
                    /'([^'\\]*(\\.[^'\\]*)*)'/g,
                    (match, content) => {
                        stringValues.push(content);
                        return `"${stringPlaceholder}${
                            stringValues.length - 1
                        }"`;
                    }
                );

                cleanedJson = cleanedJson.replace(
                    /"([^"\\]*(\\.[^"\\]*)*)"/g,
                    (match, content) => {
                        if (!content.includes(stringPlaceholder)) {
                            stringValues.push(content);
                            return `"${stringPlaceholder}${
                                stringValues.length - 1
                            }"`;
                        }
                        return match;
                    }
                );

                cleanedJson = cleanedJson
                    .replace(/(\w+)\s*:/g, '"$1":')
                    .replace(/Difficulty\.(\w+)/g, '"$1"')
                    .replace(/:\s*"(true|false)"/g, ": $1")
                    .replace(/:\s*"(\d+)"/g, ": $1");

                stringValues.forEach((value, index) => {
                    const placeholder = `"${stringPlaceholder}${index}"`;
                    const escapedValue = value.replace(/"/g, '\\"');
                    cleanedJson = cleanedJson.replace(
                        placeholder,
                        `"${escapedValue}"`
                    );
                });
            }

            const parsedData = JSON.parse(cleanedJson);

            if (
                parsedData.difficulty &&
                typeof parsedData.difficulty === "string"
            ) {
                const difficultyValue = parsedData.difficulty.toLowerCase();
                const difficultyMap: { [key: string]: Difficulty } = {
                    easy: Difficulty.EASY,
                    medium: Difficulty.MEDIUM,
                    hard: Difficulty.HARD,
                    EASY: Difficulty.EASY,
                    MEDIUM: Difficulty.MEDIUM,
                    HARD: Difficulty.HARD,
                };

                if (difficultyMap[parsedData.difficulty]) {
                    parsedData.difficulty =
                        difficultyMap[parsedData.difficulty];
                } else {
                    const enumValue = Object.values(Difficulty).find(
                        (value) => value.toLowerCase() === difficultyValue
                    );
                    if (enumValue) {
                        parsedData.difficulty = enumValue;
                    } else {
                        parsedData.difficulty = Difficulty.MEDIUM;
                        console.warn(
                            `Unknown difficulty "${parsedData.difficulty}", defaulting to MEDIUM`
                        );
                    }
                }
            }

            const newSongDetails: Partial<ISong> = {
                title: parsedData.title || songDetails.title,
                artist: parsedData.artist || songDetails.artist,
                difficulty: parsedData.difficulty || songDetails.difficulty,
                releaseYear: parsedData.releaseYear || songDetails.releaseYear,
                genres: Array.isArray(parsedData.genres)
                    ? parsedData.genres
                    : songDetails.genres || [],
                mood: parsedData.mood || songDetails.mood,
                energy: parsedData.energy || songDetails.energy,
                popularityRange:
                    parsedData.popularityRange || songDetails.popularityRange,
                startingOffset:
                    parsedData.startingOffset ||
                    songDetails.startingOffset ||
                    0,
            };

            setSongDetails(newSongDetails);
            setJsonInput("");
            setJsonError("");
            console.log("Successfully imported JSON data:", newSongDetails);
        } catch (error) {
            setJsonError(
                `Invalid JSON format: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
            console.error("JSON parsing error:", error);
            console.log("Attempted to parse:", cleanedJson);
        }
    };

    const clearJsonInput = () => {
        setJsonInput("");
        setJsonError("");
    };

    return (
        <div className="p-6 space-y-6 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text)]">
                    🎵 Add New Song
                </h2>
                <Button
                    label="✕"
                    onClick={onClose}
                    variant="secondary"
                    className="!p-2 !text-lg"
                />
            </div>

            {/* JSON Import Section */}
            <Card variant="secondary">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text)]">
                        📋 Import from JSON
                    </h3>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                            Paste JSON Data
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                setJsonError("");
                            }}
                            className="w-full p-3 rounded-lg h-32 font-mono text-sm"
                            style={{
                                backgroundColor: "var(--primary)",
                                color: "var(--text)",
                                border: jsonError
                                    ? "2px solid red"
                                    : "1px solid var(--accent)",
                            }}
                            placeholder={`{
  "title": "Time",
  "artist": "Hans Zimmer",
  "difficulty": "MEDIUM",
  "releaseYear": 2010,
  "genres": ["soundtrack", "orchestral", "cinematic"],
  "mood": "epic",
  "energy": "medium",
  "popularityRange": "mainstream"
}`}
                        />
                        {jsonError && (
                            <p className="text-red-500 text-sm mt-2">
                                ❌ {jsonError}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Import JSON"
                            onClick={parseJsonInput}
                            variant="accent"
                            disabled={!jsonInput.trim()}
                        />
                        <Button
                            label="Clear"
                            onClick={clearJsonInput}
                            variant="secondary"
                            disabled={!jsonInput.trim()}
                        />
                    </div>
                </div>
            </Card>

            <Card variant="primary">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                            SoundCloud URL *
                        </label>
                        <input
                            type="url"
                            value={soundcloudUrl}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            className={`w-full p-3 rounded-lg border-2 transition-colors ${
                                soundcloudUrl.trim() === ""
                                    ? "border-gray-300"
                                    : isValidUrl
                                    ? "border-green-500 bg-green-50"
                                    : "border-red-500 bg-red-50"
                            }`}
                            style={{
                                backgroundColor:
                                    soundcloudUrl.trim() === ""
                                        ? "var(--primary)"
                                        : isValidUrl
                                        ? "var(--primary)"
                                        : "var(--secondary)",
                                color: "var(--text)",
                            }}
                            placeholder="Paste any SoundCloud URL here (https://w.soundcloud.com/player/?url=...)"
                        />
                        <div className="mt-2 text-sm">
                            {soundcloudUrl.trim() === "" && (
                                <p className="text-[var(--text-secondary)]">
                                    ℹ️ Supported formats:
                                </p>
                            )}
                            {soundcloudUrl.trim() === "" && (
                                <ul className="text-[var(--text-secondary)] list-disc list-inside mt-1 space-y-1">
                                    <li>
                                        Embed URLs:{" "}
                                        <code>
                                            https://w.soundcloud.com/player/?url=...
                                        </code>
                                    </li>
                                </ul>
                            )}
                            {soundcloudUrl.trim() !== "" && isValidUrl && (
                                <div>
                                    <p className="text-green-600">
                                        ✅ Valid SoundCloud URL detected
                                    </p>

                                    <iframe
                                        ref={iframeRef}
                                        width="100%"
                                        height="166"
                                        allow="autoplay"
                                        className="mt-2"
                                        src={`${soundcloudUrl}`}
                                        onLoad={() => {
                                            if (window.SC) {
                                                setTimeout(() => {
                                                    initializeWidget();
                                                }, 1000);
                                            }
                                        }}
                                    ></iframe>
                                </div>
                            )}
                            {soundcloudUrl.trim() !== "" && !isValidUrl && (
                                <p className="text-red-600">
                                    ❌ Invalid SoundCloud URL format
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={songDetails.title || ""}
                                onChange={(e) =>
                                    handleDetailChange("title", e.target.value)
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                                placeholder="Song title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Artist
                            </label>
                            <input
                                type="text"
                                value={songDetails.artist || ""}
                                onChange={(e) =>
                                    handleDetailChange("artist", e.target.value)
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                                placeholder="Artist name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Difficulty
                            </label>
                            <select
                                value={
                                    songDetails.difficulty || Difficulty.MEDIUM
                                }
                                onChange={(e) =>
                                    handleDetailChange(
                                        "difficulty",
                                        e.target.value as Difficulty
                                    )
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                            >
                                {Object.values(Difficulty).map((diff) => (
                                    <option key={diff} value={diff}>
                                        {diff.charAt(0).toUpperCase() +
                                            diff.slice(1).toLowerCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Release Year
                            </label>
                            <input
                                type="number"
                                min="1900"
                                max="2030"
                                value={songDetails.releaseYear || ""}
                                onChange={(e) =>
                                    handleDetailChange(
                                        "releaseYear",
                                        e.target.value
                                            ? parseInt(e.target.value)
                                            : undefined
                                    )
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                                placeholder="e.g., 2023"
                            />
                            <Button
                                label="Search Up"
                                variant="accent"
                                onClick={() => {
                                    const name = songDetails.title
                                        ? songDetails.title.trim()
                                        : "";
                                    const artist = songDetails.artist
                                        ? songDetails.artist.trim()
                                        : "";
                                    window.open(
                                        `https://www.google.com/search?q=${name}+${artist}+release+year`,
                                        "_blank"
                                    );
                                }}
                                className="mt-4"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Starting Offset (seconds)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="3600"
                                step="0.1"
                                value={songDetails.startingOffset || 0}
                                onChange={(e) =>
                                    handleDetailChange(
                                        "startingOffset",
                                        e.target.value
                                            ? parseFloat(e.target.value)
                                            : 0
                                    )
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                                placeholder="0"
                            />
                            <Button
                                label="Test Offset"
                                variant="accent"
                                onClick={() => {
                                    if (songDetails.startingOffset) {
                                        if (widget) {
                                            widget.seekTo(
                                                songDetails.startingOffset *
                                                    1000
                                            );
                                            widget.play();
                                        } else {
                                            console.error(
                                                "Widget not initialized"
                                            );
                                        }
                                    }
                                }}
                                className="mt-4"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Mood
                            </label>
                            <input
                                type="text"
                                value={songDetails.mood || ""}
                                onChange={(e) =>
                                    handleDetailChange("mood", e.target.value)
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                                placeholder="e.g., happy, melancholic, energetic"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Energy Level
                            </label>
                            <select
                                value={songDetails.energy || ""}
                                onChange={(e) =>
                                    handleDetailChange(
                                        "energy",
                                        e.target.value || undefined
                                    )
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                            >
                                <option value="">Select energy level</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Popularity Range
                            </label>
                            <select
                                value={songDetails.popularityRange || ""}
                                onChange={(e) =>
                                    handleDetailChange(
                                        "popularityRange",
                                        e.target.value || undefined
                                    )
                                }
                                className="w-full p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                            >
                                <option value="">Select popularity</option>
                                <option value="mainstream">Mainstream</option>
                                <option value="underground">Underground</option>
                                <option value="viral">Viral</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                            Genres
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={currentGenre}
                                onChange={(e) =>
                                    setCurrentGenre(e.target.value)
                                }
                                className="flex-1 p-3 rounded-lg"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text)",
                                }}
                                placeholder="Add a genre"
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addGenre();
                                    }
                                }}
                            />
                            <Button
                                label="Add"
                                onClick={addGenre}
                                variant="accent"
                                disabled={!currentGenre.trim()}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(songDetails.genres || []).map((genre, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                                    style={{
                                        backgroundColor: "var(--accent)",
                                        color: "var(--text)",
                                    }}
                                >
                                    {genre}
                                    <button
                                        onClick={() => removeGenre(genre)}
                                        className="ml-1 text-red-500 hover:text-red-700 font-bold"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex gap-4 justify-end">
                <Button label="Cancel" onClick={onClose} variant="secondary" />
                <Button
                    label="Add Song"
                    icon={<span>➕</span>}
                    onClick={handleAddSong}
                    variant="primary"
                    disabled={
                        !isValidUrl ||
                        !soundcloudUrl.trim() ||
                        !songDetails.title?.trim()
                    }
                />
            </div>
        </div>
    );
};

export default SongSearch;
