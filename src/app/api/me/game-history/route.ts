import { connectDB } from "@/database/db";
import { validateToken } from "@/util/accounts/tokens";
import { UserStatsService } from "@/util/UserStatsService";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "10");

        const gameHistory = await UserStatsService.getUserGameHistory(
            user._id,
            limit
        );

        return NextResponse.json({
            success: true,
            gameHistory,
        });
    } catch (error) {
        console.error("Error fetching game history:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
