import { connectDB } from "@/database/db";
import Playlist from "@/database/schemas/Playlist";
import { validateToken } from "@/util/accounts/tokens";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId, Types } from "mongoose";

export async function GET() {
    const token = (await headers()).get("Authorization");

    const user = await validateToken(token);
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    await connectDB();

    let userId: ObjectId | Types.ObjectId;
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

    const playlists = await Playlist.find({
        createdBy: userId,
    });
    return NextResponse.json({ success: true, playlists }, { status: 200 });
}
