"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/button";
import Card from "@/components/card";
import SongSearch from "@/components/SongSearch";
import { IPlaylist } from "@/database/schemas/Playlist";
import { MapType } from "@/util/enums/PlaylistType";
import { ISong } from "@/database/schemas/Song";

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

const PlaylistManagementPage = () => {
    const [playlists, setPlaylists] = useState<IPlaylist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<IPlaylist | null>(
        null
    );
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showSongSearch, setShowSongSearch] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        try {
            const response = await fetch("/api/playlists");
            const data = await response.json();
            setPlaylists(data);
        } catch (error) {
            console.error("Error fetching playlists:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlaylist = async () => {
        try {
            const response = await fetch("/api/playlists", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    slug: formData.name.toLowerCase().replace(/\s+/g, "-"),
                }),
            });

            if (response.ok) {
                await fetchPlaylists();
                resetForm();
                setShowCreateForm(false);
            }
        } catch (error) {
            console.error("Error creating playlist:", error);
        }
    };

    const handleUpdatePlaylist = async () => {
        if (!selectedPlaylist) return;

        try {
            const response = await fetch(
                `/api/playlists/${selectedPlaylist._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                }
            );

            if (response.ok) {
                await fetchPlaylists();
                setIsEditing(false);
                setSelectedPlaylist(null);
            }
        } catch (error) {
            console.error("Error updating playlist:", error);
        }
    };

    const handleDeletePlaylist = async (playlistId: string) => {
        if (!confirm("Are you sure you want to delete this playlist?")) return;

        try {
            const response = await fetch(`/api/playlists/${playlistId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                await fetchPlaylists();
                if (selectedPlaylist?._id.toString() === playlistId) {
                    setSelectedPlaylist(null);
                }
            }
        } catch (error) {
            console.error("Error deleting playlist:", error);
        }
    };

    const handleAddSong = async (song: Partial<ISong>) => {
        if (!selectedPlaylist) return;

        try {
            const response = await fetch(
                `/api/playlists/${selectedPlaylist._id}/songs`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(song),
                }
            );

            if (response.ok) {
                await fetchPlaylists();
                const updatedPlaylists = await fetch("/api/playlists").then(
                    (res) => res.json()
                );
                const updatedPlaylist = updatedPlaylists.find(
                    (p: IPlaylist) =>
                        p._id.toString() === selectedPlaylist._id.toString()
                );
                if (updatedPlaylist) {
                    setSelectedPlaylist(updatedPlaylist);
                }
                setShowSongSearch(false);
            }
        } catch (error) {
            console.error("Error adding song:", error);
        }
    };

    const resetForm = () => {
        setFormData({
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
    };

    const loadPlaylistToForm = (playlist: IPlaylist) => {
        setFormData({
            name: playlist.name,
            description: playlist.description,
            imageUrl: playlist.imageUrl || "",
            playlistType: playlist.playlistType,
            selectionType: playlist.selectionType,
            tags: playlist.tags || [],
            metadata: playlist.metadata || {
                genres: [],
                artists: [],
            },
        });
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <motion.div
                    className="text-2xl text-[var(--text)]"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    Loading playlists...
                </motion.div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                <h1 className="text-4xl font-bold text-[var(--text)]">
                    🎵 Playlist Management
                </h1>
                <p className="text-lg text-[var(--text-secondary)]">
                    Create, modify, and manage your music playlists
                </p>
            </motion.div>

            <div className="flex flex-wrap gap-4 justify-center">
                <Button
                    label="Create New Playlist"
                    icon={<span>➕</span>}
                    onClick={() => {
                        resetForm();
                        setShowCreateForm(true);
                    }}
                    variant="primary"
                />

                {selectedPlaylist && (
                    <>
                        <Button
                            label="Edit Playlist"
                            icon={<span>✏️</span>}
                            onClick={() => {
                                loadPlaylistToForm(selectedPlaylist);
                                setIsEditing(true);
                            }}
                            variant="secondary"
                        />
                        <Button
                            label="Add Songs"
                            icon={<span>🎵</span>}
                            onClick={() => setShowSongSearch(true)}
                            variant="accent"
                        />
                        <Button
                            label="Delete Playlist"
                            icon={<span>🗑️</span>}
                            onClick={() =>
                                handleDeletePlaylist(
                                    selectedPlaylist._id.toString()
                                )
                            }
                            variant="secondary"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Playlists List */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-[var(--text)]">
                        Your Playlists ({playlists.length})
                    </h2>
                    <div className="space-y-3 max-h-full overflow-y-auto">
                        {playlists.map((playlist) => (
                            <Card
                                key={playlist._id.toString()}
                                variant={
                                    selectedPlaylist?._id === playlist._id
                                        ? "accent"
                                        : "primary"
                                }
                                className={`cursor-pointer overflow-hidden ${
                                    selectedPlaylist?._id === playlist._id
                                        ? "shadow-none"
                                        : "shadow-md"
                                }`}
                                onClick={() => setSelectedPlaylist(playlist)}
                            >
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">
                                        {playlist.name}
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {playlist.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="bg-[var(--secondary)] px-2 py-1 rounded">
                                            {playlist.playlistType}
                                        </span>
                                        {playlist.selectionType ===
                                            "manual" && (
                                            <span className="bg-[var(--secondary)] px-2 py-1 rounded">
                                                {playlist.songCount} songs
                                            </span>
                                        )}
                                        <span className="bg-[var(--secondary)] px-2 py-1 rounded">
                                            {playlist.selectionType}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Playlist Details */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-[var(--text)]">
                        Playlist Details
                    </h2>
                    {selectedPlaylist ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card variant="secondary">
                                <h2 className="text-2xl font-semibold mb-4">
                                    📋 {selectedPlaylist.name}
                                </h2>
                                <div className="space-y-3">
                                    <p>
                                        <strong>Description:</strong>{" "}
                                        {selectedPlaylist.description}
                                    </p>
                                    <p>
                                        <strong>Type:</strong>{" "}
                                        {selectedPlaylist.playlistType}
                                    </p>
                                    <p>
                                        <strong>Selection:</strong>{" "}
                                        {selectedPlaylist.selectionType}
                                    </p>

                                    {selectedPlaylist.selectionType ===
                                        "manual" && (
                                        <p>
                                            <strong>Songs:</strong>{" "}
                                            {selectedPlaylist.songCount}
                                        </p>
                                    )}

                                    <p>
                                        <strong>Plays:</strong>{" "}
                                        {selectedPlaylist.playCount}
                                    </p>

                                    <p>
                                        <strong>Image:</strong>{" "}
                                        {selectedPlaylist.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={selectedPlaylist.imageUrl}
                                                alt={selectedPlaylist.name}
                                                className="w-full h-auto rounded"
                                            />
                                        ) : (
                                            <span>No image available</span>
                                        )}
                                    </p>

                                    {selectedPlaylist.tags &&
                                        selectedPlaylist.tags.length > 0 && (
                                            <div>
                                                <strong>Tags:</strong>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedPlaylist.tags.map(
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

                                    {selectedPlaylist.metadata && (
                                        <div className="space-y-2">
                                            <strong>Metadata:</strong>
                                            {selectedPlaylist.metadata
                                                .startYear && (
                                                <p className="text-sm">
                                                    Year Range:{" "}
                                                    {
                                                        selectedPlaylist
                                                            .metadata.startYear
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        selectedPlaylist
                                                            .metadata.endYear
                                                    }
                                                </p>
                                            )}
                                            {selectedPlaylist.metadata.genres &&
                                                selectedPlaylist.metadata.genres
                                                    .length > 0 && (
                                                    <p className="text-sm">
                                                        Genres:{" "}
                                                        {selectedPlaylist.metadata.genres.join(
                                                            ", "
                                                        )}
                                                    </p>
                                                )}
                                            {selectedPlaylist.metadata
                                                .artists &&
                                                selectedPlaylist.metadata
                                                    .artists.length > 0 && (
                                                    <p className="text-sm">
                                                        Artists:{" "}
                                                        {selectedPlaylist.metadata.artists.join(
                                                            ", "
                                                        )}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        <Card variant="primary" className="text-center py-12">
                            <h3 className="text-xl text-[var(--text-secondary)]">
                                Select a playlist to view details
                            </h3>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create/Edit Form Modal */}
            <AnimatePresence>
                {(showCreateForm || isEditing) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--background)] rounded-lg shadow-[0_8px_0_rgba(0,0,0,0.3)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6">
                                <h2 className="text-2xl font-bold mb-6 text-[var(--text)]">
                                    {isEditing
                                        ? "✏️ Edit Playlist"
                                        : "➕ Create New Playlist"}
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
                                            placeholder="Enter playlist name"
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
                                            placeholder="Enter playlist description"
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
                                            placeholder="Enter image URL (optional)"
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

                                    {/* Tags */}
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

                                    {/* Year Range */}
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
                                                            startYear: e.target
                                                                .value
                                                                ? parseInt(
                                                                      e.target
                                                                          .value
                                                                  )
                                                                : undefined,
                                                        },
                                                    })
                                                }
                                                className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                placeholder="e.g., 2000"
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
                                                    formData.metadata.endYear ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        metadata: {
                                                            ...formData.metadata,
                                                            endYear: e.target
                                                                .value
                                                                ? parseInt(
                                                                      e.target
                                                                          .value
                                                                  )
                                                                : undefined,
                                                        },
                                                    })
                                                }
                                                className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                                placeholder="e.g., 2020"
                                            />
                                        </div>
                                    </div>

                                    {/* Genres */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Genres
                                        </label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newGenre}
                                                onChange={(e) =>
                                                    setNewGenre(e.target.value)
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

                                    {/* Artists */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Artists
                                        </label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newArtist}
                                                onChange={(e) =>
                                                    setNewArtist(e.target.value)
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

                                    {/* Energy and Mood */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Energy Level
                                            </label>
                                            <select
                                                value={
                                                    formData.metadata.energy ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        metadata: {
                                                            ...formData.metadata,
                                                            energy: e.target
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
                                                <option value="low">Low</option>
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
                                                        .popularityRange || ""
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        metadata: {
                                                            ...formData.metadata,
                                                            popularityRange: e
                                                                .target
                                                                .value as
                                                                | "mainstream"
                                                                | "underground"
                                                                | "viral"
                                                                | undefined,
                                                        },
                                                    })
                                                }
                                                className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
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

                                    {/* Mood */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Mood
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.metadata.mood || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    metadata: {
                                                        ...formData.metadata,
                                                        mood: e.target.value,
                                                    },
                                                })
                                            }
                                            className="w-full p-2 rounded border bg-[var(--primary)] text-[var(--text)]"
                                            placeholder="e.g., happy, melancholic, energetic"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-6">
                                    <Button
                                        label={
                                            isEditing
                                                ? "Update Playlist"
                                                : "Create Playlist"
                                        }
                                        icon={
                                            <span>
                                                {isEditing ? "💾" : "➕"}
                                            </span>
                                        }
                                        onClick={
                                            isEditing
                                                ? handleUpdatePlaylist
                                                : handleCreatePlaylist
                                        }
                                        variant="primary"
                                        disabled={
                                            !formData.name.trim() ||
                                            !formData.description.trim()
                                        }
                                    />
                                    <Button
                                        label="Cancel"
                                        icon={<span>❌</span>}
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setIsEditing(false);
                                            resetForm();
                                        }}
                                        variant="secondary"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Song Search Modal */}
            <AnimatePresence>
                {showSongSearch && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--background)] rounded-lg shadow-[0_8px_0_rgba(0,0,0,0.3)] max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        >
                            <SongSearch
                                onSongAdd={handleAddSong}
                                onClose={() => setShowSongSearch(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PlaylistManagementPage;
