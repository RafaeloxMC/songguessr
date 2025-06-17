"use client";
import Button from "@/components/button";
import Card from "@/components/card";
import Image from "next/image";
import { redirect } from "next/navigation";
import React from "react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/hero/statscard";
import { FeatureCard } from "@/components/hero/featurecard";
import { AnimatedSection } from "@/components/hero/animatedsection";
import { PulsingTitle } from "@/components/hero/pulsingtitle";
import FloatingNotesBackground from "@/components/floatingnotesbg";

const HomePage = () => {
	const gameFeatures = [
		{
			icon: "🎵",
			title: "Audio Snippets",
			description:
				"Listen to short clips and identify the song from just a few seconds of melody",
		},
		{
			icon: "😎",
			title: "Emoji Puzzles",
			description:
				"Decode creative emoji combinations that cleverly represent song titles",
		},
		{
			icon: "📝",
			title: "Lyric Fragments",
			description:
				"Guess songs from mysterious snippets of lyrics from verses or choruses",
		},
		{
			icon: "🎨",
			title: "Visual Clues",
			description:
				"Interpret album artwork hints and visual representations of songs",
		},
	];

	// Placeholder data
	const stats = [
		{ number: "100+", label: "Songs in Database" },
		{ number: "10+", label: "Music Genres" },
		{ number: "137+", label: "Games Played" },
		{ number: "4.8★", label: "User Rating" },
	];

	return (
		<div className="flex flex-col items-center justify-center space-y-16 max-w-6xl mx-auto px-4">
			{/* Floating Musical Notes Background */}
			<FloatingNotesBackground />

			{/* Hero Section */}
			<AnimatedSection>
				<div className="text-center space-y-6 relative z-10">
					<PulsingTitle>Welcome to SongGuessr! 🎤</PulsingTitle>

					<p className="text-xl md:text-2xl text-center max-w-3xl mx-auto text-[var(--text-secondary)]">
						Test your musical knowledge with the ultimate song
						guessing game! Challenge yourself with audio clips,
						emoji puzzles, lyrics, and more.
					</p>

					<Button
						label="Start Playing Now"
						icon={<span>🎵</span>}
						onClick={() => redirect("/game")}
						variant="primary"
						className="text-xl px-4 py-2 mt-8"
					/>
				</div>
			</AnimatedSection>

			{/* Stats Section */}
			<AnimatedSection delay={0.2}>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
					{stats.map((stat, index) => (
						<StatCard
							key={index}
							number={stat.number}
							label={stat.label}
						/>
					))}
				</div>
			</AnimatedSection>

			{/* Main Content Section */}
			<AnimatedSection delay={0.3}>
				<div className="flex flex-col lg:flex-row items-center gap-8 w-full">
					<div className="flex-1">
						<Card variant="secondary">
							<h2 className="text-3xl font-bold mb-4 text-center">
								Your Musical Journey Awaits 🚀
							</h2>
							<div className="space-y-4 text-lg">
								<p>
									In SongGuessr, you&apos;ll embark on an
									exciting musical journey where you guess
									songs through multiple different hints and
									clues. Whether you&apos;re a casual music
									listener or a true audiophile, SongGuessr
									offers an engaging way to test your musical
									knowledge!
								</p>
								<p>
									Challenge yourself across decades of music,
									from classic rock anthems to today&apos;s
									chart-toppers. Discover new favorites while
									rediscovering old classics. Can you decode
									the clues and name that tune? 🎯
								</p>
							</div>
						</Card>
					</div>

					<div className="flex-shrink-0">
						<motion.div
							animate={{
								y: [-8, 8, -8],
								rotate: [-1, 1, -1],
							}}
							transition={{
								duration: 4,
								repeat: Infinity,
								ease: "easeInOut",
							}}
							whileHover={{ scale: 1.05 }}
						>
							<div className="rounded-lg overflow-hidden shadow-[0_8px_0_rgba(0,0,0,0.3)]">
								<Image
									src="https://cdn.pixabay.com/photo/2015/09/05/19/42/headphones-924779_960_720.jpg"
									alt="Headphones"
									width={400}
									height={300}
									className="object-cover"
								/>
							</div>
						</motion.div>
					</div>
				</div>
			</AnimatedSection>

			{/* Game Features Section */}
			<AnimatedSection delay={0.4}>
				<div className="w-full space-y-8">
					<Card variant="primary">
						<h2 className="text-3xl font-bold text-center mb-6">
							How to Play 🎮
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{gameFeatures.map((feature, index) => (
								<FeatureCard
									key={index}
									icon={feature.icon}
									title={feature.title}
									description={feature.description}
								/>
							))}
						</div>
					</Card>
				</div>
			</AnimatedSection>

			{/* Call to Action Section */}
			<AnimatedSection delay={0.5}>
				<Card variant="accent">
					<div className="text-center space-y-6">
						<h2 className="text-3xl font-bold">
							Ready to Test Your Music Knowledge? 🧠
						</h2>

						<p className="text-lg max-w-2xl mx-auto">
							Join thousands of music lovers who are already
							playing SongGuessr. Discover new favorites,
							challenge your friends, and become the ultimate
							music guru! 🏆
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							<Button
								label="Play Now"
								icon={<span>🚀</span>}
								onClick={() => redirect("/game")}
								variant="primary"
								className="text-lg px-4 py-2"
							/>

							<motion.div whileTap={{ scale: 0.95 }}>
								<Button
									label="Learn More"
									icon={<span>📖</span>}
									onClick={() => redirect("/about")}
									variant="secondary"
									className="text-lg px-4 py-2"
								/>
							</motion.div>
						</div>
					</div>
				</Card>
			</AnimatedSection>
		</div>
	);
};

export default HomePage;
