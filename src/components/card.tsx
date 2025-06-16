import React from "react";

interface CardProps {
	title?: string;
	description?: string;
	variant?: "primary" | "secondary" | "accent";
	children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
	title,
	description,
	variant = "primary",
	children,
}) => {
	return (
		<div
			className={`rounded-lg p-4 shadow-[0_4px_0_rgba(0,0,0,0.3)] transition-all duration-150`}
			style={{
				backgroundColor: `var(--${variant})`,
				color: "var(--text)",
			}}
		>
			{title && (
				<h2 className="text-center text-2xl font-semibold">{title}</h2>
			)}
			{description && <p className="">{description}</p>}
			{children}
		</div>
	);
};

export default Card;
