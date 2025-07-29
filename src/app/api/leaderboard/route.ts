import { connectDB } from "@/database/db";
import User from "@/database/schemas/User";
import GameSession from "@/database/schemas/GameSession";
import { GameStatus } from "@/util/enums/GameStatus";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

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
}

interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
}

interface UserLeanResult {
    _id: Types.ObjectId;
    username: string;
    totalScore?: number;
    gamesPlayed?: number;
    gamesWon?: number;
    averageScore?: number;
    bestScore?: number;
}

const VALID_TIME_FILTERS = ["all", "week", "month"] as const;
type TimeFilter = (typeof VALID_TIME_FILTERS)[number];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(
    request: NextRequest
): Promise<NextResponse<LeaderboardResponse | ErrorResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const timeFilter =
            searchParams.get("timeFilter")?.toLowerCase() || "all";
        const limitParam = searchParams.get("limit");

        if (!VALID_TIME_FILTERS.includes(timeFilter as TimeFilter)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid timeFilter. Must be one of: ${VALID_TIME_FILTERS.join(
                        ", "
                    )}`,
                    code: "INVALID_TIME_FILTER",
                },
                { status: 400 }
            );
        }

        let limit = DEFAULT_LIMIT;
        if (limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if (isNaN(parsedLimit) || parsedLimit < 1) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Limit must be a positive integer",
                        code: "INVALID_LIMIT",
                    },
                    { status: 400 }
                );
            }
            limit = Math.min(parsedLimit, MAX_LIMIT);
        }

        await connectDB();

        let leaderboardData: Omit<LeaderboardEntry, "rank">[] = [];

        if (timeFilter === "all") {
            const users = await User.find(
                { gamesPlayed: { $gt: 0 } },
                {
                    username: 1,
                    totalScore: 1,
                    gamesPlayed: 1,
                    gamesWon: 1,
                    averageScore: 1,
                    bestScore: 1,
                }
            )
                .sort({ totalScore: -1, gamesWon: -1, username: 1 })
                .limit(limit)
                .lean<UserLeanResult[]>();

            leaderboardData = users.map((user) => ({
                id: user._id.toString(),
                username: user.username,
                totalScore: user.totalScore || 0,
                gamesPlayed: user.gamesPlayed || 0,
                gamesWon: user.gamesWon || 0,
                winRate:
                    user.gamesPlayed && user.gamesPlayed > 0
                        ? Math.round(
                              ((user.gamesWon || 0) / user.gamesPlayed) * 100
                          )
                        : 0,
                averageScore: Math.round(user.averageScore || 0),
                bestScore: user.bestScore || 0,
            }));
        } else {
            const now = new Date();
            let startDate: Date;

            if (timeFilter === "week") {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (timeFilter === "month") {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else {
                startDate = new Date(0);
            }

            const aggregateResult = await GameSession.aggregate([
                {
                    $match: {
                        status: GameStatus.COMPLETED,
                        sessionEndTime: { $gte: startDate, $lte: now },
                    },
                },
                {
                    $group: {
                        _id: "$userId",
                        totalScore: { $sum: "$totalScore" },
                        gamesPlayed: { $sum: 1 },
                        gamesWon: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$totalScore",
                                            "$maxPossibleScore",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        averageScore: { $avg: "$totalScore" },
                        bestScore: { $max: "$totalScore" },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                {
                    $unwind: "$user",
                },
                {
                    $project: {
                        id: "$_id",
                        username: "$user.username",
                        totalScore: 1,
                        gamesPlayed: 1,
                        gamesWon: 1,
                        averageScore: { $round: ["$averageScore", 0] },
                        bestScore: 1,
                        winRate: {
                            $round: [
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                "$gamesWon",
                                                "$gamesPlayed",
                                            ],
                                        },
                                        100,
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $sort: {
                        totalScore: -1,
                        gamesWon: -1,
                        winRate: -1,
                        username: 1,
                    },
                },
                {
                    $limit: limit,
                },
            ]);

            leaderboardData = aggregateResult.map((result) => ({
                id: result.id.toString(),
                username: result.username || "Unknown Player",
                totalScore: result.totalScore || 0,
                gamesPlayed: result.gamesPlayed || 0,
                gamesWon: result.gamesWon || 0,
                winRate: result.winRate || 0,
                averageScore: result.averageScore || 0,
                bestScore: result.bestScore || 0,
            }));
        }

        const rankedLeaderboardData: LeaderboardEntry[] = leaderboardData.map(
            (entry, index) => ({
                ...entry,
                rank: index + 1,
            })
        );

        const response: LeaderboardResponse = {
            success: true,
            data: rankedLeaderboardData,
            metadata: {
                timeFilter,
                totalPlayers: rankedLeaderboardData.length,
                generatedAt: new Date().toISOString(),
            },
        };

        return NextResponse.json(response, {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control":
                    "public, max-age=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);

        if (error instanceof Error) {
            if (error.message.includes("connection")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Database connection failed",
                        code: "DATABASE_ERROR",
                    },
                    { status: 503 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch leaderboard data",
                code: "INTERNAL_ERROR",
            },
            { status: 500 }
        );
    }
}
