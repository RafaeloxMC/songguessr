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
    gameHistory: GameHistoryItem[];
    totalSongs: number;
}

interface GameHistoryItem {
    id: string;
    playlistName: string;
    gameMode: string;
    totalScore: number;
    maxPossibleScore: number;
    accuracy: number;
    totalRounds: number;
    sessionStartTime: Date;
    sessionEndTime?: Date;
    totalGameTime?: number;
}

function DashboardPage() {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<
        "overview" | "playlists" | "songs" | "history"
    >("overview");
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

    const createFetcher = (authToken: string) => async (url: string) => {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("token");
                router.push("/auth/login");
                throw new Error("Unauthorized");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`API Response for ${url}:`, data);
        return data;
    };

    const {
        data: userData,
        error: userError,
        isLoading: userLoading,
    } = useSWR(
        tokenChecked && token ? "/api/auth/me" : null,
        token ? createFetcher(token) : null,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    const {
        data: playlistsData,
        error: playlistsError,
        isLoading: playlistsLoading,
    } = useSWR(
        tokenChecked && token ? "/api/me/playlists" : null,
        token ? createFetcher(token) : null,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    const {
        data: songsData,
        error: songsError,
        isLoading: songsLoading,
    } = useSWR(
        tokenChecked && token ? "/api/songs" : null,
        token ? createFetcher(token) : null,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    const {
        data: gameHistoryData,
        error: gameHistoryError,
        isLoading: gameHistoryLoading,
    } = useSWR(
        tokenChecked && token ? "/api/me/game-history?limit=5" : null,
        token ? createFetcher(token) : null,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    useEffect(() => {
        if (userError || playlistsError || songsError || gameHistoryError) {
            const isAuthError = [
                userError,
                playlistsError,
                songsError,
                gameHistoryError,
            ].some(
                (error) =>
                    error &&
                    (error.message?.includes("Unauthorized") ||
                        error.status === 401)
            );

            if (isAuthError) {
                localStorage.removeItem("token");
                router.push("/auth/login");
                return;
            }
        }
    }, [userError, playlistsError, songsError, gameHistoryError, router]);

    const getSafeUserData = () => {
        if (!userData?.user && !userData?.id) return null;

        const rawUser = userData.user || userData;

        return {
            id: rawUser.id || rawUser._id,
            username: rawUser.username || "User",
            email: rawUser.email || "",
            gamesPlayed: rawUser.gamesPlayed || 0,
            gamesWon: rawUser.gamesWon || 0,
            totalScore: rawUser.totalScore || 0,
            bestScore: rawUser.bestScore || 0,
            averageScore: rawUser.averageScore || 0,
            ...rawUser,
        };
    };

    const safeUser = getSafeUserData();

    const getWinRate = () => {
        if (!safeUser) return 0;
        const { gamesPlayed = 0, gamesWon = 0 } = safeUser;
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

    const isLoading =
        userLoading || playlistsLoading || songsLoading || gameHistoryLoading;
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

    const hasError =
        userError || playlistsError || songsError || gameHistoryError;
    if (hasError) {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <Card variant="secondary" className="p-8 text-center">
                        <div className="text-4xl mb-4">❌</div>
                        <h2 className="text-xl font-bold mb-4">
                            Error Loading Dashboard
                        </h2>
                        <p className="mb-4">Failed to load dashboard data</p>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            {userError?.message ||
                                playlistsError?.message ||
                                songsError?.message ||
                                gameHistoryError?.message}
                        </p>
                        <Button
                            label="Try Again"
                            onClick={() => window.location.reload()}
                            variant="primary"
                        />
                    </Card>
                </div>
            </div>
        );
    }

    if (!safeUser) {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <Card variant="secondary" className="p-8 text-center">
                        <div className="text-4xl mb-4">🔒</div>
                        <h2 className="text-xl font-bold mb-4">
                            Authentication Required
                        </h2>
                        <p className="mb-4">
                            Please log in to access your dashboard
                        </p>
                        <Button
                            label="Go to Login"
                            onClick={() => router.push("/auth/login")}
                            variant="primary"
                        />
                    </Card>
                </div>
            </div>
        );
    }

    const isIncompleteUserData =
        safeUser && Object.keys(safeUser).length <= 2 && !safeUser.username;

    if (isIncompleteUserData) {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <Card variant="secondary" className="p-8 text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold mb-4">
                            Incomplete User Data
                        </h2>
                        <p className="mb-4">
                            Your user profile seems incomplete. This might
                            indicate an issue with the authentication system.
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            User ID: {safeUser.id}
                        </p>
                        <div className="space-x-2">
                            <Button
                                label="Refresh"
                                onClick={() => window.location.reload()}
                                variant="primary"
                            />
                            <Button
                                label="Re-login"
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    router.push("/auth/login");
                                }}
                                variant="secondary"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    const dashboardData: DashboardData = {
        user: safeUser,
        playlists: playlistsData?.playlists?.slice(0, 6) || [],
        recentSongs: songsData?.songs?.slice(0, 10) || [],
        gameHistory: gameHistoryData?.gameHistory || [],
        totalSongs: songsData?.songs?.length || 0,
    };

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
                    {(
                        ["overview", "playlists", "songs", "history"] as const
                    ).map((tab) => (
                        <Button
                            key={tab}
                            label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                            variant={
                                selectedTab === tab ? "accent" : "secondary"
                            }
                            onClick={() => setSelectedTab(tab)}
                        />
                    ))}
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
                                    number={(
                                        dashboardData.user.gamesPlayed ?? 0
                                    ).toString()}
                                    label="Games Played"
                                />
                                <StatCard
                                    number={(
                                        dashboardData.user.gamesWon ?? 0
                                    ).toString()}
                                    label="Games Won"
                                />
                                <StatCard
                                    number={(
                                        dashboardData.user.totalScore ?? 0
                                    ).toString()}
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
                                                {dashboardData.user.bestScore ??
                                                    0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Average Score
                                            </p>
                                            <p className="text-2xl font-bold text-[var(--accent)]">
                                                {Math.round(
                                                    dashboardData.user
                                                        .averageScore ?? 0
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
                                            router.push("/playlists")
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

                            {/* Recent Games */}
                            {dashboardData.gameHistory.length > 0 && (
                                <Card variant="primary" className="p-6">
                                    <h2 className="text-2xl font-bold mb-4 text-center">
                                        🎮 Recent Games
                                    </h2>
                                    <div className="space-y-3">
                                        {dashboardData.gameHistory.map(
                                            (game, index) => (
                                                <motion.div
                                                    key={game.id}
                                                    initial={{
                                                        opacity: 0,
                                                        x: -20,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    transition={{
                                                        duration: 0.3,
                                                        delay: index * 0.1,
                                                    }}
                                                >
                                                    <Card
                                                        variant="secondary"
                                                        className="p-4"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex-1">
                                                                <h3 className="font-semibold text-lg">
                                                                    {
                                                                        game.playlistName
                                                                    }
                                                                </h3>
                                                                <p className="text-sm text-[var(--text-secondary)]">
                                                                    {game.gameMode
                                                                        .charAt(
                                                                            0
                                                                        )
                                                                        .toUpperCase() +
                                                                        game.gameMode.slice(
                                                                            1
                                                                        )}{" "}
                                                                    Mode
                                                                </p>
                                                                <div className="flex gap-2 mt-2">
                                                                    <span className="bg-[var(--accent)] text-white px-2 py-1 rounded text-xs">
                                                                        Score:{" "}
                                                                        {
                                                                            game.totalScore
                                                                        }
                                                                        /
                                                                        {
                                                                            game.maxPossibleScore
                                                                        }
                                                                    </span>
                                                                    <span className="bg-[var(--secondary)] px-2 py-1 rounded text-xs">
                                                                        {Math.round(
                                                                            game.accuracy
                                                                        )}
                                                                        %
                                                                        accuracy
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-lg font-bold">
                                                                    {Math.round(
                                                                        (game.totalScore /
                                                                            game.maxPossibleScore) *
                                                                            100
                                                                    )}
                                                                    %
                                                                </div>
                                                                <div className="text-sm text-[var(--text-secondary)]">
                                                                    {new Date(
                                                                        game.sessionEndTime ||
                                                                            game.sessionStartTime
                                                                    ).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            )
                                        )}
                                    </div>
                                    <div className="text-center mt-4">
                                        <Button
                                            label="View All Games"
                                            onClick={() =>
                                                setSelectedTab("history")
                                            }
                                            variant="primary"
                                        />
                                    </div>
                                </Card>
                            )}
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
                                    🎵 My Playlists
                                </h2>
                                <div className="flex flex-col md:flex-row gap-2">
                                    <Button
                                        label="Create Playlist"
                                        onClick={() =>
                                            router.push("/playlists/create")
                                        }
                                        variant="primary"
                                    />
                                    <Button
                                        label="View All"
                                        onClick={() => router.push("/play")}
                                        variant="accent"
                                    />
                                </div>
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
                                                key={
                                                    song._id?.toString() ||
                                                    index
                                                }
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

                    {selectedTab === "history" && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-[var(--text)]">
                                    🎮 Game History
                                </h2>
                            </div>

                            {dashboardData.gameHistory.length > 0 ? (
                                <div className="space-y-4">
                                    {dashboardData.gameHistory.map(
                                        (game, index) => (
                                            <motion.div
                                                key={game.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: index * 0.05,
                                                }}
                                            >
                                                <Card
                                                    variant="primary"
                                                    className="p-6"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-xl mb-2">
                                                                {
                                                                    game.playlistName
                                                                }
                                                            </h3>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                                <div>
                                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                                        Game
                                                                        Mode
                                                                    </p>
                                                                    <p className="font-semibold">
                                                                        {game.gameMode
                                                                            .charAt(
                                                                                0
                                                                            )
                                                                            .toUpperCase() +
                                                                            game.gameMode.slice(
                                                                                1
                                                                            )}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                                        Score
                                                                    </p>
                                                                    <p className="font-semibold">
                                                                        {
                                                                            game.totalScore
                                                                        }
                                                                        /
                                                                        {
                                                                            game.maxPossibleScore
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                                        Accuracy
                                                                    </p>
                                                                    <p className="font-semibold">
                                                                        {Math.round(
                                                                            game.accuracy
                                                                        )}
                                                                        %
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                                        Rounds
                                                                    </p>
                                                                    <p className="font-semibold">
                                                                        {
                                                                            game.totalRounds
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 mb-2">
                                                                <span
                                                                    className={`px-3 py-1 rounded text-sm font-semibold ${
                                                                        game.totalScore /
                                                                            game.maxPossibleScore >=
                                                                        0.8
                                                                            ? "bg-green-100 text-green-800"
                                                                            : game.totalScore /
                                                                                  game.maxPossibleScore >=
                                                                              0.6
                                                                            ? "bg-yellow-100 text-yellow-800"
                                                                            : "bg-red-100 text-red-800"
                                                                    }`}
                                                                >
                                                                    {Math.round(
                                                                        (game.totalScore /
                                                                            game.maxPossibleScore) *
                                                                            100
                                                                    )}
                                                                    % Score
                                                                </span>
                                                                {game.totalGameTime && (
                                                                    <span className="bg-[var(--secondary)] px-3 py-1 rounded text-sm">
                                                                        {Math.round(
                                                                            game.totalGameTime /
                                                                                1000 /
                                                                                60
                                                                        )}{" "}
                                                                        min
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm text-[var(--text-secondary)]">
                                                                {new Date(
                                                                    game.sessionEndTime ||
                                                                        game.sessionStartTime
                                                                ).toLocaleDateString()}
                                                            </div>
                                                            <div className="text-xs text-[var(--text-secondary)]">
                                                                {new Date(
                                                                    game.sessionEndTime ||
                                                                        game.sessionStartTime
                                                                ).toLocaleTimeString()}
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
                                    <div className="text-4xl mb-4">🎮</div>
                                    <h3 className="text-xl font-bold mb-2">
                                        No Game History Yet
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                                        Start playing to see your game history
                                        here!
                                    </p>
                                    <Button
                                        label="Play Your First Game"
                                        onClick={() => router.push("/play")}
                                        variant="accent"
                                    />
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
