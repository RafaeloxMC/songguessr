import { connectDB } from "@/database/db";
import User from "@/database/schemas/User";
import { validateToken } from "@/util/accounts/tokens";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const token = (await headers()).get("Authorization");

    const tokenUser = await validateToken(token);
    if (!tokenUser) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        await connectDB();
        const user = await User.findById(tokenUser._id);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const resEl = {
            id: user._id,
            username: user.username,
            email: user.email,
            totalScore: user.totalScore,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            averageScore: user.averageScore,
            bestScore: user.bestScore,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return NextResponse.json(
            { success: true, user: resEl },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
