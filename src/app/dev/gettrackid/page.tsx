"use client";
import Button from "@/components/button";
import React, { useState } from "react";

const GetTrackIdPage = () => {
	const [iframeEl, setiframeel] = useState(" ");
	const [trackId, setTrackId] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-4">
			<h1 className="text-4xl font-bold my-12 text-center">
				Get Track ID
			</h1>
			<p className="text-center">
				This page helps you to get a SoundCloud track ID by simply
				entering a URL.
			</p>
			<p className="text-center">
				Just paste the SoundCloud track URL / iframe code below and
				click &apos;Get Track ID&apos;.
			</p>
			<form
				className="flex flex-col items-center gap-4 mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					const url = (
						e.target as HTMLFormElement
					).elements.namedItem("url") as HTMLInputElement;

					let soundcloudUrl = url.value;
					if (url.value.includes("<iframe")) {
						const srcMatch = url.value.match(/src="([^"]+)"/);
						if (srcMatch) {
							soundcloudUrl = srcMatch[1];
						}
					}

					setTrackId(
						soundcloudUrl.match(/tracks[\/=%](\d+)/)?.[1] ?? null
					);

					setiframeel(soundcloudUrl);

					if (!trackId && !iframeEl) {
						setTrackId("Invalid SoundCloud URL or iframe code");
					}
				}}
			>
				<input
					type="text"
					name="url"
					placeholder="Enter SoundCloud track URL"
					className="p-2 border border-gray-300 rounded w-80"
					required
				/>
				<Button label="Get Track ID" type="submit" />

				{trackId && (
					<p className="text-center">
						<strong>Track ID:</strong> {trackId}
					</p>
				)}

				{iframeEl && (
					<div>
						<iframe
							width="100%"
							height="300"
							allow="autoplay"
							src={iframeEl}
						></iframe>
					</div>
				)}
			</form>
		</div>
	);
};

export default GetTrackIdPage;
