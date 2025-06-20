import { connectDB } from "@/database/db";
import Song from "@/database/schemas/Song";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = await params;
    console.log("Fetching song with ID:", id);
    await connectDB();
    const songData = await Song.findById(id);
    console.log("Fetched song data:", songData);
    return NextResponse.json(songData);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const updateData = await request.json();

        await connectDB();

        const updatedSong = await Song.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedSong) {
            return NextResponse.json(
                { error: "Song not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedSong);
    } catch (error) {
        console.error("Error updating song:", error);
        return NextResponse.json(
            { error: "Failed to update song" },
            { status: 500 }
        );
    }
}
