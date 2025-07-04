import User from "@/database/schemas/User";
import { generateToken } from "@/util/accounts/tokens";
import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { connectDB } from "@/database/db";

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { email, password } = body;

        return await User.findOne({
            email: email,
        }).then(async (existingUser) => {
            if (existingUser) {
                const isMatchingPw = await argon2.verify(
                    existingUser.password,
                    password
                );
                if (isMatchingPw) {
                    return NextResponse.json({
                        success: true,
                        token: generateToken(existingUser),
                    });
                } else {
                    return NextResponse.json(
                        { success: false, message: "Invalid password" },
                        { status: 401 }
                    );
                }
            } else {
                return NextResponse.json(
                    { success: false, message: "User not found" },
                    { status: 404 }
                );
            }
        });
    } catch {
        return NextResponse.json(
            { success: false, message: "Login failed" },
            { status: 401 }
        );
    }
}
