import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDayStart, getDayEnd, addTypeToRecords } from "@/lib/utils";

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: idStr } = await params;
		const id = Number.parseInt(idStr);
		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const body = await request.json();
		const { timestamp, comment, recordType } = body;

		if (!timestamp) {
			return NextResponse.json(
				{ error: "Timestamp is required" },
				{ status: 400 },
			);
		}

		// レコードを更新
		const updatedRecord = await prisma.record.update({
			where: { id },
			data: {
				timestamp: new Date(timestamp),
				comment: comment || null,
				recordType: recordType || "work",
				isEdited: true,
			},
		});

		// 更新後のその日の全レコードを取得して種類を判定
		const dayStart = getDayStart(new Date(updatedRecord.timestamp));
		const dayEnd = getDayEnd(new Date(updatedRecord.timestamp));

		const dayRecords = await prisma.record.findMany({
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

		const recordsWithType = addTypeToRecords(dayRecords);
		const currentRecordWithType = recordsWithType.find((r) => r.id === id);

		if (!currentRecordWithType) {
			throw new Error("Failed to determine record type");
		}

		return NextResponse.json({
			success: true,
			record: currentRecordWithType,
		});
	} catch (error) {
		console.error("Update record error:", error);
		return NextResponse.json(
			{ error: "Failed to update record" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: idStr } = await params;
		const id = Number.parseInt(idStr);
		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		await prisma.record.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Delete record error:", error);
		return NextResponse.json(
			{ error: "Failed to delete record" },
			{ status: 500 },
		);
	}
}
