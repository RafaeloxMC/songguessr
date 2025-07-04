"use client";
import Button from "@/components/button";
import Card from "@/components/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

function LoginPage() {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const router = useRouter();
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.status === 200) {
            localStorage.setItem("token", data.token);
            router.push("/");
        } else {
            setError(data.message || "Login failed. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-3xl font-bold mb-6">Login to SongGuessr</h1>
            <p className="mb-4">
                Please enter your email and password to continue.
            </p>
            <Card className="w-96 p-6" variant="secondary">
                <form
                    className="flex flex-col space-y-4"
                    onSubmit={handleSubmit}
                >
                    <input
                        type="email"
                        placeholder="Email"
                        className="p-2 rounded"
                        required
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="p-2 rounded"
                        required
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && (
                        <p className="text-red-500 text-sm text-center">
                            {error}
                        </p>
                    )}
                    <Button label="Login" className="w-full" type="submit" />
                    <span className="text-sm text-center">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/auth/signup"
                            className="text-[var(--text-secondary)]"
                        >
                            Sign up
                        </Link>
                    </span>
                </form>
            </Card>
        </div>
    );
}

export default LoginPage;
