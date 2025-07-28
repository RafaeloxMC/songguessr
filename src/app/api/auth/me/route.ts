import { connectDB } from "@/database/db";
import User from "@/database/schemas/User";
import { validateToken } from "@/util/accounts/tokens";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const token = (await headers()).get("Authorization");

    let user = await validateToken(token);
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const userIdWithBuffer = user._id as {
            buffer?: Record<string, number>;
        };
        if (
            userIdWithBuffer.buffer &&
            typeof userIdWithBuffer.buffer === "object"
        ) {
            const bufferData = userIdWithBuffer.buffer;
            const bufferArray = Object.values(bufferData) as number[];
            const buffer = Buffer.from(bufferArray);
            await connectDB();
            const userId = new Types.ObjectId(buffer);
            user = (await User.findOne({ _id: userId })) ?? user;
        } else {
            await connectDB();
            user = (await User.findOne({ _id: user._id })) ?? user;
        }
    } catch (error) {
        console.error("Error converting buffer to ObjectId:", error);
        return NextResponse.json(
            { success: false, error: "Invalid user ID" },
            { status: 400 }
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

    return NextResponse.json({ success: true, user: resEl }, { status: 200 });
}
