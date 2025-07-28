import { connectDB } from "@/database/db";
import GameSession, { IGameRound } from "@/database/schemas/GameSession";
import { validateToken } from "@/util/accounts/tokens";
import { GameStatus } from "@/util/enums/GameStatus";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const token = (await headers()).get("Authorization");

    const user = await validateToken(token);
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        await connectDB();

        const { sessionId } = await params;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: "Session ID required" },
                { status: 400 }
            );
        }

        const gameSession = await GameSession.findById(sessionId);
        if (!gameSession) {
            return NextResponse.json(
                { success: false, error: "Game session not found" },
                { status: 404 }
            );
        }

        if (gameSession.userId.toString() !== user._id.toString()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized access to game session",
                },
                { status: 403 }
            );
        }

        const sessionTimeout = 30 * 60 * 1000;
        if (
            gameSession.status === GameStatus.ACTIVE &&
            Date.now() - gameSession.lastActionTime.getTime() > sessionTimeout
        ) {
            gameSession.status = GameStatus.ABANDONED;
            gameSession.sessionEndTime = new Date();
            await gameSession.save();
        }

        const completedRounds = gameSession.rounds.filter(
            (round: IGameRound) => round.roundEndTime
        ).length;

        return NextResponse.json({
            success: true,
            gameSession: {
                id: gameSession._id,
                playlistId: gameSession.playlistId,
                gameMode: gameSession.gameMode,
                status: gameSession.status,
                totalRounds: gameSession.totalRounds,
                currentRound: completedRounds + 1,
                completedRounds,
                totalScore: gameSession.totalScore,
                maxPossibleScore: gameSession.maxPossibleScore,
                rounds: gameSession.rounds,
                sessionStartTime: gameSession.sessionStartTime,
                sessionEndTime: gameSession.sessionEndTime,
                clientSessionId: gameSession.clientSessionId,
                accuracy: gameSession.accuracy,
                averageTimePerRound: gameSession.averageTimePerRound,
                averageHintsUsed: gameSession.averageHintsUsed,
                isComplete: gameSession.status === GameStatus.COMPLETED,
            },
        });
    } catch (error) {
        console.error("Error fetching game session:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
