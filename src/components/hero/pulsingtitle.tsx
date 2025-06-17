"use client";
import { motion } from "framer-motion";

export const PulsingTitle = ({ children }: { children: React.ReactNode }) => (
	<motion.h1
		className="text-5xl md:text-6xl font-bold mb-6 mt-4 text-center text-[var(--text)]"
		animate={{
			scale: [1, 1.02, 1],
		}}
		transition={{
			duration: 3,
			repeat: Infinity,
			ease: "easeInOut",
		}}
	>
		{children}
	</motion.h1>
);
