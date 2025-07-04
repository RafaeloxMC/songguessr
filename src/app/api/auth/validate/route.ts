import { validateToken } from "@/util/accounts/tokens";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const token = (await headers()).get("Authorization");

    const user = await validateToken(token);
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    } else {
        return NextResponse.json({ success: true }, { status: 200 });
    }
}
