import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/util/accounts/tokens";

const protectedPaths: Map<string, string[]> = new Map([
    ["/api/playlists", ["POST"]],
    ["/api/playlists/[id]", ["PATCH", "DELETE"]],
    ["/api/playlists/[id]/songs", ["POST", "DELETE"]],
    ["/api/songs/[id]", ["PATCH", "DELETE"]],
    ["/api/me/playlists", ["GET"]],
    ["/api/auth/me", ["GET"]],
    ["/api/auth/validate", ["GET"]],
]);

function matchesPath(pathIn: string): string[] {
    if (protectedPaths.has(pathIn)) {
        return protectedPaths.get(pathIn)!;
    }

    for (const [path, methods] of protectedPaths.entries()) {
        if (path.includes("[id]")) {
            const regex = new RegExp(
                "^" + path.replace(/\[id\]/g, "[^/]+") + "$"
            );
            if (regex.test(pathIn)) {
                return methods;
            }
        }
    }
    return [];
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
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
    const methods = matchesPath(pathname);
    if (methods.length > 0 && methods.includes(request.method)) {
        const authHeader = (await headers()).get("Authorization");
        if (!authHeader) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = validateToken(authHeader);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
    }
    return NextResponse.next();
}
