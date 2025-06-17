"use client";
import React from "react";

const Footer = () => {
	const currentYear = new Date().getFullYear();
	return (
		<div className="w-full p-4 text-center text-[var(--text)] flex flex-col items-center justify-center mt-4">
			<p>&copy; {currentYear} SongGuessr. All rights reserved.</p>
		</div>
	);
};

export default Footer;
