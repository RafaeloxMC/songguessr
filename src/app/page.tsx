"use client";
import Button from "@/components/button";
import { redirect } from "next/navigation";
import React from "react";

const HomePage = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen">
			<h1 className="text-4xl font-bold my-12">SongGuessr.com</h1>
			<p className="text-center">
				SongGuessr is a game where you guess songs by various hints and
				clues.
			</p>

			<Button
				label="Play Now"
				icon={<span>🎵</span>}
				onClick={() => redirect("/game")}
				className="mt-8"
			/>
		</div>
	);
};

export default HomePage;
