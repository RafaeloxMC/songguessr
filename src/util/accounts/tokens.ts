import { IUser } from "@/database/schemas/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Add debugging to see what's available
if (!JWT_SECRET) {
    console.error("JWT_SECRET is undefined");
    console.error(
        "Available env vars:",
        Object.keys(process.env).filter((key) => key.includes("JWT"))
    );
    console.error("NODE_ENV:", process.env.NODE_ENV);
}

export function generateToken(user: IUser | { _id: string; password: string }) {
    if (!JWT_SECRET) {
        throw new Error(
            `JWT_SECRET is not defined. Check your .env.local file in the project root and ensure it contains: JWT_SECRET=your_secret_here`
        );
    }
    const token = jwt.sign(
        {
            _id: user._id,
            password: user.password,
        },
        JWT_SECRET,
        {
            expiresIn: "1d",
        }
    );
    return token;
}

export function validateToken(token: string | null): IUser | null {
    if (!token) {
        return null;
    }
    if (!JWT_SECRET) {
        throw new Error(
            `JWT_SECRET is not defined. Check your .env.local file in the project root and ensure it contains: JWT_SECRET=your_secret_here`
        );
    }
    try {
        if (token.startsWith("Bearer ")) {
            token = token.slice(7, token.length);
        }
        const payload = jwt.verify(token, JWT_SECRET, {
            maxAge: "1d",
        });
        if (
            typeof payload === "object" &&
            payload !== null &&
            "_id" in payload &&
            "password" in payload
        ) {
            return {
                _id: payload._id as string,
                password: payload.password as string,
            } as unknown as IUser;
        }
        return null;
    } catch {
        return null;
    }
}
