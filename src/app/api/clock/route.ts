import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSlackNotification } from "@/lib/slack";
import { addTypeToRecords, getDayEnd, getDayStart } from "@/lib/utils";
import type { ClockResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { source = "web", timestamp, recordType = "work" } = body;

    // タイムスタンプの取得（指定されていない場合は現在時刻）
    const clockTime = timestamp ? new Date(timestamp) : new Date();

    // 打刻レコードを作成
    const record = await prisma.record.create({
      data: {
        userId: user.id,
        timestamp: clockTime,
        source,
        recordType, // 'work' or 'break'
        isEdited: !!timestamp, // timestampが指定されている場合は編集済みとする
      },
    });

    // その日の全ての打刻を取得して種類を判定
    const dayStart = getDayStart(clockTime);
    const dayEnd = getDayEnd(clockTime);

    const dayRecords = await prisma.record.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // 順序から種類を判定
    const recordsWithType = addTypeToRecords(dayRecords);
    const currentRecordWithType = recordsWithType.find(
      (r) => r.id === record.id,
    );

    if (!currentRecordWithType) {
      throw new Error("Failed to determine record type");
    }

    const response: ClockResponse = {
      success: true,
      record: currentRecordWithType,
      type: currentRecordWithType.type,
    };

    // 通知を送信（非同期で、エラーが発生しても処理は継続）
    const displayName = user.displayName || user.username;
    // // Discord通知
    // if (process.env.DISCORD_WEBHOOK_URL) {
    // 	sendDiscordNotification(currentRecordWithType, displayName).catch((error) => {
    // 		console.error("Discord notification failed:", error);
    // 	});
    // }
    // Slack通知
    if (process.env.SLACK_WEBHOOK_URL) {
      sendSlackNotification(currentRecordWithType, displayName).catch((error) => {
        console.error("Slack notification failed:", error);
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Clock API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clock in/out" },
      { status: 500 },
    );
  }
}
