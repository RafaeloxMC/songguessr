import { connectDB } from "@/database/db";
import Playlist, { IPlaylist } from "@/database/schemas/Playlist";
import { validateToken } from "@/util/accounts/tokens";
import { PlaylistManager } from "@/util/PlaylistManager";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

export async function GET() {
    await connectDB();
    const playlists = await PlaylistManager.getAllPlaylists();
    return NextResponse.json(playlists);
}

export async function POST(request: Request) {
    const token = (await headers()).get("Authorization");

    const user = await validateToken(token);

    if (!user || !user._id) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    const data = await request.json();
    const iPlaylist = data as unknown as IPlaylist;
    iPlaylist.createdBy = new Types.ObjectId(user._id);

    await connectDB();
    return await Playlist.find({ name: iPlaylist.name }).then(
        async (playlist) => {
            if (!playlist || playlist.length === 0) {
                const res = await PlaylistManager.createPlaylist(iPlaylist);
                if (res != undefined) {
                    return NextResponse.json(
                        {
                            success: true,
                        },
                        { status: 201 }
                    );
                } else {
                    return NextResponse.json(
                        {
                            success: false,
                            message: "Not created.",
                        },
                        {
                            status: 500,
                        }
                    );
                }
            } else {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Playlist already exists.",
                    },
                    {
                        status: 500,
                    }
                );
            }
        }
    );
}
