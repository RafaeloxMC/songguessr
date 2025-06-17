"use client";
import React from "react";
import { FloatingNote } from "./floatingnote";

const FloatingNotesBackground = () => {
	const musicalNotes = ["🎵", "🎶", "🎼"];
	return (
		<div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
			{musicalNotes.map((note, i) => (
				<FloatingNote key={i} note={note} delay={i * 2} />
			))}
		</div>
	);
};

export default FloatingNotesBackground;
