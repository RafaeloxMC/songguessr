"use client";
import Button from "@/components/button";
import Card from "@/components/card";
import FloatingNotesBackground from "@/components/floatingnotesbg";
import PlaylistCard from "@/components/playlistcard";
import { IPlaylist } from "@/database/schemas/Playlist";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PlayPage = () => {
    const [gameMode, setGameMode] = useState<string | null>(null);
    const [playlists, setPlaylists] = useState<IPlaylist[]>([]);
    const [playlist, setPlaylist] = useState<string | null>(null);

    const router = useRouter();

    const { data, error, isLoading } = useSWR<IPlaylist[]>(
        "/api/playlists",
        fetcher
    );

    React.useEffect(() => {
        if (data) {
            setPlaylists(data);
        }
    }, [data]);

    const resetSelection = () => {
        setGameMode(null);
        setPlaylist(null);
    };

    const getGameModeIcon = (mode: string) => {
        switch (mode) {
            case "classic":
                return "🎵";
            case "artist":
                return "🎤";
            case "emoji":
                return "😊";
            case "lyrics":
                return "📝";
            default:
                return "🎮";
        }
    };

    const getSelectedPlaylistName = () => {
        const selectedPlaylist = playlists.find(
            (p) => p._id.toString() === playlist
        );
        return selectedPlaylist ? selectedPlaylist.name : playlist;
    };

    const GameModeCard = ({
        icon,
        title,
        description,
        disabled = false,
        onClick,
    }: {
        mode: string;
        icon: string;
        title: string;
        description: string;
        disabled?: boolean;
        onClick: () => void;
    }) => (
        <motion.div
            whileHover={disabled ? {} : { scale: 1.05, y: -4 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                variant={disabled ? "secondary" : "primary"}
                className={`cursor-pointer hover:shadow-none hover:translate-y-1 h-full ${
                    disabled
                        ? "opacity-50 cursor-not-allowed hover:shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-0"
                        : ""
                }`}
                onClick={disabled ? undefined : onClick}
            >
                <div className="text-center space-y-4">
                    <motion.div
                        className={`text-6xl ${disabled ? "grayscale" : ""}`}
                        whileHover={disabled ? {} : { scale: 1.2, rotate: 5 }}
                        transition={{ duration: 0.3 }}
                    >
                        {icon}
                    </motion.div>
                    <h3
                        className={`text-xl font-bold ${
                            disabled ? "text-gray-500" : ""
                        }`}
                    >
                        {title}
                    </h3>
                    <p
                        className={`text-sm leading-relaxed ${
                            disabled ? "text-gray-400" : ""
                        }`}
                    >
                        {description}
                    </p>
                    {disabled && (
                        <div className="mt-2 px-3 py-1 bg-gray-600 text-gray-300 rounded-full text-xs">
                            Coming Soon
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-[var(--background)] relative mt-16">
            <FloatingNotesBackground />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 text-center pt-8 pb-4"
            >
                <h1 className="text-5xl md:text-6xl font-bold mb-4 text-[var(--text)]">
                    SongGuessr
                </h1>
                <p className="text-xl text-[var(--text-secondary)]">
                    Ready to test your music knowledge?
                </p>
            </motion.div>

            <div className="relative z-10 flex flex-col items-center justify-start min-h-[calc(100vh-200px)] px-4 py-8">
                <div className="w-full max-w-6xl">
                    {!gameMode && !playlist ? (
                        /* Game Mode Selection */
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-center"
                        >
                            <h2 className="text-3xl font-bold text-[var(--text)] mb-8">
                                Choose Your Game Mode
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                                <GameModeCard
                                    mode="classic"
                                    icon="🎵"
                                    title="Classic Mode"
                                    description="Guess the song by hearing a short clip. The longer you listen, the fewer points you earn!"
                                    onClick={() => setGameMode("classic")}
                                />
                                <GameModeCard
                                    mode="artist"
                                    icon="🎤"
                                    title="Artist Mode"
                                    description="Hear the song and guess who performs it. Test your knowledge of artists and bands!"
                                    onClick={() => setGameMode("artist")}
                                />
                                <GameModeCard
                                    mode="emoji"
                                    icon="😊"
                                    title="By Emojis"
                                    description="Decode the song title using only descriptive emojis. Think you can crack the code?"
                                    onClick={() => setGameMode("emoji")}
                                    disabled
                                />
                                <GameModeCard
                                    mode="lyrics"
                                    icon="📝"
                                    title="By Lyrics"
                                    description="Identify the song from its lyrics. Perfect for poetry and music lovers!"
                                    onClick={() => setGameMode("lyrics")}
                                    disabled
                                />
                            </div>
                        </motion.div>
                    ) : !playlist ? (
                        /* Playlist Selection */
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <span className="text-4xl">
                                    {getGameModeIcon(gameMode!)}
                                </span>
                                <h2 className="text-3xl font-bold text-[var(--text)]">
                                    Choose Your Playlist
                                </h2>
                            </div>
                            <Card
                                variant="secondary"
                                className="mb-8 max-w-md mx-auto"
                            >
                                <p className="text-center text-[var(--text)]">
                                    Playing in{" "}
                                    <span className="font-bold text-[var(--text-secondary)]">
                                        {gameMode}
                                    </span>{" "}
                                    mode.{" "}
                                    <span
                                        className="underline text-[var(--text-secondary)] cursor-pointer"
                                        onClick={resetSelection}
                                    >
                                        Change mode
                                    </span>
                                </p>
                            </Card>

                            {isLoading ? (
                                /* Loading State */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[...Array(6)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                delay: i * 0.1,
                                            }}
                                        >
                                            <Card
                                                variant="primary"
                                                className="h-64 animate-pulse"
                                            >
                                                <div className="bg-[var(--secondary)] rounded-lg h-32 mb-4"></div>
                                                <div className="bg-[var(--secondary)] rounded h-4 mb-2"></div>
                                                <div className="bg-[var(--secondary)] rounded h-3 w-3/4 mx-auto"></div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : error ? (
                                /* Error State */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="max-w-md mx-auto"
                                >
                                    <Card
                                        variant="accent"
                                        className="text-center"
                                    >
                                        <div className="text-4xl mb-4">⚠️</div>
                                        <h3 className="text-xl font-bold mb-2">
                                            Failed to Load Playlists
                                        </h3>
                                        <p className="text-sm mb-4">
                                            Something went wrong while loading
                                            the playlists. Please try again.
                                        </p>
                                        <Button
                                            label="Retry"
                                            variant="primary"
                                            onClick={() =>
                                                window.location.reload()
                                            }
                                        />
                                    </Card>
                                </motion.div>
                            ) : playlists.length === 0 ? (
                                /* Empty State */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="max-w-md mx-auto"
                                >
                                    <Card
                                        variant="secondary"
                                        className="text-center"
                                    >
                                        <div className="text-4xl mb-4">🎵</div>
                                        <h3 className="text-xl font-bold mb-2">
                                            No Playlists Available
                                        </h3>
                                        <p className="text-sm">
                                            There are no playlists available at
                                            the moment. Check back later!
                                        </p>
                                    </Card>
                                </motion.div>
                            ) : (
                                /* Playlists Grid */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {playlists.map((playlistItem, index) => (
                                        <motion.div
                                            key={playlistItem.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                delay: index * 0.1,
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <PlaylistCard
                                                imageUrl={playlistItem.imageUrl}
                                                title={playlistItem.name}
                                                description={
                                                    playlistItem.description
                                                }
                                                onClick={() => {
                                                    setPlaylist(
                                                        playlistItem._id.toString()
                                                    );
                                                    if (window) {
                                                        window.scrollTo({
                                                            top: 0,
                                                            behavior: "smooth",
                                                        });
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* Game Start */
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center max-w-2xl mx-auto"
                        >
                            <Card variant="primary" className="p-8">
                                <motion.div
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                    }}
                                    className="text-6xl mb-6"
                                >
                                    🎮
                                </motion.div>
                                <h2 className="text-3xl font-bold mb-6">
                                    Ready to Play!
                                </h2>
                                <Card variant="secondary" className="mb-8">
                                    <div className="space-y-2">
                                        <p>
                                            <span className="font-bold text-[var(--text-secondary)]">
                                                Game Mode:
                                            </span>{" "}
                                            {gameMode}
                                        </p>
                                        <p>
                                            <span className="font-bold text-[var(--text-secondary)]">
                                                Playlist:
                                            </span>{" "}
                                            {getSelectedPlaylistName()}
                                        </p>
                                    </div>
                                </Card>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button
                                        label="Start Game"
                                        variant="accent"
                                        onClick={() => {
                                            router.push(
                                                `/game/${encodeURIComponent(
                                                    gameMode!
                                                )}/${encodeURIComponent(
                                                    playlist!
                                                )}`
                                            );
                                        }}
                                    />
                                    <Button
                                        label="Change Settings"
                                        variant="secondary"
                                        onClick={resetSelection}
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayPage;
