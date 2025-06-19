import { connectDB } from "@/database/db";
import Playlist from "@/database/schemas/Playlist";
import { IPlaylist } from "@/database/schemas/Playlist";

export class PlaylistManager {
    private static playlists: Array<IPlaylist> = [];

    public static addPlaylist(id: string, playlistData: IPlaylist): void {
        this.playlists.push(playlistData);
    }

    public static async getPlaylist(
        id: string
    ): Promise<IPlaylist | undefined> {
        await connectDB();
        return await Playlist.findById(id).then((playlist) => {
            return playlist?.toObject() as IPlaylist | undefined;
        });
    }

    public static getPlaylistBySlug(slug: string): IPlaylist | undefined {
        return this.playlists.find((playlist) => playlist.slug === slug);
    }

    public static async getAllPlaylists(): Promise<IPlaylist[]> {
        await this.fetchPlaylistsFromDatabase();
        return this.playlists;
    }

    public static removePlaylist(id: string): boolean {
        const initialLength = this.playlists.length;
        this.playlists = this.playlists.filter(
            (playlist) => playlist.id !== id
        );
        return this.playlists.length < initialLength;
    }

    public static async deletePlaylist(playlist: IPlaylist): Promise<boolean> {
        const { id } = playlist;
        if (!id) return false;
        await connectDB();

        const result = await Playlist.deleteOne({ id });
        if (result.deletedCount === 1) {
            this.removePlaylist(id);
            return true;
        }
        return false;
    }

    public static async fetchPlaylistsFromDatabase(): Promise<void> {
        try {
            await connectDB();
            const playlists = await Playlist.find({});
            this.playlists = playlists.map((playlist) => playlist.toObject());
        } catch (error) {
            console.error("Error fetching playlists from database:", error);
        }
    }

    public static async createPlaylist(
        playlistData: IPlaylist
    ): Promise<IPlaylist | null> {
        try {
            await connectDB();
            const newPlaylist = await Playlist.create(playlistData);
            this.addPlaylist(newPlaylist.id, newPlaylist.toObject());
            return newPlaylist.toObject() as IPlaylist;
        } catch (error) {
            console.error("Error creating playlist:", error);
            return null;
        }
    }
}
