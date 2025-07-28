import { connectDB } from "@/database/db";
import User from "@/database/schemas/User";
import GameSession, {
    IGameSession,
    IGameRound,
} from "@/database/schemas/GameSession";
import { GameStatus } from "@/util/enums/GameStatus";
import { Types } from "mongoose";

interface GameStats {
    totalScore: number;
    maxPossibleScore: number;
    accuracy: number;
    isWin: boolean;
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

export class UserStatsService {
    static async updateUserStatsAfterGame(
        userId: string | Types.ObjectId,
        gameSessionId: string | Types.ObjectId
    ): Promise<void> {
        try {
            await connectDB();

            const gameSession = await GameSession.findById(gameSessionId);
            if (!gameSession) {
                throw new Error("Game session not found");
            }

            if (gameSession.status !== GameStatus.COMPLETED) {
                throw new Error("Game session is not completed");
            }

            if (gameSession.userId.toString() !== userId.toString()) {
                throw new Error("Game session does not belong to the user");
            }

            const gameStats = this.calculateGameStats(gameSession);

            await this.updateUserStatistics(userId, gameStats);
        } catch (error) {
            console.error("Error updating user stats:", error);
            throw error;
        }
    }

    private static calculateGameStats(gameSession: IGameSession): GameStats {
        const totalScore = gameSession.totalScore || 0;
        const maxPossibleScore = gameSession.maxPossibleScore || 0;

        const completedRounds = gameSession.rounds.filter(
            (round: IGameRound) => round.roundEndTime
        );
        const correctRounds = completedRounds.filter(
            (round: IGameRound) => round.isCorrect
        );
        const accuracy =
            completedRounds.length > 0
                ? (correctRounds.length / completedRounds.length) * 100
                : 0;

        const scorePercentage =
            maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
        const isWin = scorePercentage >= 60;

        return {
            totalScore,
            maxPossibleScore,
            accuracy,
            isWin,
        };
    }

    private static async updateUserStatistics(
        userId: string | Types.ObjectId,
        gameStats: GameStats
    ): Promise<void> {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const previousGamesPlayed = user.gamesPlayed || 0;
        const previousTotalScore = user.totalScore || 0;
        const previousGamesWon = user.gamesWon || 0;
        const previousBestScore = user.bestScore || 0;

        const newGamesPlayed = previousGamesPlayed + 1;
        const newTotalScore = previousTotalScore + gameStats.totalScore;
        const newGamesWon = previousGamesWon + (gameStats.isWin ? 1 : 0);
        const newAverageScore = newTotalScore / newGamesPlayed;
        const newBestScore = Math.max(previousBestScore, gameStats.totalScore);

        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    gamesPlayed: newGamesPlayed,
                    totalScore: newTotalScore,
                    gamesWon: newGamesWon,
                    averageScore: newAverageScore,
                    bestScore: newBestScore,
                },
            },
            { new: true }
        );

        console.log(`Updated stats for user ${userId}:`, {
            gamesPlayed: newGamesPlayed,
            totalScore: newTotalScore,
            gamesWon: newGamesWon,
            averageScore: Math.round(newAverageScore * 100) / 100,
            bestScore: newBestScore,
        });
    }

    static async getUserGameHistory(
        userId: string | Types.ObjectId,
        limit = 10
    ): Promise<GameHistoryItem[]> {
        try {
            await connectDB();

            const gameHistory = await GameSession.find({
                userId: userId,
                status: GameStatus.COMPLETED,
            })
                .sort({ sessionEndTime: -1 })
                .limit(limit)
                .populate("playlistId", "name")
                .lean();

            return gameHistory.map((session) => {
                const completedRounds = session.rounds.filter(
                    (round: IGameRound) => round.roundEndTime
                );
                const correctRounds = completedRounds.filter(
                    (round: IGameRound) => round.isCorrect
                );
                const accuracy =
                    completedRounds.length > 0
                        ? (correctRounds.length / completedRounds.length) * 100
                        : 0;

                return {
                    id: (session._id as Types.ObjectId).toString(),
                    playlistName:
                        (session.playlistId as { name: string })?.name ||
                        "Unknown Playlist",
                    gameMode: session.gameMode,
                    totalScore: session.totalScore,
                    maxPossibleScore: session.maxPossibleScore,
                    accuracy: Math.round(accuracy * 100) / 100,
                    totalRounds: session.totalRounds,
                    sessionStartTime: session.sessionStartTime,
                    sessionEndTime: session.sessionEndTime,
                    totalGameTime: session.totalGameTime,
                };
            });
        } catch (error) {
            console.error("Error fetching user game history:", error);
            throw error;
        }
    }

    static async recalculateUserStats(
        userId: string | Types.ObjectId
    ): Promise<void> {
        try {
            await connectDB();

            const completedGames = await GameSession.find({
                userId: userId,
                status: GameStatus.COMPLETED,
            }).lean();

            if (completedGames.length === 0) {
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        gamesPlayed: 0,
                        totalScore: 0,
                        gamesWon: 0,
                        averageScore: 0,
                        bestScore: 0,
                    },
                });
                return;
            }

            let totalScore = 0;
            let gamesWon = 0;
            let bestScore = 0;

            for (const game of completedGames) {
                const gameScore = game.totalScore || 0;
                const maxPossibleScore = game.maxPossibleScore || 0;
                const scorePercentage =
                    maxPossibleScore > 0
                        ? (gameScore / maxPossibleScore) * 100
                        : 0;
                const isWin = scorePercentage >= 60;

                totalScore += gameScore;
                if (isWin) gamesWon++;
                bestScore = Math.max(bestScore, gameScore);
            }

            const averageScore = totalScore / completedGames.length;

            await User.findByIdAndUpdate(userId, {
                $set: {
                    gamesPlayed: completedGames.length,
                    totalScore: totalScore,
                    gamesWon: gamesWon,
                    averageScore: averageScore,
                    bestScore: bestScore,
                },
            });

            console.log(`Recalculated stats for user ${userId}:`, {
                gamesPlayed: completedGames.length,
                totalScore,
                gamesWon,
                averageScore: Math.round(averageScore * 100) / 100,
                bestScore,
            });
        } catch (error) {
            console.error("Error recalculating user stats:", error);
            throw error;
        }
    }
}
