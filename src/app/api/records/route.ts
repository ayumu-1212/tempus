import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
	getMonthStart,
	getMonthEnd,
	groupRecordsByDay,
	addTypeToRecords,
	calculateMonthlyStats,
} from "@/lib/utils";
import type { RecordsResponse } from "@/types";

export async function GET(request: Request) {
	try {
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
