import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSession,
  encryptPassword,
  getSessionCookieOptions,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { username, password, displayName } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "ユーザー名とパスワードは必須です" },
        { status: 400 },
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: "ユーザー名は3〜50文字で入力してください" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このユーザー名は既に使用されています" },
        { status: 409 },
      );
    }

    const passwordHash = encryptPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || null,
      },
    });

    const sessionId = await createSession(user.id);

    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions();
    cookieStore.set(cookieOptions.name, sessionId, cookieOptions);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "ユーザー登録に失敗しました" },
      { status: 500 },
    );
  }
}
