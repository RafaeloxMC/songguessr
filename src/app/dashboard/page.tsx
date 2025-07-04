"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/button";
import Card from "@/components/card";
import PlaylistCard from "@/components/playlistcard";
import FloatingNotesBackground from "@/components/floatingnotesbg";
import { StatCard } from "@/components/hero/statscard";
import { IPlaylist } from "@/database/schemas/Playlist";
import { ISong } from "@/database/schemas/Song";
import { IUser } from "@/database/schemas/User";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface DashboardData {
    user: IUser;
    playlists: IPlaylist[];
    recentSongs: ISong[];
    totalSongs: number;
}

function DashboardPage() {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<
        "overview" | "playlists" | "songs"
    >("overview");
    const [isLoading, setIsLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(
        null
    );
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [tokenChecked, setTokenChecked] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            router.push("/auth/login");
            return;
        }
        setToken(storedToken);
        setTokenChecked(true);
    }, [router]);

    const createFetcher = (authToken: string) => (url: string) => {
        return fetch(url, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        }).then((res) => res.json());
    };

    const { data: userData, error: userError } = useSWR(
        tokenChecked && token ? "/api/auth/me" : null,
        token ? createFetcher(token) : null
    );

    const { data: playlistsData, error: playlistsError } = useSWR(
        tokenChecked && token ? "/api/playlists" : null,
        token ? createFetcher(token) : null
    );

    const { data: songsData, error: songsError } = useSWR(
        tokenChecked && token ? "/api/songs" : null,
        token ? createFetcher(token) : null
    );

    useEffect(() => {
        if (userData && playlistsData && songsData) {
            if (userData.success && userData.user) {
                setDashboardData({
                    user: userData.user,
                    playlists: playlistsData.slice(0, 6),
                    recentSongs: songsData.songs?.slice(0, 10) || [],
                    totalSongs: songsData.songs?.length || 0,
                });
                setIsLoading(false);
            } else {
                setError("User not authenticated");
                setIsLoading(false);
            }
        } else if (userError || playlistsError || songsError) {
            if (
                userError &&
                (userError.status === 401 ||
                    userError.message?.includes("Unauthorized"))
            ) {
                localStorage.removeItem("token");
                router.push("/auth/login");
                return;
            }
            setError("Failed to load dashboard data");
            setIsLoading(false);
        }
    }, [
        userData,
        playlistsData,
        songsData,
        userError,
        playlistsError,
        songsError,
        router,
    ]);

    useEffect(() => {
        if (error === "User not authenticated") {
            localStorage.removeItem("token");
            router.push("/auth/login");
        }
    }, [error, router]);

    const getWinRate = () => {
        if (!dashboardData?.user) return 0;
        const { gamesPlayed, gamesWon } = dashboardData.user;
        return gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
    };

    const getPerformanceMessage = () => {
        const winRate = getWinRate();
        if (winRate >= 80) return "🏆 Master Player!";
        if (winRate >= 60) return "🎯 Great Performance!";
        if (winRate >= 40) return "📈 Keep Improving!";
        return "🎵 Keep Playing!";
    };

    if (!tokenChecked) {
        return null;
    }

    if (!token) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <motion.div
                        className="text-2xl text-[var(--text)]"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        Loading your dashboard...
                    </motion.div>
                </div>
            </div>
        );
    }

    if (error && error !== "User not authenticated") {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <Card variant="secondary" className="p-8 text-center">
                        <div className="text-4xl mb-4">❌</div>
                        <h2 className="text-xl font-bold mb-4">
                            Error Loading Dashboard
                        </h2>
                        <p className="mb-4">{error}</p>
                        <Button
                            label="Try Again"
                            onClick={() => router.refresh()}
                            variant="primary"
                        />
                    </Card>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--background)] relative mt-16">
            <FloatingNotesBackground />

            <div className="container mx-auto px-4 py-8 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-4"
                >
                    <h1 className="text-4xl font-bold text-[var(--text)]">
                        🎵 Welcome back, {dashboardData.user.username}!
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)]">
                        Your music guessing journey awaits
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex justify-center space-x-4"
                >
                    {(["overview", "playlists", "songs"] as const).map(
                        (tab) => (
                            <Button
                                key={tab}
                                label={
                                    tab.charAt(0).toUpperCase() + tab.slice(1)
                                }
                                variant={
                                    selectedTab === tab ? "accent" : "secondary"
                                }
                                onClick={() => setSelectedTab(tab)}
                            />
                        )
                    )}
                </motion.div>

                <AnimatePresence mode="wait">
                    {selectedTab === "overview" && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    number={dashboardData.user.gamesPlayed.toString()}
                                    label="Games Played"
                                />
                                <StatCard
                                    number={dashboardData.user.gamesWon.toString()}
                                    label="Games Won"
                                />
                                <StatCard
                                    number={dashboardData.user.totalScore.toString()}
                                    label="Total Score"
                                />
                                <StatCard
                                    number={`${getWinRate()}%`}
                                    label="Win Rate"
                                />
                            </div>

                            {/* Performance Summary */}
                            <Card variant="primary" className="p-6">
                                <h2 className="text-2xl font-bold mb-4 text-center">
                                    🎯 Your Performance
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Best Score
                                            </p>
                                            <p className="text-2xl font-bold text-[var(--accent)]">
                                                {dashboardData.user.bestScore}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Average Score
                                            </p>
                                            <p className="text-2xl font-bold text-[var(--accent)]">
                                                {Math.round(
                                                    dashboardData.user
                                                        .averageScore
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <Card
                                            variant="accent"
                                            className="text-center p-4"
                                        >
                                            <div className="text-3xl mb-2">
                                                {
                                                    getPerformanceMessage().split(
                                                        " "
                                                    )[0]
                                                }
                                            </div>
                                            <p className="font-semibold">
                                                {getPerformanceMessage().substring(
                                                    2
                                                )}
                                            </p>
                                        </Card>
                                    </div>
                                </div>
                            </Card>

                            {/* Quick Actions */}
                            <Card variant="secondary" className="p-6">
                                <h2 className="text-2xl font-bold mb-4 text-center">
                                    🚀 Quick Actions
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Button
                                        label="Play Now"
                                        icon={<span>🎮</span>}
                                        onClick={() => router.push("/play")}
                                        variant="accent"
                                    />
                                    <Button
                                        label="Browse Playlists"
                                        icon={<span>📚</span>}
                                        onClick={() =>
                                            setSelectedTab("playlists")
                                        }
                                        variant="primary"
                                    />
                                    <Button
                                        label="View Songs"
                                        icon={<span>🎵</span>}
                                        onClick={() => setSelectedTab("songs")}
                                        variant="secondary"
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {selectedTab === "playlists" && (
                        <motion.div
                            key="playlists"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-[var(--text)]">
                                    🎵 Available Playlists
                                </h2>
                                <Button
                                    label="View All"
                                    onClick={() => router.push("/play")}
                                    variant="accent"
                                />
                            </div>

                            {dashboardData.playlists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center items-center">
                                    {dashboardData.playlists.map(
                                        (playlistItem, index) => (
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
                                                    imageUrl={
                                                        playlistItem.imageUrl
                                                    }
                                                    title={playlistItem.name}
                                                    description={
                                                        playlistItem.description
                                                    }
                                                    onClick={() =>
                                                        router.push(
                                                            `/playlists/${playlistItem.id}`
                                                        )
                                                    }
                                                />
                                            </motion.div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <Card
                                    variant="secondary"
                                    className="text-center py-12"
                                >
                                    <div className="text-4xl mb-4">🎵</div>
                                    <h3 className="text-xl font-bold mb-2">
                                        No Playlists Available
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Check back later for new playlists!
                                    </p>
                                </Card>
                            )}
                        </motion.div>
                    )}

                    {selectedTab === "songs" && (
                        <motion.div
                            key="songs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-[var(--text)]">
                                    🎼 Recent Songs ({dashboardData.totalSongs}{" "}
                                    total)
                                </h2>
                            </div>

                            {dashboardData.recentSongs.length > 0 ? (
                                <div className="space-y-4">
                                    {dashboardData.recentSongs.map(
                                        (song, index) => (
                                            <motion.div
                                                key={song._id?.toString()}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: index * 0.05,
                                                }}
                                            >
                                                <Card
                                                    variant="primary"
                                                    className="p-4"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg">
                                                                {song.title}
                                                            </h3>
                                                            <p className="text-[var(--text-secondary)]">
                                                                by {song.artist}
                                                            </p>
                                                            <div className="flex gap-2 mt-2">
                                                                <span className="bg-[var(--accent)] px-2 py-1 rounded text-xs">
                                                                    {
                                                                        song.difficulty
                                                                    }
                                                                </span>
                                                                {song.genres &&
                                                                    song.genres
                                                                        .length >
                                                                        0 && (
                                                                        <span className="bg-[var(--secondary)] px-2 py-1 rounded text-xs">
                                                                            {
                                                                                song
                                                                                    .genres[0]
                                                                            }
                                                                        </span>
                                                                    )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm text-[var(--text-secondary)]">
                                                                {song.playCount}{" "}
                                                                plays
                                                            </div>
                                                            <div className="text-sm text-[var(--text-secondary)]">
                                                                {song.playCount >
                                                                0
                                                                    ? Math.round(
                                                                          (song.correctGuesses /
                                                                              song.playCount) *
                                                                              100
                                                                      )
                                                                    : 0}
                                                                % success
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <Card
                                    variant="secondary"
                                    className="text-center py-12"
                                >
                                    <div className="text-4xl mb-4">🎼</div>
                                    <h3 className="text-xl font-bold mb-2">
                                        No Songs Available
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Songs will appear here once they&apos;re
                                        added to the database.
                                    </p>
                                </Card>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default DashboardPage;
