import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDayStart, getDayEnd, addTypeToRecords } from "@/lib/utils";
import type { StatusResponse } from "@/types";

export async function GET() {
	try {
		// 当日（6:00-6:00）の打刻を取得
		const now = new Date();
		const dayStart = getDayStart(now);
		const dayEnd = getDayEnd(now);

		const todayRecords = await prisma.record.findMany({
			where: {
				timestamp: {
					gte: dayStart,
					lte: dayEnd,
				},
			},
			orderBy: {
				timestamp: "asc",
			},
		});

		// レコードがない場合
		if (todayRecords.length === 0) {
			const response: StatusResponse = {
				status: "clocked_out",
				lastRecord: null,
			};
			return NextResponse.json(response);
		}

		// 順序から種類を判定
		const recordsWithType = addTypeToRecords(todayRecords);
		const lastRecord = recordsWithType[recordsWithType.length - 1];

		// 最後の打刻が出勤（奇数個）なら出勤中、退勤（偶数個）なら退勤済み
		const response: StatusResponse = {
			status: lastRecord.type === "clock_in" ? "clocked_in" : "clocked_out",
			lastRecord,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Status API error:", error);
		return NextResponse.json(
			{ error: "Failed to get status" },
			{ status: 500 },
		);
	}
}
