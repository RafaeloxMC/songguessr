"use client";
import Button from "@/components/button";
import FloatingNotesBackground from "@/components/floatingnotesbg";
import PlaylistCard from "@/components/playlistcard";
import { IPlaylist } from "@/database/schemas/Playlist";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PlayPage = () => {
    const [gameMode, setGameMode] = useState<string | null>(null);
    const [playlists, setPlaylists] = useState<IPlaylist[]>([]);
    const [playlist, setPlaylist] = useState<string | null>(null);

    const router = useRouter();

    const { data, error, isLoading } = useSWR<IPlaylist[]>(
        "/api/playlists",
        fetcher
    );

    React.useEffect(() => {
        if (data) {
            setPlaylists(data);
        }
    }, [data]);

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <FloatingNotesBackground />
            <h1 className="text-4xl font-bold my-12 text-center">
                Play a new game of SongGuessr!
            </h1>
            {!gameMode && !playlist ? (
                // Game mode selector
                // TODO: Improve UI
                <div className="flex flex-col items-center gap-4">
                    <p className="text-center mb-8">
                        Choose your game mode below to start guessing songs!
                    </p>
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="text-center">
                            <Button
                                label="Classic Mode"
                                className="mb-2"
                                onClick={() => setGameMode("classic")}
                            />
                            <p className="text-sm max-w-xs">
                                Guess the song by hearing a short clip of it.
                                The longer you listen, the less points you get!
                            </p>
                        </div>
                        <div className="flex items-center w-full max-w-xs my-4">
                            <div className="flex-grow border-t border-[var(--text)]"></div>
                            <span className="px-4 text-[var(--text)] text-sm">
                                OR
                            </span>
                            <div className="flex-grow border-t border-[var(--text)]"></div>
                        </div>
                        <div className="text-center">
                            <Button
                                label="By Emojis"
                                className="mb-2"
                                onClick={() => setGameMode("emoji")}
                            />
                            <p className="text-sm max-w-xs">
                                Guess the song only by descriptive emojis!
                            </p>
                        </div>
                        <div className="flex items-center w-full max-w-xs my-4">
                            <div className="flex-grow border-t border-[var(--text)]"></div>
                            <span className="px-4 text-[var(--text)] text-sm">
                                OR
                            </span>
                            <div className="flex-grow border-t border-[var(--text)]"></div>
                        </div>
                        <div className="text-center">
                            <Button
                                label="By Lyrics"
                                className="mb-2"
                                onClick={() => setGameMode("lyrics")}
                            />
                            <p className="text-sm max-w-xs">
                                Guess the song by its lyrics!
                            </p>
                        </div>
                    </div>
                </div>
            ) : !playlist ? (
                // Map selector
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center justify-center">
                    {/* <MapCard
                        // https://pixabay.com/illustrations/retro-images-70s-ads-80s-commercials-9038411/
                        imageUrl="https://cdn.pixabay.com/photo/2024/09/10/22/53/retro-images-9038411_960_720.jpg"
                        title="80s"
                        description="Guess songs from the 80s!"
                        onClick={() => setMap("80s")}
                    />
                    <MapCard
                        // https://pixabay.com/illustrations/cassette-tape-music-80s-audio-8485210/
                        imageUrl="https://cdn.pixabay.com/photo/2024/01/03/10/50/cassette-8485210_960_720.jpg"
                        title="90s"
                        description="Guess songs from the 90s!"
                        onClick={() => setMap("90s")}
                    />
                    <MapCard
                        // https://pixabay.com/illustrations/man-ipod-headset-mobile-phone-4807395/
                        imageUrl="https://cdn.pixabay.com/photo/2020/01/31/07/53/man-4807395_960_720.jpg"
                        title="2000s"
                        description="Guess songs from the 2000s!"
                        onClick={() => setMap("2000s")}
                    />
                    <MapCard
                        // https://pixabay.com/illustrations/ai-generated-dj-night-electro-8700009/
                        imageUrl="https://cdn.pixabay.com/photo/2024/04/16/13/10/ai-generated-8700009_960_720.png"
                        title="2010s"
                        description="Guess songs from the 2010s!"
                        onClick={() => setMap("2010s")}
                    />
                    <MapCard
                        // https://pixabay.com/illustrations/ai-generated-musician-music-studio-7872854/
                        imageUrl="https://cdn.pixabay.com/photo/2023/03/23/20/41/ai-generated-7872854_960_720.jpg"
                        title="2020s"
                        description="Guess songs from the 2020s!"
                        onClick={() => setMap("2020s")}
                    />
                    <MapCard
                        // https://pixabay.com/illustrations/ai-generated-guitar-music-8704872/
                        imageUrl="https://cdn.pixabay.com/photo/2024/04/18/19/16/ai-generated-8704872_960_720.png"
                        title="All Time"
                        description="Guess songs from all time!"
                        onClick={() => setMap("alltime")}
                    /> */}
                    {isLoading || error || playlists.length === 0 ? (
                        <div></div>
                    ) : null}
                    {isLoading || error || playlists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-center mb-4">
                                {isLoading
                                    ? "Loading playlists..."
                                    : error
                                    ? "Failed to load playlists."
                                    : "No playlists available."}
                            </p>
                        </div>
                    ) : (
                        playlists.map((playlistItem) => (
                            <PlaylistCard
                                key={playlistItem.id}
                                imageUrl={playlistItem.imageUrl}
                                title={playlistItem.name}
                                description={playlistItem.description}
                                onClick={() =>
                                    setPlaylist(playlistItem._id.toString())
                                }
                            />
                        ))
                    )}
                </div>
            ) : (
                // Game start button
                <div className="flex flex-col items-center gap-4">
                    <p className="text-center mb-8">
                        You have selected{" "}
                        <span className="font-bold">{gameMode}</span> mode on
                        the <span className="font-bold">{playlist}</span>{" "}
                        playlist.
                    </p>
                    <Button
                        label="Start Game"
                        onClick={() => {
                            router.push(
                                `/game/${encodeURIComponent(
                                    gameMode!
                                )}/${encodeURIComponent(playlist!)}`
                            );
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default PlayPage;
