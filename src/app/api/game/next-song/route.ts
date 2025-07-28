import { connectDB } from "@/database/db";
import { validateToken } from "@/util/accounts/tokens";
import { gameService } from "@/util/GameService";
import { GameStatus } from "@/util/enums/GameStatus";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { IGameRound, IGameSession } from "@/database/schemas/GameSession";

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
        const { gameSessionId, clientSessionId } = body;

        if (!gameSessionId || !clientSessionId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
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

        const gameSession = sessionValidation.session as
            | IGameSession
            | undefined;

        if (!gameSession) {
            return NextResponse.json(
                { success: false, error: "Game session not found" },
                { status: 404 }
            );
        }

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usedSongIds = gameSession.rounds.map((round: any) =>
            round.songId.toString()
        );

        const songResult = await gameService.getRandomSongForGame(
            gameSession.playlistId.toString(),
            usedSongIds,
            gameSession.gameMode
        );

        if (!songResult.success) {
            return NextResponse.json(
                { success: false, error: songResult.error },
                { status: 400 }
            );
        }

        gameSession.lastActionTime = new Date();
        await gameSession.save();

        return NextResponse.json({
            success: true,
            song: songResult.song,
            gameSession: {
                id: gameSession._id,
                currentRound:
                    gameSession.rounds.filter((r: IGameRound) => r.roundEndTime)
                        .length + 1,
                totalRounds: gameSession.totalRounds,
                totalScore: gameSession.totalScore,
                maxPossibleScore: gameSession.maxPossibleScore,
            },
        });
    } catch (error) {
        console.error("Error getting next song:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
