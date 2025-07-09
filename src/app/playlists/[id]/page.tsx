"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Button from "@/components/button";
import Card from "@/components/card";
import { IPlaylist } from "@/database/schemas/Playlist";
import { MapType } from "@/util/enums/PlaylistType";
import useSWR from "swr";

interface PlaylistPageProps {
    params: Promise<{ id: string }>;
}

interface PlaylistFormData {
    name: string;
    description: string;
    imageUrl: string;
    playlistType: MapType;
    selectionType: "dynamic" | "manual";
    tags: string[];
    metadata: {
        startYear?: number;
        endYear?: number;
        genres?: string[];
        artists?: string[];
        mood?: string;
        energy?: "low" | "medium" | "high";
        popularityRange?: "mainstream" | "underground" | "viral";
    };
}

const fetcher = (url: string) =>
    fetch(url, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    }).then((res) => res.json());

const PlaylistPage = ({ params }: PlaylistPageProps) => {
    const [playlistId, setPlaylistId] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newTag, setNewTag] = useState("");
    const [newGenre, setNewGenre] = useState("");
    const [newArtist, setNewArtist] = useState("");
    const [formData, setFormData] = useState<PlaylistFormData>({
        name: "",
        description: "",
        imageUrl: "",
        playlistType: MapType.CUSTOM,
        selectionType: "manual",
        tags: [],
        metadata: {
            genres: [],
            artists: [],
        },
    });

    const router = useRouter();

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setPlaylistId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    const {
        data: playlistData,
        error,
        isLoading,
        mutate,
    } = useSWR<{
        success: boolean;
        playlist: IPlaylist;
    }>(playlistId ? `/api/playlists/${playlistId}` : null, fetcher);

    const { data: userPlaylists } = useSWR<{
        success: boolean;
        playlists: IPlaylist[];
    }>("/api/me/playlists", fetcher);

    const { data: songsData, isLoading: songsLoading } = useSWR<{
        success: boolean;
        playlist: {
            songIds: Array<{
                _id: string;
                title: string;
                artist: string;
                album?: string;
                duration?: number;
                year?: number;
                genre?: string;
            }>;
        };
    }>(playlistId ? `/api/playlists/${playlistId}/songs` : null, fetcher);

    useEffect(() => {
        if (userPlaylists?.success && playlistData?.success) {
            const isUserOwner = userPlaylists.playlists.some(
                (playlist) =>
                    playlist._id.toString() ===
                    playlistData.playlist._id.toString()
            );
            setIsOwner(isUserOwner);
        }
    }, [userPlaylists, playlistData]);

    useEffect(() => {
        if (playlistData?.success) {
            const playlist = playlistData.playlist;
            setFormData({
                name: playlist.name,
                description: playlist.description,
                imageUrl: playlist.imageUrl || "",
                playlistType: playlist.playlistType,
                selectionType: playlist.selectionType,
                tags: playlist.tags || [],
                metadata: {
                    startYear: playlist.metadata?.startYear,
                    endYear: playlist.metadata?.endYear,
                    genres: playlist.metadata?.genres || [],
                    artists: playlist.metadata?.artists || [],
                    mood: playlist.metadata?.mood,
                    energy: playlist.metadata?.energy,
                    popularityRange: playlist.metadata?.popularityRange,
                },
            });
        }
    }, [playlistData]);

    const handleSave = async () => {
        if (!playlistId) {
            console.error("Playlist ID is not set.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`/api/playlists/${playlistId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await mutate();
                console.log("Playlist updated successfully.");
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating playlist:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (playlistData?.success) {
            const playlist = playlistData.playlist;
            setFormData({
                name: playlist.name,
                description: playlist.description,
                imageUrl: playlist.imageUrl || "",
                playlistType: playlist.playlistType,
                selectionType: playlist.selectionType,
                tags: playlist.tags || [],
                metadata: {
                    startYear: playlist.metadata?.startYear,
                    endYear: playlist.metadata?.endYear,
                    genres: playlist.metadata?.genres || [],
                    artists: playlist.metadata?.artists || [],
                    mood: playlist.metadata?.mood,
                    energy: playlist.metadata?.energy,
                    popularityRange: playlist.metadata?.popularityRange,
                },
            });
        }
        setIsEditing(false);
    };

    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, newTag.trim()],
            });
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter((t) => t !== tag),
        });
    };

    const addGenre = () => {
        if (
            newGenre.trim() &&
            !formData.metadata.genres?.includes(newGenre.trim())
        ) {
            setFormData({
                ...formData,
                metadata: {
                    ...formData.metadata,
                    genres: [
                        ...(formData.metadata.genres || []),
                        newGenre.trim(),
                    ],
                },
            });
            setNewGenre("");
        }
    };

    const removeGenre = (genre: string) => {
        setFormData({
            ...formData,
            metadata: {
                ...formData.metadata,
                genres:
                    formData.metadata.genres?.filter((g) => g !== genre) || [],
            },
        });
    };

    const addArtist = () => {
        if (
            newArtist.trim() &&
            !formData.metadata.artists?.includes(newArtist.trim())
        ) {
            setFormData({
                ...formData,
                metadata: {
                    ...formData.metadata,
                    artists: [
                        ...(formData.metadata.artists || []),
                        newArtist.trim(),
                    ],
                },
            });
            setNewArtist("");
        }
    };

    const removeArtist = (artist: string) => {
        setFormData({
            ...formData,
            metadata: {
                ...formData.metadata,
                artists:
                    formData.metadata.artists?.filter((a) => a !== artist) ||
                    [],
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <motion.div
                    className="text-2xl text-[var(--text)]"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    Loading playlist...
                </motion.div>
            </div>
        );
    }

    if (error || !playlistData?.success) {
        return (
            <div className="flex items-center justify-center min-h-screen pt-16">
                <Card variant="primary" className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
                        Playlist Not Found
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                        The playlist you&apos;re looking for doesn&apos;t exist
                        or has been removed.
                    </p>
                    <Button
                        label="Go Back"
                        onClick={() => router.back()}
                        variant="primary"
                    />
                </Card>
            </div>
        );
    }

    const playlist = playlistData.playlist;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl pt-16">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--text)]">
                            {playlist.name}
                        </h1>
                        <p className="text-lg text-[var(--text-secondary)]">
                            {playlist.description}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            label="Play"
                            onClick={() =>
                                router.push(`/game/classic/${playlist._id}`)
                            }
                            variant="accent"
                        />
                        {isOwner && !isEditing && (
                            <Button
                                label="Edit"
                                onClick={() => setIsEditing(true)}
                                variant="secondary"
                            />
                        )}
                        {isOwner && isEditing && (
                            <>
                                <Button
                                    label={isSaving ? "Saving..." : "Save"}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    variant="primary"
                                />
                                <Button
                                    label="Cancel"
                                    onClick={handleCancel}
                                    variant="secondary"
                                />
                            </>
                        )}
                    </div>
                </div>

                {playlist.imageUrl && (
                    <Card variant="primary" className="p-4">
                        <img
                            src={playlist.imageUrl}
                            alt={playlist.name}
                            className="w-full h-64 object-cover rounded"
                        />
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {isEditing ? (
                            <Card variant="primary" className="p-6">
                                <h2 className="text-2xl font-bold mb-6">
                                    Edit Playlist
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    name: e.target.value,
                                                })
                                            }
                                            className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    description: e.target.value,
                                                })
                                            }
                                            className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)] h-24"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Image URL
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.imageUrl}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    imageUrl: e.target.value,
                                                })
                                            }
                                            className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Playlist Type
                                            </label>
                                            <select
                                                value={formData.playlistType}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        playlistType: e.target
                                                            .value as MapType,
                                                    })
                                                }
                                                className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                            >
                                                {Object.values(MapType).map(
                                                    (type) => (
                                                        <option
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {type}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Selection Type
                                            </label>
                                            <select
                                                value={formData.selectionType}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        selectionType: e.target
                                                            .value as
                                                            | "dynamic"
                                                            | "manual",
                                                    })
                                                }
                                                className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                            >
                                                <option value="manual">
                                                    Manual
                                                </option>
                                                <option value="dynamic">
                                                    Dynamic
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Tags
                                        </label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newTag}
                                                onChange={(e) =>
                                                    setNewTag(e.target.value)
                                                }
                                                className="flex-1 p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                placeholder="Add a tag"
                                                onKeyPress={(e) =>
                                                    e.key === "Enter" &&
                                                    addTag()
                                                }
                                            />
                                            <Button
                                                label="Add"
                                                onClick={addTag}
                                                variant="accent"
                                                className="px-4"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="bg-[var(--accent)] px-2 py-1 rounded text-xs flex items-center gap-1"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() =>
                                                            removeTag(tag)
                                                        }
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.selectionType === "dynamic" && (
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">
                                                Dynamic Playlist Criteria
                                            </h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        Start Year
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1900"
                                                        max="2030"
                                                        value={
                                                            formData.metadata
                                                                .startYear || ""
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    startYear: e
                                                                        .target
                                                                        .value
                                                                        ? parseInt(
                                                                              e
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                        : undefined,
                                                                },
                                                            })
                                                        }
                                                        className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        End Year
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1900"
                                                        max="2030"
                                                        value={
                                                            formData.metadata
                                                                .endYear || ""
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    endYear: e
                                                                        .target
                                                                        .value
                                                                        ? parseInt(
                                                                              e
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                        : undefined,
                                                                },
                                                            })
                                                        }
                                                        className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">
                                                    Genres
                                                </label>
                                                <div className="flex gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        value={newGenre}
                                                        onChange={(e) =>
                                                            setNewGenre(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="flex-1 p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                        placeholder="Add a genre"
                                                        onKeyPress={(e) =>
                                                            e.key === "Enter" &&
                                                            addGenre()
                                                        }
                                                    />
                                                    <Button
                                                        label="Add"
                                                        onClick={addGenre}
                                                        variant="accent"
                                                        className="px-4"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {formData.metadata.genres?.map(
                                                        (genre, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-[var(--accent)] px-2 py-1 rounded text-xs flex items-center gap-1"
                                                            >
                                                                {genre}
                                                                <button
                                                                    onClick={() =>
                                                                        removeGenre(
                                                                            genre
                                                                        )
                                                                    }
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">
                                                    Artists
                                                </label>
                                                <div className="flex gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        value={newArtist}
                                                        onChange={(e) =>
                                                            setNewArtist(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="flex-1 p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                        placeholder="Add an artist"
                                                        onKeyPress={(e) =>
                                                            e.key === "Enter" &&
                                                            addArtist()
                                                        }
                                                    />
                                                    <Button
                                                        label="Add"
                                                        onClick={addArtist}
                                                        variant="accent"
                                                        className="px-4"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {formData.metadata.artists?.map(
                                                        (artist, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-[var(--accent)] px-2 py-1 rounded text-xs flex items-center gap-1"
                                                            >
                                                                {artist}
                                                                <button
                                                                    onClick={() =>
                                                                        removeArtist(
                                                                            artist
                                                                        )
                                                                    }
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        Energy Level
                                                    </label>
                                                    <select
                                                        value={
                                                            formData.metadata
                                                                .energy || ""
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    energy: e
                                                                        .target
                                                                        .value as
                                                                        | "low"
                                                                        | "medium"
                                                                        | "high"
                                                                        | undefined,
                                                                },
                                                            })
                                                        }
                                                        className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
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
                                                    <label className="block text-sm font-medium mb-1">
                                                        Popularity Range
                                                    </label>
                                                    <select
                                                        value={
                                                            formData.metadata
                                                                .popularityRange ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    popularityRange:
                                                                        e.target
                                                                            .value as
                                                                            | "mainstream"
                                                                            | "underground"
                                                                            | "viral"
                                                                            | undefined,
                                                                },
                                                            })
                                                        }
                                                        className="w-full p-2 rounded border bg-[var(--primary)] text-[var,--text)]"
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

                                            <div>
                                                <label className="block text-sm font-medium mb-1">
                                                    Mood
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        formData.metadata
                                                            .mood || ""
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            metadata: {
                                                                ...formData.metadata,
                                                                mood: e.target
                                                                    .value,
                                                            },
                                                        })
                                                    }
                                                    className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                    placeholder="e.g., happy, melancholic, energetic"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <Card variant="primary" className="p-6">
                                <h2 className="text-2xl font-bold mb-4">
                                    Playlist Information
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <strong>Type:</strong>{" "}
                                        {playlist.playlistType}
                                    </div>
                                    <div>
                                        <strong>Selection:</strong>{" "}
                                        {playlist.selectionType}
                                    </div>
                                    <div>
                                        <strong>Song Count:</strong>{" "}
                                        {playlist.songCount}
                                    </div>
                                    <div>
                                        <strong>Play Count:</strong>{" "}
                                        {playlist.playCount}
                                    </div>
                                    {playlist.tags &&
                                        playlist.tags.length > 0 && (
                                            <div>
                                                <strong>Tags:</strong>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {playlist.tags.map(
                                                        (tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-[var(--accent)] px-2 py-1 rounded text-xs"
                                                            >
                                                                {tag}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    {playlist.metadata &&
                                        playlist.selectionType ===
                                            "dynamic" && (
                                            <div>
                                                <strong>
                                                    Dynamic Criteria:
                                                </strong>
                                                <div className="mt-2 space-y-1 text-sm">
                                                    {playlist.metadata
                                                        .startYear && (
                                                        <div>
                                                            Year Range:{" "}
                                                            {
                                                                playlist
                                                                    .metadata
                                                                    .startYear
                                                            }{" "}
                                                            -{" "}
                                                            {playlist.metadata
                                                                .endYear ||
                                                                "Present"}
                                                        </div>
                                                    )}
                                                    {playlist.metadata.genres &&
                                                        playlist.metadata.genres
                                                            .length > 0 && (
                                                            <div>
                                                                Genres:{" "}
                                                                {playlist.metadata.genres.join(
                                                                    ", "
                                                                )}
                                                            </div>
                                                        )}
                                                    {playlist.metadata
                                                        .artists &&
                                                        playlist.metadata
                                                            .artists.length >
                                                            0 && (
                                                            <div>
                                                                Artists:{" "}
                                                                {playlist.metadata.artists.join(
                                                                    ", "
                                                                )}
                                                            </div>
                                                        )}
                                                    {playlist.metadata
                                                        .energy && (
                                                        <div>
                                                            Energy:{" "}
                                                            {
                                                                playlist
                                                                    .metadata
                                                                    .energy
                                                            }
                                                        </div>
                                                    )}
                                                    {playlist.metadata
                                                        .popularityRange && (
                                                        <div>
                                                            Popularity:{" "}
                                                            {
                                                                playlist
                                                                    .metadata
                                                                    .popularityRange
                                                            }
                                                        </div>
                                                    )}
                                                    {playlist.metadata.mood && (
                                                        <div>
                                                            Mood:{" "}
                                                            {
                                                                playlist
                                                                    .metadata
                                                                    .mood
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </Card>
                        )}

                        <Card variant="primary" className="p-6">
                            <h2 className="text-2xl font-bold mb-4">
                                Songs ({playlist.songCount})
                            </h2>
                            {songsLoading ? (
                                <div className="text-center py-8">
                                    <motion.div
                                        className="text-[var(--text-secondary)]"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1.5,
                                        }}
                                    >
                                        Loading songs...
                                    </motion.div>
                                </div>
                            ) : songsData?.success &&
                              songsData.playlist.songIds?.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {songsData.playlist.songIds.map(
                                        (song, index) => (
                                            <div
                                                key={song._id}
                                                className="flex items-center justify-between p-3 rounded bg-[var(--secondary)] hover:bg-[var(--accent)] transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-[var(--text-secondary)] w-8">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <div className="font-medium text-[var(--text)]">
                                                            {song.title}
                                                        </div>
                                                        <div className="text-sm text-[var(--text-secondary)]">
                                                            {song.artist}
                                                            {song.album &&
                                                                ` • ${song.album}`}
                                                            {song.year &&
                                                                ` • ${song.year}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                    {song.genre && (
                                                        <span className="bg-[var(--accent)] px-2 py-1 rounded text-xs">
                                                            {song.genre}
                                                        </span>
                                                    )}
                                                    {song.duration && (
                                                        <span>
                                                            {Math.floor(
                                                                song.duration /
                                                                    60
                                                            )}
                                                            :
                                                            {(
                                                                song.duration %
                                                                60
                                                            )
                                                                .toString()
                                                                .padStart(
                                                                    2,
                                                                    "0"
                                                                )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : songsData?.success ? (
                                <div className="text-center py-8">
                                    <div className="text-[var(--text-secondary)]">
                                        {playlist.selectionType === "dynamic"
                                            ? "Songs will be dynamically selected based on your criteria when you play the game."
                                            : "No songs have been added to this playlist yet."}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="text-[var(--text-secondary)]">
                                        Error loading songs. Please try again.
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card variant="secondary" className="p-4">
                            <h3 className="text-lg font-semibold mb-2">
                                Quick Actions
                            </h3>
                            <div className="space-y-2">
                                <Button
                                    label="Play Game"
                                    onClick={() =>
                                        router.push(
                                            `/game/classic/${playlist._id}`
                                        )
                                    }
                                    variant="accent"
                                    className="w-full"
                                />
                                <Button
                                    label="Browse Playlists"
                                    onClick={() => router.push("/play")}
                                    variant="primary"
                                    className="w-full"
                                />
                            </div>
                        </Card>

                        <Card variant="primary" className="p-4">
                            <h3 className="text-lg font-semibold mb-2">
                                Statistics
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Songs:</span>
                                    <span>{playlist.songCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Times Played:</span>
                                    <span>{playlist.playCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Rating:</span>
                                    <span>{playlist.averageRating}/5</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Created:</span>
                                    <span>
                                        {new Date(
                                            playlist.createdAt
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PlaylistPage;
