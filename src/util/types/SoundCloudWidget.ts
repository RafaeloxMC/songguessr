import { SoundCloudSound } from "../interfaces/SoundCloudSound";

export type SoundCloudWidget = {
    play: () => void;
    pause: () => void;
    toggle: () => void;
    seekTo: (milliseconds: number) => void;
    setVolume: (volume: number) => void;
    next: () => void;
    prev: () => void;
    skip: (soundIndex: number) => void;
    getCurrentSound: (
        callback: (sound: SoundCloudSound | null) => void
    ) => void;
    bind: (eventName: string, callback: () => void) => void;
};
