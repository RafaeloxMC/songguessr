"use client";

import { motion } from "framer-motion";
import Card from "../card";

export const StatCard = ({
	number,
	label,
}: {
	number: string;
	label: string;
}) => (
	<motion.div
		initial={{ opacity: 0, y: 30 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.2 }}
		whileHover={{ scale: 1.05, y: -2 }}
	>
		<Card variant="secondary">
			<div className="text-center">
				<div className="text-3xl font-bold mb-2">{number}</div>
				<div className="text-sm">{label}</div>
			</div>
		</Card>
	</motion.div>
);
