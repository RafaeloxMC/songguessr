import Image from "next/image";
import React from "react";

interface MapCardProps {
	imageUrl: string;
	title: string;
	description: string;
	onClick?: () => void;
}

const MapCard: React.FC<MapCardProps> = ({
	imageUrl,
	title,
	description,
	onClick,
}) => {
	return (
		<div
			className="rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.3)] transition-all duration-150 bg-[var(--primary)] text-[var(--text)] overflow-hidden hover:shadow-none hover:translate-y-1 active:shadow-none active:translate-y-1"
			onClick={onClick}
		>
			<div className="w-96 h-48 overflow-hidden relative">
				<Image
					src={imageUrl}
					alt={title}
					className="object-cover"
					fill
					loading="eager"
				/>
			</div>
			<div className="p-4">
				<h2 className="text-center text-2xl font-semibold mb-2">
					{title}
				</h2>
				<p className="text-center text-sm">{description}</p>
			</div>
		</div>
	);
};

export default MapCard;
