export interface SoundCloudSound {
    id: number;
    title: string;
    description?: string;
    duration: number;
    genre?: string;
    user?: {
        username: string;
        avatar_url: string;
    };
    artwork_url?: string;
    stream_url?: string;
}
