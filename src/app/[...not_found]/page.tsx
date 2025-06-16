"use client";
import Button from "@/components/button";
import React from "react";

const NotFound = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen">
			<h1 className="text-2xl font-bold mb-4">404 | Page Not Found</h1>
			<p className="text-center">
				Even we could not guess what you were searching for!
			</p>
			<Button
				label="Go back"
				icon={<span>🔙</span>}
				onClick={() => window.history.back()}
				className="mt-8"
			/>
			<div className="flex items-center w-full max-w-xs my-4">
				<div className="flex-grow border-t border-[var(--text)]"></div>
				<span className="px-4 text-[var(--text)] text-sm">OR</span>
				<div className="flex-grow border-t border-[var(--text)]"></div>
			</div>
			<Button
				label="Go Home"
				icon={<span>🏠</span>}
				onClick={() => (window.location.href = "/")}
				className="mt-4"
			/>
		</div>
	);
};

export default NotFound;
