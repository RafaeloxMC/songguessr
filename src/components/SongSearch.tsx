"use client";
import React, { useState } from "react";
import Button from "@/components/button";
import Card from "@/components/card";
import { Difficulty } from "@/util/enums/Difficulty";
import {
    isValidSoundCloudUrl,
    convertToEmbedUrl,
    extractInfoFromSoundCloudUrl,
} from "@/util/SCUtils";

interface Song {
    soundcloudUrl: string;
    title?: string;
    artist?: string;
    difficulty: Difficulty;
    releaseYear?: number;
    genres?: string[];
    mood?: string;
    energy?: "low" | "medium" | "high";
    popularityRange?: "mainstream" | "underground" | "viral";
}

interface SongSearchProps {
    onSongAdd: (song: Song) => void;
    onClose: () => void;
}

const SongSearch: React.FC<SongSearchProps> = ({ onSongAdd, onClose }) => {
    const [soundcloudUrl, setSoundcloudUrl] = useState("");
    const [songDetails, setSongDetails] = useState<Partial<Song>>({
        difficulty: Difficulty.MEDIUM,
        title: "",
        artist: "",
        genres: [],
    });
    const [currentGenre, setCurrentGenre] = useState("");
    const [isValidUrl, setIsValidUrl] = useState(false);

    const validateSoundCloudUrl = (url: string): boolean => {
        return isValidSoundCloudUrl(url);
    };

    const handleUrlChange = (url: string) => {
        setSoundcloudUrl(url);
        const valid = validateSoundCloudUrl(url);
        setIsValidUrl(valid);

        if (valid) {
            const extractedInfo = extractInfoFromSoundCloudUrl(url);

            if (extractedInfo.artist || extractedInfo.title) {
                setSongDetails((prev) => ({
                    ...prev,
                    artist: prev.artist || extractedInfo.artist || "",
                    title: prev.title || extractedInfo.title || "",
                }));
            }
        }
    };

    const handleDetailChange = (field: keyof Song, value: unknown) => {
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
        if (!isValidUrl || !soundcloudUrl.trim()) {
            alert("Please enter a valid SoundCloud URL");
            return;
        }

        if (!songDetails.title?.trim()) {
            alert("Please enter a song title");
            return;
        }

        const processedUrl = convertToApiUrl(soundcloudUrl);

        const song: Song = {
            soundcloudUrl: processedUrl,
            title: songDetails.title?.trim(),
            artist: songDetails.artist?.trim(),
            difficulty: songDetails.difficulty || Difficulty.MEDIUM,
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
        });
        setCurrentGenre("");
        setIsValidUrl(false);
    };

    return (
        <div className="p-6 space-y-6">
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

            <Card variant="primary">
                <div className="space-y-4">
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
                            placeholder="Paste any SoundCloud URL here (e.g., https://soundcloud.com/artist/track or https://w.soundcloud.com/player/?url=...)"
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
                                        Regular SoundCloud URLs:{" "}
                                        <code>
                                            https://soundcloud.com/artist/track
                                        </code>
                                    </li>
                                    <li>
                                        Embed URLs:{" "}
                                        <code>
                                            https://w.soundcloud.com/player/?url=...
                                        </code>
                                    </li>
                                    <li>
                                        API URLs:{" "}
                                        <code>
                                            https://api.soundcloud.com/tracks/123456
                                        </code>
                                    </li>
                                </ul>
                            )}
                            {soundcloudUrl.trim() !== "" && isValidUrl && (
                                <p className="text-green-600 flex items-center">
                                    ✅ Valid SoundCloud URL detected
                                </p>
                            )}
                            {soundcloudUrl.trim() !== "" && !isValidUrl && (
                                <p className="text-red-600 flex items-center">
                                    ❌ Invalid SoundCloud URL format
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Song Title *
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
                                placeholder="Enter song title"
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
                                placeholder="Enter artist name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                                Difficulty
                            </label>
                            <select
                                value={songDetails.difficulty}
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
                                            diff.slice(1)}
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
