import { motion } from "framer-motion";
import Card from "../card";

export const FeatureCard = ({
	icon,
	title,
	description,
}: {
	icon: string;
	title: string;
	description: string;
}) => (
	<motion.div
		initial={{ opacity: 0, y: 30 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.2 }}
		whileHover={{ scale: 1.05, y: -4 }}
	>
		<Card variant="accent">
			<div className="text-center space-y-3">
				<div className="text-4xl mb-3">{icon}</div>
				<h3 className="text-xl font-semibold">{title}</h3>
				<p className="text-sm">{description}</p>
			</div>
		</Card>
	</motion.div>
);
