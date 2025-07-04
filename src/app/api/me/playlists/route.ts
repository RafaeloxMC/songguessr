import { connectDB } from "@/database/db";
import Playlist from "@/database/schemas/Playlist";
import { validateToken } from "@/util/accounts/tokens";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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

    const playlists = await Playlist.find({ createdBy: user._id });
    return NextResponse.json({ success: true, playlists }, { status: 200 });
}
