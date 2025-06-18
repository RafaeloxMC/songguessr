import { connectDB } from "@/database/db";
import Playlist, { IPlaylist } from "@/database/schemas/Playlist";
import { PlaylistManager } from "@/util/PlaylistManager";
import { NextResponse } from "next/server";

export async function GET() {
    const playlists = await PlaylistManager.getAllPlaylists();
    return Response.json(playlists);
}

export async function POST(request: Request) {
    const data = await request.json();
    const iPlaylist = data as unknown as IPlaylist;

    await connectDB();
    return await Playlist.find({ name: iPlaylist.name }).then(
        async (playlist) => {
            if (!playlist || playlist.length === 0) {
                const res = await PlaylistManager.createPlaylist(iPlaylist);
                if (res != undefined) {
                    console.log("Playlist created successfully.");
                    return NextResponse.json(
                        {
                            success: true,
                        },
                        { status: 201 }
                    );
                } else {
                    console.log("Playlist not created.");
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
                console.log("Playlist already exists.");
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
