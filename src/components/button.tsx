"use client";
import React from "react";
import { motion } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	label: string;
	icon?: React.ReactNode;
	variant?: "primary" | "secondary" | "accent";
	disabled?: boolean;
	className?: string;
	onClick?: () => void;
	children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
	label = "Click Me",
	icon,
	variant = "primary",
	disabled = false,
	className = "",
	onClick,
	children,
}) => {
	return (
		<motion.button
			className={`text-[var(--text)] rounded-lg p-2 shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-y-1 active:shadow-none transition-all duration-150 ${className}`}
			style={{
				backgroundColor: `var(--${variant})`,
				color: "var(--text)",
			}}
			disabled={disabled}
			onClick={onClick}
		>
			<div className="flex flex-col items-center">
				<div className="flex flex-row items-center p-2">
					{icon && <span className="mr-2">{icon}</span>}
					<span className="text-lg font-semibold">{label}</span>
				</div>
				{children}
			</div>
		</motion.button>
	);
};

export default Button;
