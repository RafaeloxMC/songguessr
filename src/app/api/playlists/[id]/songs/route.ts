import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "@/database/db";
import Song from "@/database/schemas/Song";
import Playlist from "@/database/schemas/Playlist";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Invalid playlist ID" },
                { status: 400 }
            );
        }

        const song = await request.json();

        if (!song || !song.title || !song.artist) {
            return NextResponse.json(
                { error: "Song title and artist are required" },
                { status: 400 }
            );
        }

        await connectDB();

        const songFromDb = await Song.findOne({
            title: song.title,
            artist: song.artist,
        });

        let songId;

        if (!songFromDb) {
            const newSong = new Song({
                soundcloudUrl: song.soundcloudUrl || "",
                soundcloudTrackId: song.soundcloudTrackId || "",
                title: song.title,
                artist: song.artist,
                difficulty: song.difficulty || "medium",
                startingOffset: song.startingOffset || 0,
                playCount: 0,
                correctGuesses: 0,
                isActive: true,
                releaseYear: song.releaseYear || undefined,
                genres: song.genres || [],
                mood: song.mood || undefined,
                energy: song.energy || "medium",
                popularityRange: song.popularityRange || "mainstream",
            });

            await newSong.save();
            songId = newSong._id;
        } else {
            songId = songFromDb._id;
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            id,
            { $addToSet: { songIds: songId } },
            { new: true }
        );

        if (!updatedPlaylist) {
            return NextResponse.json(
                { error: "Playlist not found" },
                { status: 404 }
            );
        }

        if (updatedPlaylist.selectionType === "manual") {
            updatedPlaylist.songCount = updatedPlaylist.songIds?.length || 0;
            await updatedPlaylist.save();
        }

        return NextResponse.json(
            { success: true, playlist: updatedPlaylist },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error adding song to playlist:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Invalid playlist ID" },
                { status: 400 }
            );
        }

        await connectDB();

        const playlist = await Playlist.findById(id).populate("songIds").exec();

        if (!playlist) {
            return NextResponse.json(
                { error: "Playlist not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(playlist, { status: 200 });
    } catch (error) {
        console.error("Error fetching playlist:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
