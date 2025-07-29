"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "@/components/card";
import Button from "@/components/button";
import FloatingNotesBackground from "@/components/floatingnotesbg";

interface LeaderboardEntry {
    id: string;
    username: string;
    totalScore: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    averageScore: number;
    bestScore?: number;
    rank: number;
}

interface LeaderboardResponse {
    success: boolean;
    data: LeaderboardEntry[];
    metadata: {
        timeFilter: string;
        totalPlayers: number;
        generatedAt: string;
    };
    error?: string;
}

function LeaderboardPage() {
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
        []
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">(
        "all"
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(
                    `/api/leaderboard?timeFilter=${timeFilter}`
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch leaderboard data");
                }
                const result: LeaderboardResponse = await response.json();

                if (!result.success) {
                    throw new Error(
                        result.error || "Failed to fetch leaderboard data"
                    );
                }

                setLeaderboardData(result.data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load leaderboard"
                );
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timeFilter]);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return "🥇";
            case 2:
                return "🥈";
            case 3:
                return "🥉";
            default:
                return `#${rank}`;
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return "from-yellow-400 to-yellow-600";
            case 2:
                return "from-gray-300 to-gray-500";
            case 3:
                return "from-amber-600 to-amber-800";
            default:
                return "from-[var(--secondary)] to-[var(--primary)]";
        }
    };

    const getTimeFilterLabel = (filter: string) => {
        switch (filter) {
            case "week":
                return "This Week";
            case "month":
                return "This Month";
            default:
                return "All Time";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <motion.div
                        className="text-2xl text-[var(--text)]"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        Loading leaderboard...
                    </motion.div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] relative mt-16">
                <FloatingNotesBackground />
                <div className="flex items-center justify-center min-h-screen">
                    <Card variant="secondary" className="p-8 text-center">
                        <div className="text-4xl mb-4">❌</div>
                        <h2 className="text-xl font-bold mb-4">
                            Error Loading Leaderboard
                        </h2>
                        <p className="mb-4">{error}</p>
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

    return (
        <div className="min-h-screen bg-[var(--background)] relative mt-16">
            <FloatingNotesBackground />

            <div className="container mx-auto px-4 py-8 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <h1 className="text-5xl font-bold text-[var(--text)]">
                        🏆 Leaderboard
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)]">
                        See how you stack up against other music masters
                    </p>
                    <div className="text-sm text-[var(--text-secondary)] bg-[var(--secondary)] px-3 py-1 rounded-full inline-block">
                        {getTimeFilterLabel(timeFilter)}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-center gap-2 flex-wrap"
                >
                    {(["all", "month", "week"] as const).map((filter) => (
                        <Button
                            key={filter}
                            label={getTimeFilterLabel(filter)}
                            onClick={() => setTimeFilter(filter)}
                            variant={
                                timeFilter === filter ? "accent" : "secondary"
                            }
                            className="text-sm"
                        />
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto"
                >
                    {leaderboardData.length === 0 ? (
                        <Card variant="primary" className="p-12 text-center">
                            <div className="text-6xl mb-4">🎵</div>
                            <h2 className="text-2xl font-bold mb-4">
                                {timeFilter === "all"
                                    ? "No Players Yet"
                                    : `No Games ${getTimeFilterLabel(
                                          timeFilter
                                      )}`}
                            </h2>
                            <p className="text-[var(--text-secondary)] mb-6">
                                {timeFilter === "all"
                                    ? "Be the first to climb the leaderboard!"
                                    : `No one has played any games ${
                                          timeFilter === "week"
                                              ? "this week"
                                              : "this month"
                                      } yet.`}
                            </p>
                            <Button
                                label="Start Playing"
                                onClick={() => (window.location.href = "/play")}
                                variant="accent"
                            />
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {leaderboardData.length >= 3 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="mb-8"
                                >
                                    <Card variant="primary" className="p-8">
                                        <div className="flex justify-center items-end gap-4 sm:gap-8">
                                            <div className="text-center">
                                                <div className="relative">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-xl sm:text-2xl font-bold text-white mb-4 mx-auto">
                                                        🥈
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 bg-[var(--accent)] text-[var(--text)] rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold">
                                                        2
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-sm sm:text-lg truncate max-w-20 sm:max-w-24">
                                                    {
                                                        leaderboardData[1]
                                                            ?.username
                                                    }
                                                </h3>
                                                <p className="text-[var(--text-secondary)] font-semibold text-xs sm:text-base">
                                                    {leaderboardData[1]?.totalScore?.toLocaleString()}{" "}
                                                    pts
                                                </p>
                                                <div className="bg-gray-300 h-12 w-16 sm:h-16 sm:w-20 mt-4 rounded-t-lg mx-auto"></div>
                                            </div>

                                            <div className="text-center">
                                                <div className="relative">
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl sm:text-3xl mb-4 mx-auto shadow-lg">
                                                        👑
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 bg-[var(--accent)] text-[var(--text)] rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-lg font-bold">
                                                        1
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-lg sm:text-xl truncate max-w-24 sm:max-w-28">
                                                    {
                                                        leaderboardData[0]
                                                            ?.username
                                                    }
                                                </h3>
                                                <p className="text-[var(--text-secondary)] font-semibold text-sm sm:text-lg">
                                                    {leaderboardData[0]?.totalScore?.toLocaleString()}{" "}
                                                    pts
                                                </p>
                                                <div className="bg-yellow-400 h-16 w-20 sm:h-20 sm:w-24 mt-4 rounded-t-lg mx-auto"></div>
                                            </div>

                                            <div className="text-center">
                                                <div className="relative">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-xl sm:text-2xl font-bold text-white mb-4 mx-auto">
                                                        🥉
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 bg-[var(--accent)] text-[var(--text)] rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold">
                                                        3
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-sm sm:text-lg truncate max-w-20 sm:max-w-24">
                                                    {
                                                        leaderboardData[2]
                                                            ?.username
                                                    }
                                                </h3>
                                                <p className="text-[var(--text-secondary)] font-semibold text-xs sm:text-base">
                                                    {leaderboardData[2]?.totalScore?.toLocaleString()}{" "}
                                                    pts
                                                </p>
                                                <div className="bg-amber-700 h-10 w-16 sm:h-12 sm:w-20 mt-4 rounded-t-lg mx-auto"></div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            <div className="space-y-3">
                                {leaderboardData.map((player, index) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{
                                            opacity: 0,
                                            x: -20,
                                        }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            delay: 0.4 + index * 0.05,
                                        }}
                                    >
                                        <motion.div
                                            key={"h-" + player.id}
                                            initial={{
                                                scale: 1,
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <Card
                                                variant={
                                                    index < 3
                                                        ? "accent"
                                                        : "primary"
                                                }
                                                className={`p-4 ${
                                                    index < 3 ? "shadow-lg" : ""
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRankColor(
                                                                player.rank
                                                            )} flex items-center justify-center font-bold text-white shadow-md`}
                                                        >
                                                            {typeof getRankIcon(
                                                                player.rank
                                                            ) === "string" &&
                                                            getRankIcon(
                                                                player.rank
                                                            ).startsWith(
                                                                "#"
                                                            ) ? (
                                                                <span className="text-sm">
                                                                    {getRankIcon(
                                                                        player.rank
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="text-lg">
                                                                    {getRankIcon(
                                                                        player.rank
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-lg text-[var(--text)]">
                                                                {
                                                                    player.username
                                                                }
                                                            </h3>
                                                            <div className="flex gap-4 text-sm text-[var(--text-secondary)] flex-wrap">
                                                                <span>
                                                                    {player.gamesPlayed ||
                                                                        0}{" "}
                                                                    games
                                                                </span>
                                                                <span>
                                                                    {
                                                                        player.winRate
                                                                    }
                                                                    % win rate
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-xl sm:text-2xl font-bold text-[var(--text)]">
                                                            {player.totalScore?.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
                                                            points
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-center pt-8"
                            >
                                <Card variant="secondary" className="p-8">
                                    <div className="text-4xl mb-4">🎯</div>
                                    <h2 className="text-2xl font-bold mb-4">
                                        Think You Can Do Better?
                                    </h2>
                                    <p className="text-[var(--text-secondary)] mb-6">
                                        Challenge yourself and climb the
                                        leaderboard!
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Button
                                            label="🎮 Start Playing"
                                            onClick={() =>
                                                (window.location.href = "/play")
                                            }
                                            variant="accent"
                                        />
                                        <Button
                                            label="🏠 Back to Home"
                                            onClick={() =>
                                                (window.location.href = "/")
                                            }
                                            variant="primary"
                                        />
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

export default LeaderboardPage;
