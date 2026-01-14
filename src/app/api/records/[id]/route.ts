import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addTypeToRecords, getDayEnd, getDayStart } from "@/lib/utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = Number.parseInt(idStr);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // 所有者チェック
    const existingRecord = await prisma.record.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = Number.parseInt(idStr);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // 所有者チェック
    const existingRecord = await prisma.record.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
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
