import { IUser } from "@/database/schemas/User";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("JWT_SECRET is undefined");
    console.error(
        "Available env vars:",
        Object.keys(process.env).filter((key) => key.includes("JWT"))
    );
    console.error("NODE_ENV:", process.env.NODE_ENV);
}

export async function generateToken(
    user: IUser | { _id: string; password: string }
) {
    if (!JWT_SECRET) {
        throw new Error(
            `JWT_SECRET is not defined. Check your .env.local file in the project root and ensure it contains: JWT_SECRET=your_secret_here`
        );
    }
    const token = await new jose.SignJWT({
        _id: user._id,
        password: user.password,
    })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode(JWT_SECRET));
    return token;
}

export async function validateToken(
    token: string | null
): Promise<IUser | null> {
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
        const { payload } = await jose.jwtVerify(
            token,
            new TextEncoder().encode(JWT_SECRET)
        );
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
