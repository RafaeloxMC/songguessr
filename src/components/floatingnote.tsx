"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const FloatingNote = ({
	note,
	delay = 0,
}: {
	note: string;
	delay?: number;
}) => {
	const [isClient, setIsClient] = useState(false);
	const [animationValues, setAnimationValues] = useState({
		initialX: 500,
		initialY: 1000,
		animateX: 500,
		duration: 15,
	});

	useEffect(() => {
		setIsClient(true);
		setAnimationValues({
			initialX: Math.random() * window.innerWidth,
			initialY: window.innerHeight + 100,
			animateX: Math.random() * window.innerWidth,
			duration: 12 + Math.random() * 6,
		});
	}, []);

	if (!isClient) {
		return null;
	}

	return (
		<motion.div
			className="absolute text-2xl opacity-20 pointer-events-none"
			initial={{
				x: animationValues.initialX,
				y: animationValues.initialY,
			}}
			animate={{
				y: -100,
				x: animationValues.animateX,
			}}
			transition={{
				duration: animationValues.duration,
				repeat: Infinity,
				delay,
				ease: "linear",
			}}
		>
			{note}
		</motion.div>
	);
};
