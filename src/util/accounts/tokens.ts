import * as jose from "jose";

interface TokenUser {
    _id: string;
    password: string;
}

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
    user: TokenUser | { _id: string; password: string }
) {
    if (!JWT_SECRET) {
        throw new Error(
            `JWT_SECRET is not defined. Check your .env.local file in the project root and ensure it contains: JWT_SECRET=your_secret_here`
        );
    }
    const token = await new jose.SignJWT({
        _id: user._id.toString(),
        password: user.password,
    })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode(JWT_SECRET));
    return token;
}

export async function validateToken(
    token: string | null
): Promise<TokenUser | null> {
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
            let userIdString: string;
            if (typeof payload._id === "string") {
                userIdString = payload._id;
            } else if (
                payload._id &&
                typeof payload._id === "object" &&
                "buffer" in payload._id
            ) {
                const bufferArray = Object.values(
                    (payload._id as { buffer: { [key: string]: number } })
                        .buffer as { [key: string]: number }
                ) as number[];
                const buffer = Buffer.from(bufferArray);
                const hexString = buffer.toString("hex");
                if (hexString.length === 24) {
                    userIdString = hexString;
                } else {
                    throw new Error("Invalid ObjectId buffer length");
                }
            } else {
                throw new Error("Invalid user ID format in token");
            }

            if (
                !userIdString ||
                userIdString.length !== 24 ||
                !/^[0-9a-fA-F]{24}$/.test(userIdString)
            ) {
                throw new Error("Invalid ObjectId format");
            }

            return {
                _id: userIdString,
                password: payload.password as string,
            } as TokenUser;
        }
        return null;
    } catch (error) {
        console.error("Error validating token:", error);
        return null;
    }
}
