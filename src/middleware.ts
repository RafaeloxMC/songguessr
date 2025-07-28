import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
        try {
            const clonedRequest = request.clone();
            const body = await clonedRequest.text();
            if (body) {
                JSON.parse(body);
            }
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON" },
                { status: 400 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};
