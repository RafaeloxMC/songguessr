import { connectDB } from "@/database/db";
import Song from "@/database/schemas/Song";
import { IGameRound } from "@/database/schemas/GameSession";
import { validateToken } from "@/util/accounts/tokens";
import { gameService } from "@/util/GameService";
import { UserStatsService } from "@/util/UserStatsService";
import { GameStatus } from "@/util/enums/GameStatus";
import { GameMode } from "@/util/enums/GameMode";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function calculatePoints(hintsUsed: number, isCorrect: boolean): number {
    if (!isCorrect) return 0;

    return Math.max(1, Math.min(5, 6 - hintsUsed));
}

function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ");
}

function isAnswerCorrect(userGuess: string, correctAnswer: string): boolean {
    if (!userGuess || !correctAnswer) return false;

    const normalizedGuess = normalizeString(userGuess);
    const normalizedAnswer = normalizeString(correctAnswer);

    if (normalizedGuess === normalizedAnswer) return true;

    const cleanAnswerBeforeNorm = correctAnswer
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const cleanAnswer = normalizeString(cleanAnswerBeforeNorm);
    const cleanGuess = normalizedGuess
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .trim();

    if (cleanGuess === cleanAnswer) return true;
    if (normalizedGuess === cleanAnswer) return true;

    if (normalizedGuess === cleanAnswer || cleanGuess === normalizedAnswer)
        return true;

    const guessParts = normalizedGuess
        .split(/\s+(by|feat|featuring|\-)\s+/)[0]
        .trim();
    const answerParts = cleanAnswer
        .split(/\s+(by|feat|featuring|\-)\s+/)[0]
        .trim();

    if (guessParts === answerParts) return true;

    if (
        normalizedGuess.includes(normalizedAnswer) ||
        normalizedAnswer.includes(normalizedGuess) ||
        normalizedGuess.includes(cleanAnswer) ||
        cleanAnswer.includes(normalizedGuess)
    ) {
        const minLength = Math.min(
            normalizedGuess.length,
            Math.max(normalizedAnswer.length, cleanAnswer.length)
        );
        const maxLength = Math.max(
            normalizedGuess.length,
            Math.max(normalizedAnswer.length, cleanAnswer.length)
        );
        return minLength / maxLength >= 0.6;
    }

    return false;
}

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const {
            gameSessionId,
            songId,
            userGuess,
            hintsUsed,
            timeToGuess,
            clientSessionId,
        } = body;

        if (!gameSessionId || !songId || !clientSessionId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (typeof hintsUsed !== "number" || hintsUsed < 1 || hintsUsed > 5) {
            return NextResponse.json(
                { success: false, error: "Invalid hints used value" },
                { status: 400 }
            );
        }

        if (typeof timeToGuess !== "number" || timeToGuess < 0) {
            return NextResponse.json(
                { success: false, error: "Invalid time to guess value" },
                { status: 400 }
            );
        }

        const sessionValidation = await gameService.validateGameSession(
            gameSessionId,
            user._id.toString(),
            clientSessionId
        );

        if (!sessionValidation.success) {
            return NextResponse.json(
                { success: false, error: sessionValidation.error },
                { status: 403 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gameSession = sessionValidation.session as any;

        if (gameSession.status !== GameStatus.ACTIVE) {
            return NextResponse.json(
                { success: false, error: "Game session is not active" },
                { status: 400 }
            );
        }

        const sessionTimeout = 30 * 60 * 1000;
        if (
            Date.now() - gameSession.lastActionTime.getTime() >
            sessionTimeout
        ) {
            gameSession.status = GameStatus.ABANDONED;
            gameSession.sessionEndTime = new Date();
            await gameSession.save();

            return NextResponse.json(
                { success: false, error: "Session expired" },
                { status: 408 }
            );
        }

        const song = await Song.findById(songId);
        if (!song) {
            return NextResponse.json(
                { success: false, error: "Song not found" },
                { status: 404 }
            );
        }

        let correctAnswer: string;
        switch (gameSession.gameMode) {
            case GameMode.CLASSIC:
                correctAnswer = song.title || "";
                break;
            case GameMode.ARTIST:
                correctAnswer = song.artist || "";
                break;
            default:
                return NextResponse.json(
                    { success: false, error: "Invalid game mode" },
                    { status: 400 }
                );
        }

        const isCorrect = isAnswerCorrect(userGuess || "", correctAnswer);

        const pointsEarned = calculatePoints(hintsUsed, isCorrect);

        const roundData = {
            songId: new Types.ObjectId(songId),
            userGuess: userGuess || "",
            correctAnswer,
            isCorrect,
            hintsUsed,
            timeToGuess,
            pointsEarned,
            roundStartTime: new Date(Date.now() - timeToGuess),
            roundEndTime: new Date(),
        };

        gameSession.rounds.push(roundData);
        gameSession.totalScore += pointsEarned;
        gameSession.lastActionTime = new Date();

        const completedRounds = gameSession.rounds.filter(
            (r: IGameRound) => r.roundEndTime
        ).length;
        const isGameComplete = completedRounds >= gameSession.totalRounds;

        if (isGameComplete) {
            gameSession.status = GameStatus.COMPLETED;
            gameSession.sessionEndTime = new Date();
            gameSession.totalGameTime =
                gameSession.sessionEndTime.getTime() -
                gameSession.sessionStartTime.getTime();
        }

        await gameSession.save();

        if (isGameComplete) {
            try {
                await UserStatsService.updateUserStatsAfterGame(
                    user._id,
                    gameSession._id
                );
            } catch (statsError) {
                console.error("Error updating user stats:", statsError);
            }
        }

        return NextResponse.json({
            success: true,
            round: {
                isCorrect,
                correctAnswer,
                pointsEarned,
                timeToGuess,
                hintsUsed,
            },
            gameSession: {
                id: gameSession._id,
                totalScore: gameSession.totalScore,
                currentRound: completedRounds,
                totalRounds: gameSession.totalRounds,
                isComplete: isGameComplete,
                status: gameSession.status,
            },
        });
    } catch (error) {
        console.error("Error submitting answer:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
