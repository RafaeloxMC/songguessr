"use client";
import { ISong } from "@/database/schemas/Song";
import { Difficulty } from "@/util/enums/Difficulty";
import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/button";
import Card from "@/components/card";
import { extractSoundCloudURL } from "@/util/SCUtils";
import { SoundCloudWidget } from "@/util/types/SoundCloudWidget";
import { SoundCloudSound } from "@/util/interfaces/SoundCloudSound";

declare global {
    interface Window {
        SC: {
            Widget: (element: HTMLIFrameElement | string) => SoundCloudWidget;
        };
    }
}

interface SongDevPageProps {
    params: Promise<{
        id: string;
    }>;
}

interface SongFormData {
    title?: string;
    artist?: string;
    difficulty: Difficulty;
    startingOffset?: number;
    isActive: boolean;
    releaseYear?: number;
    genres?: string[];
    mood?: string;
    energy?: "low" | "medium" | "high";
    popularityRange?: "mainstream" | "underground" | "viral";
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SongDevPage = ({ params }: SongDevPageProps) => {
    const { id } = React.use(params);
    const {
        data: song,
        error,
        isLoading,
    } = useSWR<ISong>(`/api/songs/${id}`, fetcher);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newGenre, setNewGenre] = useState("");
    const [formData, setFormData] = useState<SongFormData>({
        title: "",
        artist: "",
        difficulty: Difficulty.MEDIUM,
        startingOffset: 0,
        isActive: true,
        genres: [],
    });

    const [widget, setWidget] = useState<SoundCloudWidget | null>(null);
    const [isWidgetReady, setIsWidgetReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [testOffset, setTestOffset] = useState<number>(0);
    const [playbackDuration, setPlaybackDuration] = useState<number>(5);
    const [currentSongInfo, setCurrentSongInfo] =
        useState<SoundCloudSound | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (song) {
            setFormData({
                title: song.title || "",
                artist: song.artist || "",
                difficulty: song.difficulty,
                startingOffset: song.startingOffset || 0,
                isActive: song.isActive,
                releaseYear: song.releaseYear,
                genres: song.genres || [],
                mood: song.mood || "",
                energy: song.energy,
                popularityRange: song.popularityRange,
            });
            setTestOffset(song.startingOffset || 0);
        }
    }, [song]);

    useEffect(() => {
        if (!window.SC) {
            const script = document.createElement("script");
            script.src = "https://w.soundcloud.com/player/api.js";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const initializeWidget = useCallback(() => {
        if (iframeRef.current && window.SC && song) {
            const widgetInstance = window.SC.Widget(iframeRef.current);
            setWidget(widgetInstance);

            widgetInstance.bind("ready", () => {
                setIsWidgetReady(true);

                widgetInstance.getCurrentSound(
                    (sound: SoundCloudSound | null) => {
                        setCurrentSongInfo(sound);
                    }
                );
            });
        }
    }, [song]);

    useEffect(() => {
        if (song && iframeRef.current) {
            const iframe = iframeRef.current;
            iframe.onload = () => {
                setTimeout(initializeWidget, 1000);
            };
        }
    }, [song, initializeWidget]);

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? (e.target as HTMLInputElement).checked
                    : type === "number"
                    ? Number(value)
                    : value,
        }));
    };

    const addGenre = () => {
        if (
            newGenre.trim() &&
            !formData.genres?.includes(newGenre.trim().toLowerCase())
        ) {
            setFormData((prev) => ({
                ...prev,
                genres: [...(prev.genres || []), newGenre.trim().toLowerCase()],
            }));
            setNewGenre("");
        }
    };

    const removeGenre = (genreToRemove: string) => {
        setFormData((prev) => ({
            ...prev,
            genres:
                prev.genres?.filter((genre) => genre !== genreToRemove) || [],
        }));
    };

    const handleSave = async () => {
        if (!song) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/songs/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await mutate(`/api/songs/${id}`);
                setIsEditing(false);
            } else {
                console.error("Failed to update song");
            }
        } catch (error) {
            console.error("Error updating song:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (song) {
            setFormData({
                title: song.title || "",
                artist: song.artist || "",
                difficulty: song.difficulty,
                startingOffset: song.startingOffset || 0,
                isActive: song.isActive,
                releaseYear: song.releaseYear,
                genres: song.genres || [],
                mood: song.mood || "",
                energy: song.energy,
                popularityRange: song.popularityRange,
            });
        }
        setIsEditing(false);
    };

    const testPlayback = () => {
        if (!widget || !isWidgetReady) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        widget.seekTo(testOffset * 1000);
        widget.play();
        setIsPlaying(true);

        timeoutRef.current = setTimeout(() => {
            widget.pause();
            setIsPlaying(false);
        }, playbackDuration * 1000);
    };

    const stopPlayback = () => {
        if (widget) {
            widget.pause();
            setIsPlaying(false);
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    const seekToOffset = () => {
        if (widget && isWidgetReady) {
            widget.seekTo(testOffset * 1000);
        }
    };

    const useTestOffsetInForm = () => {
        setFormData((prev) => ({
            ...prev,
            startingOffset: testOffset,
        }));
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] p-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="text-2xl text-[var(--text)]">
                            Loading song...
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (error || !song) {
        return (
            <div className="min-h-screen bg-[var(--background)] p-8">
                <div className="max-w-4xl mx-auto">
                    <Card variant="secondary" className="text-center py-12">
                        <div className="text-2xl text-[var(--text)] mb-4">
                            Song not found
                        </div>
                        <p className="text-[var(--text-secondary)]">
                            The song with ID &apos;{id}&apos; could not be
                            loaded.
                        </p>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card variant="primary" className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-bold text-[var(--text)]">
                                Song Editor
                            </h1>
                            <div className="flex gap-3">
                                {!isEditing ? (
                                    <Button
                                        label="Edit Song"
                                        variant="accent"
                                        onClick={() => setIsEditing(true)}
                                    />
                                ) : (
                                    <>
                                        <Button
                                            label="Cancel"
                                            variant="secondary"
                                            onClick={handleCancel}
                                        />
                                        <Button
                                            label={
                                                isSaving
                                                    ? "Saving..."
                                                    : "Save Changes"
                                            }
                                            variant="accent"
                                            disabled={isSaving}
                                            onClick={handleSave}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* SoundCloud Player */}
                        <div className="mb-6">
                            <iframe
                                ref={iframeRef}
                                src={extractSoundCloudURL(song.soundcloudUrl)}
                                width="100%"
                                height="166"
                                frameBorder="0"
                                allow="autoplay"
                                title="SoundCloud player"
                            />
                        </div>

                        {/* Offset Testing Section */}
                        <Card variant="secondary" className="mb-6 p-4">
                            <h3 className="text-xl font-semibold text-[var(--text)] mb-4">
                                🎵 Offset Testing
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                        Test Offset (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        value={testOffset}
                                        onChange={(e) =>
                                            setTestOffset(
                                                Number(e.target.value)
                                            )
                                        }
                                        min="0"
                                        step="0.1"
                                        className="w-full p-3 bg-[var(--primary)] text-[var(--text)] rounded-lg"
                                        placeholder="e.g., 30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                        Playback Duration (seconds)
                                    </label>
                                    <select
                                        value={playbackDuration}
                                        onChange={(e) =>
                                            setPlaybackDuration(
                                                Number(e.target.value)
                                            )
                                        }
                                        className="w-full p-3 bg-[var(--primary)] text-[var(--text)] rounded-lg"
                                    >
                                        <option value={1}>1 second</option>
                                        <option value={3}>3 seconds</option>
                                        <option value={5}>5 seconds</option>
                                        <option value={10}>10 seconds</option>
                                        <option value={15}>15 seconds</option>
                                        <option value={30}>30 seconds</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 mb-4">
                                <Button
                                    label={
                                        isPlaying ? "Testing..." : "Test Offset"
                                    }
                                    variant="accent"
                                    onClick={testPlayback}
                                    disabled={!isWidgetReady || isPlaying}
                                />
                                <Button
                                    label="Stop"
                                    variant="secondary"
                                    onClick={stopPlayback}
                                    disabled={!isPlaying}
                                />
                                <Button
                                    label="Seek to Offset"
                                    variant="primary"
                                    onClick={seekToOffset}
                                    disabled={!isWidgetReady}
                                />
                                {isEditing && (
                                    <Button
                                        label="Use This Offset"
                                        variant="accent"
                                        onClick={useTestOffsetInForm}
                                    />
                                )}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                                {!isWidgetReady ? (
                                    "Widget loading..."
                                ) : currentSongInfo ? (
                                    <>
                                        <strong>Track:</strong>{" "}
                                        {currentSongInfo.title || "Unknown"}
                                        {currentSongInfo.user && (
                                            <>
                                                {" "}
                                                by{" "}
                                                {currentSongInfo.user.username}
                                            </>
                                        )}
                                        <br />
                                        <strong>
                                            Current test offset:
                                        </strong>{" "}
                                        {testOffset}s
                                        {isEditing &&
                                            formData.startingOffset !==
                                                testOffset && (
                                                <span className="text-[var(--accent)]">
                                                    {" "}
                                                    (Form offset:{" "}
                                                    {formData.startingOffset}s)
                                                </span>
                                            )}
                                    </>
                                ) : (
                                    "Loading track info..."
                                )}
                            </div>
                        </Card>

                        <AnimatePresence mode="wait">
                            {!isEditing ? (
                                <motion.div
                                    key="view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                                                Basic Information
                                            </h3>
                                            <div className="space-y-2">
                                                <p>
                                                    <strong>Title:</strong>{" "}
                                                    {song.title || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Artist:</strong>{" "}
                                                    {song.artist || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Difficulty:</strong>{" "}
                                                    {song.difficulty}
                                                </p>
                                                <p>
                                                    <strong>
                                                        Starting Offset:
                                                    </strong>{" "}
                                                    {song.startingOffset || 0}s
                                                </p>
                                                <p>
                                                    <strong>Status:</strong>{" "}
                                                    {song.isActive
                                                        ? "Active"
                                                        : "Inactive"}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                                                Metadata
                                            </h3>
                                            <div className="space-y-2">
                                                <p>
                                                    <strong>
                                                        Release Year:
                                                    </strong>{" "}
                                                    {song.releaseYear || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Mood:</strong>{" "}
                                                    {song.mood || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Energy:</strong>{" "}
                                                    {song.energy || "N/A"}
                                                </p>
                                                <p>
                                                    <strong>Popularity:</strong>{" "}
                                                    {song.popularityRange ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                                            Genres
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {song.genres &&
                                            song.genres.length > 0 ? (
                                                song.genres.map(
                                                    (genre, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-1 bg-[var(--accent)] text-[var(--text)] rounded-full text-sm"
                                                        >
                                                            {genre}
                                                        </span>
                                                    )
                                                )
                                            ) : (
                                                <span className="text-[var(--text-secondary)]">
                                                    No genres
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                                            Statistics
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--accent)]">
                                                    {song.playCount}
                                                </div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    Plays
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--accent)]">
                                                    {song.correctGuesses}
                                                </div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    Correct
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--accent)]">
                                                    {song.playCount > 0
                                                        ? Math.round(
                                                              (song.correctGuesses /
                                                                  song.playCount) *
                                                                  100
                                                          )
                                                        : 0}
                                                    %
                                                </div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    Success Rate
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-[var(--accent)]">
                                                    {song.soundcloudTrackId}
                                                </div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    Track ID
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="edit"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Title
                                                </label>
                                                <input
                                                    type="text"
                                                    name="title"
                                                    value={formData.title}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                    placeholder="Song title"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Artist
                                                </label>
                                                <input
                                                    type="text"
                                                    name="artist"
                                                    value={formData.artist}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                    placeholder="Artist name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Difficulty
                                                </label>
                                                <select
                                                    name="difficulty"
                                                    value={formData.difficulty}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                >
                                                    {Object.values(
                                                        Difficulty
                                                    ).map((diff) => (
                                                        <option
                                                            key={diff}
                                                            value={diff}
                                                        >
                                                            {diff
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                diff.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Starting Offset (seconds)
                                                    {testOffset !==
                                                        formData.startingOffset && (
                                                        <span className="text-[var(--accent)] ml-2">
                                                            (Test: {testOffset}
                                                            s)
                                                        </span>
                                                    )}
                                                </label>
                                                <input
                                                    type="number"
                                                    name="startingOffset"
                                                    value={
                                                        formData.startingOffset
                                                    }
                                                    onChange={handleInputChange}
                                                    min="0"
                                                    step="0.1"
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Release Year
                                                </label>
                                                <input
                                                    type="number"
                                                    name="releaseYear"
                                                    value={
                                                        formData.releaseYear ||
                                                        ""
                                                    }
                                                    onChange={handleInputChange}
                                                    min="1900"
                                                    max="2030"
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                    placeholder="e.g., 2023"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Mood
                                                </label>
                                                <input
                                                    type="text"
                                                    name="mood"
                                                    value={formData.mood}
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                    placeholder="e.g., happy, sad, energetic"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Energy Level
                                                </label>
                                                <select
                                                    name="energy"
                                                    value={
                                                        formData.energy || ""
                                                    }
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                >
                                                    <option value="">
                                                        Select energy level
                                                    </option>
                                                    <option value="low">
                                                        Low
                                                    </option>
                                                    <option value="medium">
                                                        Medium
                                                    </option>
                                                    <option value="high">
                                                        High
                                                    </option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Popularity Range
                                                </label>
                                                <select
                                                    name="popularityRange"
                                                    value={
                                                        formData.popularityRange ||
                                                        ""
                                                    }
                                                    onChange={handleInputChange}
                                                    className="w-full p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                >
                                                    <option value="">
                                                        Select popularity
                                                    </option>
                                                    <option value="mainstream">
                                                        Mainstream
                                                    </option>
                                                    <option value="underground">
                                                        Underground
                                                    </option>
                                                    <option value="viral">
                                                        Viral
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                            Genres
                                        </label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newGenre}
                                                onChange={(e) =>
                                                    setNewGenre(e.target.value)
                                                }
                                                onKeyPress={(e) =>
                                                    e.key === "Enter" &&
                                                    addGenre()
                                                }
                                                className="flex-1 p-3 bg-[var(--secondary)] text-[var(--text)] rounded-lg"
                                                placeholder="Add genre"
                                            />
                                            <Button
                                                label="Add"
                                                variant="accent"
                                                onClick={addGenre}
                                                className="px-6"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.genres?.map(
                                                (genre, index) => (
                                                    <motion.span
                                                        key={index}
                                                        initial={{
                                                            opacity: 0,
                                                            scale: 0.8,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                        }}
                                                        className="px-3 py-1 bg-[var(--accent)] text-[var(--text)] rounded-full text-sm flex items-center gap-2"
                                                    >
                                                        {genre}
                                                        <button
                                                            onClick={() =>
                                                                removeGenre(
                                                                    genre
                                                                )
                                                            }
                                                            className="text-[var(--text)] hover:text-red-500 transition-colors"
                                                        >
                                                            ×
                                                        </button>
                                                    </motion.span>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                            className="mr-2 w-4 h-4"
                                        />
                                        <label
                                            htmlFor="isActive"
                                            className="text-[var(--text)]"
                                        >
                                            Song is active
                                        </label>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default SongDevPage;
