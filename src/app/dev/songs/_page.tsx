"use client";
import Card from "@/components/card";
import { ISong } from "@/database/schemas/Song";
import React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ISongsResponse {
    songs: ISong[];
    message: string;
    success: boolean;
}

function SongsDevPage() {
    const { data, error, isLoading } = useSWR<ISongsResponse>(
        "/api/songs",
        fetcher
    );

    const songs = data?.songs;

    return (
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Songs Development Page</h1>
            {isLoading && <p>Loading songs...</p>}
            {error && <p>Error loading songs: {error.message}</p>}
            {songs && !Array.isArray(songs) && (
                <p>Error: Expected array but received: {typeof songs}</p>
            )}
            {songs && Array.isArray(songs) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {songs.map((song) => (
                        <Card key={song._id} title={song.title} className="p-4">
                            <p>
                                <strong>ID:</strong>{" "}
                                <a href={`/dev/songs/${song._id}`}>
                                    {song._id}
                                </a>
                            </p>
                            <p>
                                <strong>SoundCloud URL:</strong>{" "}
                                <a
                                    href={song.soundcloudUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={song.soundcloudUrl}
                                >
                                    Click to view
                                </a>
                            </p>
                            <p>
                                <strong>Artist:</strong>{" "}
                                {song.artist || "Unknown"}
                            </p>
                            <p>
                                <strong>Difficulty:</strong> {song.difficulty}
                            </p>
                            <p>
                                <strong>Play Count:</strong> {song.playCount}
                            </p>
                            <p>
                                <strong>Correct Guesses:</strong>{" "}
                                {song.correctGuesses}
                            </p>
                            <p>
                                <strong>Release Year:</strong>{" "}
                                {song.releaseYear || "N/A"}
                            </p>
                            <p>
                                <strong>Genres:</strong>{" "}
                                {song.genres && song.genres.length > 0
                                    ? song.genres.join(", ")
                                    : "N/A"}
                            </p>
                            <p>
                                <strong>Mood:</strong> {song.mood || "N/A"}
                            </p>
                            <p>
                                <strong>Energy:</strong>{" "}
                                {song.energy || "medium"}
                            </p>
                            <p>
                                <strong>Popularity Range:</strong>{" "}
                                {song.popularityRange || "mainstream"}
                            </p>
                            <p>
                                <strong>Created At:</strong>{" "}
                                {new Date(song.createdAt).toLocaleDateString()}
                            </p>
                            <p>
                                <strong>Updated At:</strong>{" "}
                                {new Date(song.updatedAt).toLocaleDateString()}
                            </p>
                        </Card>
                    ))}
                </div>
            )}
            {songs && Array.isArray(songs) && songs.length === 0 && (
                <p>No songs found.</p>
            )}
        </div>
    );
}

export default SongsDevPage;
