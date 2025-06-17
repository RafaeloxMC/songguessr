import Link from "next/link";
import React from "react";

const Navbar = () => {
	return (
		<div className="fixed flex flex-row top-0 left-0 right-0 z-50 backdrop-blur-3xl">
			<div className="flex items-center justify-between w-full p-4 shadow-md">
				<Link className="text-lg font-bold" href="/">
					SongGuessr
				</Link>
				<nav className="space-x-4">
					<Link href="/" className="hover:underline">
						Home
					</Link>
					<Link href="/game" className="hover:underline">
						Game
					</Link>
					<Link href="/about" className="hover:underline">
						About
					</Link>
					<Link href="/contact" className="hover:underline">
						Contact
					</Link>
				</nav>
			</div>
		</div>
	);
};

export default Navbar;
