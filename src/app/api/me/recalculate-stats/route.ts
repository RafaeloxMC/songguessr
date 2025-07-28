import { connectDB } from "@/database/db";
import { validateToken } from "@/util/accounts/tokens";
import { UserStatsService } from "@/util/UserStatsService";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
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

        await UserStatsService.recalculateUserStats(user._id);

        return NextResponse.json({
            success: true,
            message: "User statistics recalculated successfully",
        });
    } catch (error) {
        console.error("Error recalculating user stats:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
