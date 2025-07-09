import React from "react";

interface PlaylistCardProps {
    imageUrl: string;
    title: string;
    description: string;
    onClick?: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
    imageUrl,
    title,
    description,
    onClick,
}) => {
    return (
        <div
            className="rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.3)] transition-all duration-150 bg-[var(--primary)] text-[var(--text)] overflow-hidden hover:shadow-none hover:translate-y-1 active:shadow-none active:translate-y-1 flex flex-col h-full"
            onClick={onClick}
        >
            <div className="w-full h-48 overflow-hidden relative flex-shrink-0">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                    loading="eager"
                />
            </div>
            <div className="p-4 flex-grow flex flex-col justify-between min-h-0">
                <h2 className="text-center text-2xl font-semibold mb-2 line-clamp-2">
                    {title}
                </h2>
                <p className="text-center text-sm line-clamp-3">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default PlaylistCard;
