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
				breakStatus: "not_on_break",
				lastRecord: null,
			};
			return NextResponse.json(response);
		}

		// 順序から種類を判定
		const recordsWithType = addTypeToRecords(todayRecords);

		// work(出退勤)とbreak(休憩)を分けて、それぞれの最後のレコードを取得
		const workRecords = recordsWithType.filter(
			(r) => r.type === "clock_in" || r.type === "clock_out",
		);
		const breakRecords = recordsWithType.filter(
			(r) => r.type === "break_start" || r.type === "break_end",
		);

		// 勤務状態の判定（workレコードの最後）
		const lastWorkRecord = workRecords[workRecords.length - 1];
		const workStatus =
			lastWorkRecord?.type === "clock_in" ? "clocked_in" : "clocked_out";

		// 休憩状態の判定（breakレコードの最後）
		const lastBreakRecord = breakRecords[breakRecords.length - 1];
		const breakStatus =
			lastBreakRecord?.type === "break_start" ? "on_break" : "not_on_break";

		const lastRecord = recordsWithType[recordsWithType.length - 1];

		const response: StatusResponse = {
			status: workStatus,
			breakStatus,
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
