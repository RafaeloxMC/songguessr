import { connectDB } from "@/database/db";
import GameSession from "@/database/schemas/GameSession";
import Playlist from "@/database/schemas/Playlist";
import { validateToken } from "@/util/accounts/tokens";
import { GameMode } from "@/util/enums/GameMode";
import { GameStatus } from "@/util/enums/GameStatus";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
        const { playlistId, gameMode, totalRounds } = body;

        if (!playlistId || !gameMode) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!Object.values(GameMode).includes(gameMode)) {
            return NextResponse.json(
                { success: false, error: "Invalid game mode" },
                { status: 400 }
            );
        }

        const roundsCount = totalRounds || 10;
        if (roundsCount < 1 || roundsCount > 20) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Total rounds must be between 1 and 20",
                },
                { status: 400 }
            );
        }

        const playlist = await Playlist.findById(playlistId);
        if (!playlist || !playlist.isActive) {
            return NextResponse.json(
                { success: false, error: "Playlist not found or inactive" },
                { status: 404 }
            );
        }

        if (playlist.songCount < roundsCount) {
            return NextResponse.json(
                { success: false, error: "Playlist doesn't have enough songs" },
                { status: 400 }
            );
        }

        let userId: Types.ObjectId;
        try {
            let userIdString: string;
            if (typeof user._id === "string") {
                userIdString = user._id;
            } else if (
                user._id &&
                typeof user._id === "object" &&
                "buffer" in user._id
            ) {
                const bufferArray = Object.values(
                    (user._id as { buffer: { [key: string]: number } }).buffer
                ) as number[];
                const buffer = Buffer.from(bufferArray);
                userIdString = new Types.ObjectId(buffer).toString();
            } else {
                throw new Error("Invalid user ID format");
            }

            if (Types.ObjectId.isValid(userIdString)) {
                userId = new Types.ObjectId(userIdString);
            } else {
                throw new Error("Invalid ObjectId");
            }
        } catch (error) {
            console.error("Error creating ObjectId:", error);
            return NextResponse.json(
                { success: false, error: "Invalid user ID" },
                { status: 400 }
            );
        }

        const existingActive = await GameSession.find({
            userId: userId,
            status: GameStatus.ACTIVE,
        });
        console.log("Existing active sessions:", existingActive.length);

        await GameSession.updateMany(
            {
                userId: userId,
                status: GameStatus.ACTIVE,
            },
            {
                status: GameStatus.ABANDONED,
                sessionEndTime: new Date(),
            }
        );

        const clientSessionId = crypto.randomUUID();

        const gameSession = new GameSession({
            userId: userId,
            playlistId: new Types.ObjectId(playlistId),
            gameMode,
            totalRounds: roundsCount,
            maxPossibleScore: roundsCount * 5,
            clientSessionId,
            status: GameStatus.ACTIVE,
        });

        await gameSession.save();

        console.log("Created game session:", {
            id: gameSession._id.toString(),
            clientSessionId: gameSession.clientSessionId,
            status: gameSession.status,
            userId: gameSession.userId.toString(),
        });

        return NextResponse.json({
            success: true,
            gameSession: {
                id: gameSession._id,
                playlistId: gameSession.playlistId,
                gameMode: gameSession.gameMode,
                totalRounds: gameSession.totalRounds,
                currentRound: gameSession.currentRound,
                totalScore: gameSession.totalScore,
                maxPossibleScore: gameSession.maxPossibleScore,
                status: gameSession.status,
                clientSessionId: gameSession.clientSessionId,
                sessionStartTime: gameSession.sessionStartTime,
            },
        });
    } catch (error) {
        console.error("Error starting game session:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
