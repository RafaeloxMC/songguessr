import Song, { ISong } from "@/database/schemas/Song";
import { NextResponse } from "next/server";

export async function GET() {
    const songs: ISong[] = (await Song.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
        .exec()) as unknown as ISong[];
    return NextResponse.json({
        songs: songs.map((song: ISong) => ({
            _id: song._id.toString(),
            soundcloudUrl: song.soundcloudUrl,
            title: song.title,
            artist: song.artist,
            difficulty: song.difficulty,
            startingOffset: song.startingOffset || 0,
            playCount: song.playCount || 0,
            correctGuesses: song.correctGuesses || 0,
            isActive: song.isActive || true,

            releaseYear: song.releaseYear || 0,
            genres: song.genres || [],
            mood: song.mood || "",
            energy: song.energy || "medium",
            popularityRange: song.popularityRange || "mainstream",

            createdAt: new Date(song.createdAt).toISOString() || "",
            updatedAt: new Date(song.updatedAt).toISOString() || "",
        })),
        message: "Songs fetched successfully",
        success: true,
    });
}
