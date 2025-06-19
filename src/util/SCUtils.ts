export function extractSoundCloudTrackId(url: string): string {
    const apiMatch = url.match(/api\.soundcloud\.com\/tracks\/(\d+)/);
    if (apiMatch) {
        return apiMatch[1];
    }

    const embedMatch = url.match(/tracks%2F(\d+)/);
    if (embedMatch) {
        return embedMatch[1];
    }

    if (
        url.includes("soundcloud.com/") &&
        !url.includes("w.soundcloud.com") &&
        !url.includes("api.soundcloud.com")
    ) {
        throw new Error(
            "Regular SoundCloud URLs require API resolution. Please use w.soundcloud.com embed URLs or API URLs."
        );
    }

    throw new Error("Invalid SoundCloud URL format");
}

export function createSoundCloudApiUrl(trackId: string): string {
    return `https://api.soundcloud.com/tracks/${trackId}`;
}

export function createSoundCloudEmbedUrl(
    trackId: string,
    options?: {
        autoPlay?: boolean;
        hideRelated?: boolean;
        showComments?: boolean;
        showUser?: boolean;
        showReposts?: boolean;
        showTeaser?: boolean;
        visual?: boolean;
        color?: string;
    }
): string {
    const params = new URLSearchParams({
        url: `https://api.soundcloud.com/tracks/${trackId}`,
        color: options?.color || "#ff5500",
        auto_play: (options?.autoPlay ?? false).toString(),
        hide_related: (options?.hideRelated ?? false).toString(),
        show_comments: (options?.showComments ?? true).toString(),
        show_user: (options?.showUser ?? true).toString(),
        show_reposts: (options?.showReposts ?? false).toString(),
        show_teaser: (options?.showTeaser ?? true).toString(),
        visual: (options?.visual ?? true).toString(),
    });

    return `https://w.soundcloud.com/player/?${params.toString()}`;
}

export function createDefaultSCEmbedUrl(track: string): string {
    return (
        "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" +
        track +
        "&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false"
    );
}

export function extractSoundCloudURL(input: string) {
    const match = input.match(
        /https:\/\/w\.soundcloud\.com\/player\/\?[^"]+/
    )?.[0];
    if (!match) {
        console.log("No SoundCloud URL found in input");
        return "";
    }

    const trackIdMatch = match.match(/tracks(?:%2F|\/)(\d+)/);
    if (!trackIdMatch) {
        console.log("No track ID found in SoundCloud URL");
        return "";
    }

    const trackId = trackIdMatch[1];
    return `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
}

export function isValidSoundCloudUrl(url: string): boolean {
    if (!url.trim()) return false;

    const patterns = [
        // w.soundcloud.com embed URLs
        /^https:\/\/w\.soundcloud\.com\/player\/\?url=/,
        // API URLs
        /^https:\/\/api\.soundcloud\.com\/tracks\/\d+/,
        // Regular SoundCloud track URLs
        /^https:\/\/soundcloud\.com\/[^\/]+\/[^\/]+/,
        // Mobile SoundCloud URLs
        /^https:\/\/m\.soundcloud\.com\/[^\/]+\/[^\/]+/,
    ];

    return patterns.some((pattern) => pattern.test(url));
}

export function convertToEmbedUrl(url: string): string {
    if (url.includes("w.soundcloud.com/player")) {
        return url;
    }

    if (url.includes("api.soundcloud.com/tracks/")) {
        const trackId = extractSoundCloudTrackId(url);
        return createDefaultSCEmbedUrl(trackId);
    }

    if (
        url.includes("soundcloud.com/") &&
        !url.includes("w.soundcloud.com") &&
        !url.includes("api.soundcloud.com")
    ) {
        const encodedUrl = encodeURIComponent(url);
        return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
    }

    return url;
}

export function extractInfoFromSoundCloudUrl(url: string): {
    artist?: string;
    title?: string;
} {
    const info: { artist?: string; title?: string } = {};

    const regularMatch = url.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
    if (regularMatch) {
        const artist = regularMatch[1].replace(/-/g, " ");
        const title = regularMatch[2].replace(/-/g, " ");

        info.artist = artist;
        info.title = title;
    }

    return info;
}
