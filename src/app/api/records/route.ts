import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addTypeToRecords,
  calculateMonthlyStats,
  getMonthEnd,
  getMonthStart,
  groupRecordsByDay,
} from "@/lib/utils";
import type { RecordsResponse } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    // デフォルトは当月
    const now = new Date();
    const year = yearParam ? Number.parseInt(yearParam) : now.getFullYear();
    const month = monthParam ? Number.parseInt(monthParam) : now.getMonth() + 1;

    // バリデーション
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 },
      );
    }

    // 指定月の範囲を取得
    const monthStart = getMonthStart(year, month);
    const monthEnd = getMonthEnd(year, month);

    // 指定月の全レコードを取得
    const records = await prisma.record.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // 日ごとにグループ化して種類を判定
    const grouped = groupRecordsByDay(records);
    const recordsWithType = [];

    for (const [, dayRecords] of grouped) {
      const withType = addTypeToRecords(dayRecords);
      recordsWithType.push(...withType);
    }

    // 月次統計を計算
    const stats = calculateMonthlyStats(records);

    const response: RecordsResponse = {
      records: recordsWithType,
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Records API error:", error);
    return NextResponse.json(
      { error: "Failed to get records" },
      { status: 500 },
    );
  }
}
