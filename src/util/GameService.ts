import { connectDB } from "@/database/db";
import GameSession, { IGameSession } from "@/database/schemas/GameSession";
import Playlist from "@/database/schemas/Playlist";
import Song from "@/database/schemas/Song";
import { GameMode } from "@/util/enums/GameMode";
import { Types } from "mongoose";

export interface SecureGameService {
    getRandomSongForGame: (
        playlistId: string,
        usedSongIds: string[],
        gameMode: GameMode
    ) => Promise<{ success: boolean; song?: unknown; error?: string }>;

    validateGameSession: (
        sessionId: string,
        userId: string,
        clientSessionId: string
    ) => Promise<{ success: boolean; session?: unknown; error?: string }>;
}

export class GameService implements SecureGameService {
    async getRandomSongForGame(
        playlistId: string,
        usedSongIds: string[] = [],
        gameMode: GameMode
    ): Promise<{ success: boolean; song?: unknown; error?: string }> {
        try {
            await connectDB();

            const playlist = await Playlist.findById(playlistId);
            if (!playlist || !playlist.isActive) {
                return {
                    success: false,
                    error: "Playlist not found or inactive",
                };
            }

            if (!playlist.songIds || playlist.songIds.length === 0) {
                return { success: false, error: "Playlist has no songs" };
            }

            const availableSongIds = playlist.songIds.filter(
                (songId: unknown) => !usedSongIds.includes(songId!.toString())
            );

            if (availableSongIds.length === 0) {
                return {
                    success: false,
                    error: "No more songs available in playlist",
                };
            }

            const randomIndex = Math.floor(
                Math.random() * availableSongIds.length
            );
            const selectedSongId = availableSongIds[randomIndex];

            const song = await Song.findById(selectedSongId);
            if (!song || !song.isActive) {
                const retryUsedIds = [
                    ...usedSongIds,
                    selectedSongId.toString(),
                ];
                return this.getRandomSongForGame(
                    playlistId,
                    retryUsedIds,
                    gameMode
                );
            }

            let missingField = false;
            switch (gameMode) {
                case GameMode.CLASSIC:
                    if (!song.title) missingField = true;
                    break;
                case GameMode.ARTIST:
                    if (!song.artist) missingField = true;
                    break;
            }

            if (missingField) {
                const retryUsedIds = [
                    ...usedSongIds,
                    selectedSongId.toString(),
                ];
                return this.getRandomSongForGame(
                    playlistId,
                    retryUsedIds,
                    gameMode
                );
            }

            return {
                success: true,
                song: {
                    _id: song._id,
                    title: song.title,
                    artist: song.artist,
                    soundcloudUrl: song.soundcloudUrl,
                    soundcloudTrackId: song.soundcloudTrackId,
                    startingOffset: song.startingOffset || 0,
                    difficulty: song.difficulty,
                },
            };
        } catch (error) {
            console.error("Error getting random song for game:", error);
            return { success: false, error: "Internal server error" };
        }
    }

    async validateGameSession(
        sessionId: string,
        userId: string,
        clientSessionId: string
    ) {
        try {
            await connectDB();

            const gameSession = (await GameSession.findById(
                sessionId
            )) as IGameSession;
            if (!gameSession) {
                return { success: false, error: "Game session not found" };
            }

            if (!userId || !Types.ObjectId.isValid(userId)) {
                console.error("Failed to normalize userId:", userId);
                return { success: false, error: "Invalid user ID format" };
            }

            const sessionUserIdString = gameSession.userId.toString();

            if (sessionUserIdString !== userId) {
                console.log(
                    `Unauthorized access attempt: User ${userId} tried to access session ${sessionId}`
                );
                return {
                    success: false,
                    error: "Unauthorized access to game session",
                };
            }

            if (gameSession.clientSessionId !== clientSessionId) {
                return { success: false, error: "Invalid session ID" };
            }

            return {
                success: true,
                session: gameSession,
            };
        } catch (error) {
            console.error("Error validating game session:", error);
            return { success: false, error: "Internal server error" };
        }
    }
}

export const gameService = new GameService();
