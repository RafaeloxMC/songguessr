import { connectDB } from "@/database/db";
import Playlist from "@/database/schemas/Playlist";
import Song from "@/database/schemas/Song";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { playlistId } = body;

        if (!playlistId) {
            return NextResponse.json(
                { success: false, error: "Playlist ID required" },
                { status: 400 }
            );
        }

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return NextResponse.json(
                { success: false, error: "Playlist not found" },
                { status: 404 }
            );
        }

        let randomSong;
        if (playlist.songIds && playlist.songIds.length > 0) {
            const randomIndex = Math.floor(
                Math.random() * playlist.songIds.length
            );
            const randomSongId = playlist.songIds[randomIndex];
            randomSong = await Song.findById(randomSongId);
        } else {
            const totalSongs = await Song.countDocuments();
            const randomIndex = Math.floor(Math.random() * totalSongs);
            randomSong = await Song.findOne().skip(randomIndex);
        }

        if (!randomSong) {
            return NextResponse.json(
                { success: false, error: "No songs available" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            song: {
                _id: randomSong._id,
                title: randomSong.title,
                artist: randomSong.artist,
                soundcloudUrl: randomSong.soundcloudUrl,
                soundcloudTrackId: randomSong.soundcloudTrackId,
                startingOffset: randomSong.startingOffset || 0,
                difficulty: randomSong.difficulty,
            },
        });
    } catch (error) {
        console.error("Error getting next song for guest:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
