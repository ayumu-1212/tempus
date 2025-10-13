import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
	// API routesは認証をスキップ（各APIで個別に認証を実装）
	if (request.nextUrl.pathname.startsWith("/api")) {
		return NextResponse.next();
	}

	// Basic認証のチェック
	const authHeader = request.headers.get("authorization");

	if (!authHeader) {
		return new NextResponse("Authentication required", {
			status: 401,
			headers: {
				"WWW-Authenticate": 'Basic realm="Tempus"',
			},
		});
	}

	// "Basic base64string" の形式から認証情報を抽出
	const auth = authHeader.split(" ")[1];
	const [username, password] = Buffer.from(auth, "base64").toString().split(":");

	const validUsername = process.env.BASIC_AUTH_USERNAME || "admin";
	const validPassword = process.env.BASIC_AUTH_PASSWORD || "changeme";

	if (username !== validUsername || password !== validPassword) {
		return new NextResponse("Invalid credentials", {
			status: 401,
			headers: {
				"WWW-Authenticate": 'Basic realm="Tempus"',
			},
		});
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
