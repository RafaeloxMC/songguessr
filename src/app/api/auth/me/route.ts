import User from "@/database/schemas/User";
import { validateToken } from "@/util/accounts/tokens";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const token = (await headers()).get("Authorization");

    let user = validateToken(token);
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    user = (await User.findOne({ _id: user._id })) ?? user;

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

    return NextResponse.json({ success: true, user: resEl }, { status: 200 });
}
