import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "cdn.pixabay.com",
                port: "",
                pathname: "/**",
            },
        ],
    },
    env: {
        JWT_SECRET: process.env.JWT_SECRET,
    },
};

export default nextConfig;
