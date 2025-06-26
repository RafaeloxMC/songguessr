import User from "@/database/schemas/User";
import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { connectDB } from "@/database/db";

export async function POST(request: NextRequest) {
    await connectDB();
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
        return NextResponse.json(
            { error: "All fields are required" },
            { status: 400 }
        );
    }

    return await User.findOne({
        $or: [{ email }, { username }],
    }).then(async (existingUser) => {
        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 409 }
            );
        }

        const hashedPw = await argon2.hash(password);

        if (await argon2.verify(hashedPw, password)) {
            await User.create({
                username,
                email,
                password: hashedPw,
            });
            return NextResponse.json(
                { message: "User created successfully" },
                { status: 201 }
            );
        } else {
            return NextResponse.json(
                { error: "Password verification failed" },
                { status: 400 }
            );
        }
    });
}
