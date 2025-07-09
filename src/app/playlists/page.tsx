"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "@/components/button";
import Card from "@/components/card";
import PlaylistCard from "@/components/playlistcard";
import FloatingNotesBackground from "@/components/floatingnotesbg";
import { IPlaylist } from "@/database/schemas/Playlist";
import { MapType } from "@/util/enums/PlaylistType";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function PlaylistsPage() {
    const [filteredPlaylists, setFilteredPlaylists] = useState<IPlaylist[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    const {
        data: playlists,
        error,
        isLoading,
    } = useSWR<IPlaylist[]>("/api/playlists", fetcher);

    useEffect(() => {
        if (playlists) {
            let filtered = [...playlists];

            if (selectedCategory !== "all") {
                filtered = filtered.filter(
                    (playlist) => playlist.playlistType === selectedCategory
                );
            }

            if (searchTerm) {
                filtered = filtered.filter(
                    (playlist) =>
                        playlist.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                        playlist.description
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                        playlist.tags?.some((tag) =>
                            tag.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                );
            }

            filtered.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

            setFilteredPlaylists(filtered);
        }
    }, [playlists, selectedCategory, searchTerm]);

    const categories = [
        { key: "all", label: "All Playlists", icon: "🎵" },
        { key: MapType.DECADE, label: "Decades", icon: "📅" },
        { key: MapType.GENRE, label: "Genres", icon: "🎸" },
        { key: MapType.ARTIST, label: "Artists", icon: "🎤" },
        { key: MapType.MOOD, label: "Moods", icon: "💭" },
        { key: MapType.POPULARITY, label: "Popularity", icon: "🔥" },
        { key: MapType.CUSTOM, label: "Custom", icon: "⚙️" },
    ];

    const handlePlaylistClick = (playlist: IPlaylist) => {
        router.push(`/playlists/${playlist._id.toString()}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] relative overflow-hidden mt-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <motion.div
                            className="text-center space-y-4"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <div className="text-6xl">🎵</div>
                            <h2 className="text-2xl font-bold">
                                Loading Playlists...
                            </h2>
                            <p className="text-[var(--text-secondary)]">
                                Discovering amazing music collections
                            </p>
                        </motion.div>
                    </div>
                </div>
                <FloatingNotesBackground />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] relative overflow-hidden mt-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4"
                        >
                            <Card variant="accent" className="p-8">
                                <div className="text-6xl mb-4">⚠️</div>
                                <h2 className="text-2xl font-bold mb-4">
                                    Failed to Load Playlists
                                </h2>
                                <p className="text-[var(--text-secondary)] mb-6">
                                    Something went wrong while loading the
                                    playlists.
                                </p>
                                <Button
                                    label="Try Again"
                                    onClick={() => window.location.reload()}
                                    variant="primary"
                                />
                            </Card>
                        </motion.div>
                    </div>
                </div>
                <FloatingNotesBackground />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)] relative overflow-hidden mt-16">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <h1 className="text-4xl font-bold">🎵 Music Playlists</h1>
                    <p className="text-lg text-[var(--text-secondary)]">
                        Discover and play from our collection of curated
                        playlists
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                >
                    <div className="flex justify-center">
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Search playlists..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 pl-10 rounded-lg border bg-[var(--primary)] text-[var(--text)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]">
                                🔍
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center">
                        {categories.map((category) => (
                            <Button
                                key={category.key}
                                label={`${category.icon} ${category.label}`}
                                onClick={() =>
                                    setSelectedCategory(category.key)
                                }
                                variant={
                                    selectedCategory === category.key
                                        ? "accent"
                                        : "secondary"
                                }
                                className="text-sm"
                            />
                        ))}
                    </div>

                    <div className="text-center text-[var(--text-secondary)]">
                        {filteredPlaylists.length} playlist
                        {filteredPlaylists.length !== 1 ? "s" : ""} found
                        {selectedCategory !== "all" &&
                            ` in ${
                                categories.find(
                                    (c) => c.key === selectedCategory
                                )?.label
                            }`}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {filteredPlaylists.length === 0 ? (
                        <div className="flex justify-center">
                            <Card
                                variant="secondary"
                                className="text-center p-12 max-w-md"
                            >
                                <div className="text-6xl mb-4">🎵</div>
                                <h3 className="text-xl font-bold mb-2">
                                    No Playlists Found
                                </h3>
                                <p className="text-[var(--text-secondary)] mb-4">
                                    {searchTerm
                                        ? "Try adjusting your search terms or filters"
                                        : "No playlists available in this category"}
                                </p>
                                {(searchTerm || selectedCategory !== "all") && (
                                    <Button
                                        label="Clear Filters"
                                        onClick={() => {
                                            setSearchTerm("");
                                            setSelectedCategory("all");
                                        }}
                                        variant="primary"
                                    />
                                )}
                            </Card>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredPlaylists.map((playlist, index) => (
                                <motion.div
                                    key={playlist._id.toString()}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: index * 0.05,
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="h-full"
                                >
                                    <div className="relative group h-full">
                                        <div className="h-full">
                                            <PlaylistCard
                                                imageUrl={playlist.imageUrl}
                                                title={playlist.name}
                                                description={
                                                    playlist.description
                                                }
                                                onClick={() =>
                                                    handlePlaylistClick(
                                                        playlist
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs transition-transform duration-150 group-hover:translate-y-1">
                                            {playlist.playCount || 0} plays
                                        </div>

                                        <div className="absolute top-2 left-2 bg-[var(--accent)] text-white px-2 py-1 rounded text-xs transition-transform duration-150 group-hover:translate-y-1">
                                            {
                                                categories.find(
                                                    (c) =>
                                                        c.key ===
                                                        playlist.playlistType
                                                )?.icon
                                            }{" "}
                                            {playlist.playlistType}
                                        </div>

                                        <div className="absolute bottom-2 right-2 bg-[var(--primary)] text-[var(--text)] px-2 py-1 rounded text-xs transition-transform duration-150 group-hover:translate-y-1">
                                            {playlist.songCount || 0} songs
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center pt-8"
                >
                    <Button
                        label="Back to Home"
                        onClick={() => router.push("/")}
                        variant="secondary"
                        icon={<span>🏠</span>}
                    />
                </motion.div>
            </div>

            <FloatingNotesBackground />
        </div>
    );
}

export default PlaylistsPage;
