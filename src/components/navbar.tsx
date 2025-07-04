import Link from "next/link";
import React from "react";

const Navbar = () => {
    return (
        <div className="fixed flex flex-row top-0 left-0 right-0 z-50 backdrop-blur-3xl">
            <div className="flex items-center justify-between w-full p-4 shadow-md">
                <Link className="text-lg font-bold navbar-link" href="/">
                    SongGuessr
                </Link>
                <nav className="space-x-4">
                    <Link href="/" className="hover:underline navbar-link">
                        Home
                    </Link>
                    <Link href="/play" className="hover:underline navbar-link">
                        Play
                    </Link>
                    <Link
                        href="/dashboard"
                        className="hover:underline navbar-link"
                    >
                        Dashboard
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default Navbar;
