"use client";
import Button from "@/components/button";
import Card from "@/components/card";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen *:text-[var(--text)]">
			<h1 className="text-4xl font-bold mb-2 text-center">
				Theme Test Page
			</h1>
			<p className="mb-4 text-center">
				This page shows the current theme with examples. It
				automatically adapts to system light and dark mode.
			</p>
			<div className="flex flex-col flex-wrap items-center gap-2">
				<div className="flex flex-row flex-wrap gap-2 justify-center">
					<Card
						title="Primary Card Title"
						description="This is a description for the card."
						variant="primary"
					/>
					<Card
						title="Secondary Card Title"
						description="This is a description for the card."
						variant="secondary"
					/>
					<Card
						title="Accent Card Title"
						description="This is a description for the card."
						variant="accent"
					/>
				</div>
				<p className="text-[var(--text)] mt-2 text-center">
					This is a paragraph with the text color applied.
				</p>
				<p className="text-[var(--text-secondary)] mb-2 text-center">
					This is a paragraph with the secondary text color applied.
				</p>
				<Button
					label="Click Me"
					icon={<span>👍</span>}
					variant="accent"
					onClick={() => alert("Button clicked!")}
				/>
			</div>
		</div>
	);
}
