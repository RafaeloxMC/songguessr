"use client";
import { IPlaylist } from "@/database/schemas/Playlist";
import React from "react";
import useSWR from "swr";

interface GamePageProps {
    params: Promise<{
        gameMode: string;
        playlist: string;
    }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const GamePage = ({ params }: GamePageProps) => {
    const { gameMode, playlist } = React.use(params);
    const [iPlaylist, setIPlaylist] = React.useState<IPlaylist | null>(null);

    const decodedPlaylist = decodeURIComponent(playlist);

    const { data, error, isLoading } = useSWR<{
        success: boolean;
        playlist: IPlaylist;
    }>(`/api/playlists/${decodedPlaylist}`, fetcher);

    React.useEffect(() => {
        if (data?.playlist) {
            setIPlaylist(data.playlist);
            console.log("Fetched playlist:", data.playlist);
        }
    }, [data]);

    if (error) return <div>Failed to load playlist</div>;
    if (isLoading) return <div>Loading playlist...</div>;

    return (
        <div>
            <h1>Game Page</h1>
            {iPlaylist ? (
                <div>
                    <p>Playlist id: {decodedPlaylist}</p>
                    <p>Game Mode: {gameMode}</p>
                    <p>Playlist Name: {iPlaylist?.name}</p>
                    <p>Playlist Description: {iPlaylist?.description}</p>
                    <p>Playlist Slug: {iPlaylist?.slug}</p>
                    <p>
                        Playlist Created At:{" "}
                        {iPlaylist?.createdAt?.toString() ?? "Unknown"}
                    </p>
                    <p>
                        Playlist Updated At:{" "}
                        {iPlaylist?.updatedAt?.toString() ?? "Unknown"}
                    </p>
                </div>
            ) : (
                <p>Loading playlist...</p>
            )}
        </div>
    );
};

export default GamePage;
