import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession, getSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions();
    const sessionId = cookieStore.get(cookieOptions.name)?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    cookieStore.delete(cookieOptions.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json(
      { error: "ログアウトに失敗しました" },
      { status: 500 },
    );
  }
}
