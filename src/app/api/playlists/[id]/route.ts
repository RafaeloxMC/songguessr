import { connectDB } from "@/database/db";
import Playlist, { IPlaylist } from "@/database/schemas/Playlist";
import Song from "@/database/schemas/Song";
import { PlaylistManager } from "@/util/PlaylistManager";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const arg = await params;
    const playlistId = arg.id;

    const data = await request.json();
    const iPlaylist = data as unknown as IPlaylist;

    await connectDB();
    return await Playlist.findOneAndUpdate({ _id: playlistId }, iPlaylist, {
        new: true,
    }).then((playlist) => {
        if (playlist) {
            return NextResponse.json(
                {
                    success: true,
                    playlist,
                },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: "Playlist not found.",
                },
                { status: 404 }
            );
        }
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const arg = await params;
    const playlistId = arg.id;
    const playlist = await PlaylistManager.getPlaylist(playlistId);
    await connectDB();

    if (!playlist) {
        return NextResponse.json(
            {
                success: false,
                message: "Playlist not found.",
            },
            { status: 404 }
        );
    }

    if (playlist?.selectionType === "dynamic") {
        if (
            playlist.metadata?.artists &&
            playlist.metadata?.artists.length > 0
        ) {
            const artists = playlist.metadata.artists;
            await Song.find({ artist: { $in: artists } })
                .then((songs) => {
                    playlist.songIds = [
                        ...(playlist.songIds || []),
                        ...songs.map((song) => song._id),
                    ];
                })
                .catch((error) => {
                    console.error(
                        "Error fetching songs for dynamic playlist:",
                        error
                    );
                });
        }
        if (playlist.metadata?.genres && playlist.metadata?.genres.length > 0) {
            const genres = playlist.metadata.genres;
            await Song.find({ genres: { $in: genres } })
                .then((songs) => {
                    playlist.songIds = [
                        ...(playlist.songIds || []),
                        ...songs.map((song) => song._id),
                    ];
                })
                .catch((error) => {
                    console.error(
                        "Error fetching songs for dynamic playlist:",
                        error
                    );
                });
        }
        if (playlist.metadata?.startYear || playlist.metadata?.endYear) {
            const startYear = playlist.metadata.startYear || 1900;
            const endYear = playlist.metadata.endYear || 2030;
            await Song.find({
                releaseYear: { $gte: startYear, $lte: endYear },
            })
                .then((songs) => {
                    playlist.songIds = [
                        ...(playlist.songIds || []),
                        ...songs.map((song) => song._id),
                    ];
                })
                .catch((error) => {
                    console.error(
                        "Error fetching songs for dynamic playlist:",
                        error
                    );
                });
        }
        playlist.songCount = playlist.songIds?.length || 0;
    }
    return NextResponse.json(
        {
            success: true,
            playlist,
        },
        { status: 200 }
    );
}
