import { connectDB } from "@/database/db";
import Playlist from "@/database/schemas/Playlist";
import { GameMode } from "@/util/enums/GameMode";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
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
        if (!playlist) {
            return NextResponse.json(
                { success: false, error: "Playlist not found" },
                { status: 404 }
            );
        }

        const guestSessionId = crypto.randomUUID();

        return NextResponse.json({
            success: true,
            gameSession: {
                id: guestSessionId,
                playlistId: playlistId,
                gameMode: gameMode,
                totalRounds: roundsCount,
                currentRound: 1,
                totalScore: 0,
                maxPossibleScore: roundsCount * 5,
                status: "active",
                sessionStartTime: new Date(),
                isGuest: true,
            },
        });
    } catch (error) {
        console.error("Error starting guest game session:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
