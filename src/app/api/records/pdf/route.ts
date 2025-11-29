import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMonthStart,
  getMonthEnd,
  groupRecordsByDay,
  addTypeToRecords,
  calculateMonthlyStats,
  formatMinutesToHHMM,
  getMinutesDiff,
} from "@/lib/utils";
import type { RecordWithType } from "@/types";
import PDFDocument from "pdfkit";
import path from "node:path";

interface DayRecord {
  dateKey: string;
  dateLabel: string;
  sessions: {
    clockIn: string;
    clockOut: string;
    breakTime: string;
    workTime: string;
    hasEdit: boolean;
    comment: string | null;
  }[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
}

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

    // 月次統計を計算
    const stats = calculateMonthlyStats(records);

    // 打刻漏れがある場合はエラー
    if (stats.missingClockOuts.length > 0) {
      const missingDates = stats.missingClockOuts.join(", ");
      return NextResponse.json(
        {
          error: "打刻漏れがあるためPDFを出力できません",
          missingClockOuts: stats.missingClockOuts,
          message: `以下の日付で退勤が未打刻です: ${missingDates}`,
        },
        { status: 400 },
      );
    }

    // 日ごとにグループ化してデータを整形
    const grouped = groupRecordsByDay(records);
    const dayRecords: DayRecord[] = [];

    for (const [dateKey, dayRecordsRaw] of grouped) {
      const recordsWithType = addTypeToRecords(dayRecordsRaw);

      // workレコードのみをフィルタ
      const workRecords = recordsWithType.filter(
        (r) => r.type === "clock_in" || r.type === "clock_out",
      );

      // breakレコードのみをフィルタ
      const breakRecords = recordsWithType.filter(
        (r) => r.type === "break_start" || r.type === "break_end",
      );

      // workレコードがない日はスキップ
      if (workRecords.length === 0) {
        continue;
      }

      // 日付ラベルを作成
      const [y, m, d] = dateKey.split("-");
      const dateLabel = `${y}年${Number.parseInt(m)}月${Number.parseInt(d)}日`;

      // 出退勤ペアを作成
      const sessions: DayRecord["sessions"] = [];
      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;

      // 休憩時間を計算
      for (let i = 0; i < breakRecords.length; i += 2) {
        const breakStart = breakRecords[i];
        const breakEnd = breakRecords[i + 1];
        if (breakStart && breakEnd) {
          totalBreakMinutes += getMinutesDiff(
            new Date(breakStart.timestamp),
            new Date(breakEnd.timestamp),
          );
        }
      }

      for (let i = 0; i < workRecords.length; i += 2) {
        const clockIn = workRecords[i];
        const clockOut = workRecords[i + 1];

        if (clockIn && clockOut) {
          const workMinutes = getMinutesDiff(
            new Date(clockIn.timestamp),
            new Date(clockOut.timestamp),
          );
          totalWorkMinutes += workMinutes;

          const hasEdit = clockIn.isEdited || clockOut.isEdited;
          const comment = clockIn.comment || clockOut.comment;

          sessions.push({
            clockIn: formatTime(new Date(clockIn.timestamp)),
            clockOut: formatTime(new Date(clockOut.timestamp)),
            breakTime: i === 0 ? formatMinutesToHHMM(totalBreakMinutes) : "-",
            workTime: formatMinutesToHHMM(workMinutes),
            hasEdit,
            comment,
          });
        }
      }

      dayRecords.push({
        dateKey,
        dateLabel,
        sessions,
        totalWorkMinutes: totalWorkMinutes - totalBreakMinutes,
        totalBreakMinutes,
      });
    }

    // 日付順にソート
    dayRecords.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    // PDF生成
    const pdfBuffer = await generatePDF(year, month, dayRecords, stats);

    // レスポンス
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance_${year}_${month.toString().padStart(2, "0")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}

function formatTime(date: Date): string {
  // JSTに変換して時刻を取得
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const hours = jst.getUTCHours().toString().padStart(2, "0");
  const minutes = jst.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

async function generatePDF(
  year: number,
  month: number,
  dayRecords: DayRecord[],
  stats: { totalWorkingHours: string; workingDays: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // 日本語フォントのパス
    const fontPath = path.join(
      process.cwd(),
      "public/fonts/NotoSansJP-Regular.ttf",
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      font: fontPath,
      info: {
        Title: `勤怠記録 ${year}年${month}月`,
        Author: "Tempus",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ヘッダー
    doc.fontSize(20).text(`勤怠記録`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(16).text(`${year}年${month}月`, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .text(`出力日時: ${formatDateTime(new Date())}`, { align: "center" });
    doc.moveDown(1);

    // サマリー
    doc.fontSize(14).text("月次集計", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`総勤務日数: ${stats.workingDays}日`);
    doc.text(`総勤務時間: ${stats.totalWorkingHours}`);
    doc.moveDown(1);

    // テーブルヘッダー
    doc.fontSize(14).text("日別詳細", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [100, 55, 55, 55, 55, 80, 90];
    const headers = [
      "日付",
      "出勤",
      "退勤",
      "休憩",
      "勤務時間",
      "備考",
      "コメント",
    ];

    // ヘッダー描画
    doc.fontSize(9);
    let x = 50;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x, tableTop, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    }

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(545, tableTop + 15)
      .stroke();

    let currentY = tableTop + 20;

    // データ描画
    for (const day of dayRecords) {
      // ページ送りチェック
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;

        // 新しいページにヘッダーを描画
        x = 50;
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], x, currentY, {
            width: colWidths[i],
            align: "left",
          });
          x += colWidths[i];
        }
        doc
          .moveTo(50, currentY + 15)
          .lineTo(545, currentY + 15)
          .stroke();
        currentY += 20;
      }

      for (let i = 0; i < day.sessions.length; i++) {
        const session = day.sessions[i];
        x = 50;

        // 日付（最初のセッションのみ表示）
        doc.text(i === 0 ? day.dateLabel : "", x, currentY, {
          width: colWidths[0],
          align: "left",
        });
        x += colWidths[0];

        // 出勤
        doc.text(session.clockIn, x, currentY, {
          width: colWidths[1],
          align: "left",
        });
        x += colWidths[1];

        // 退勤
        doc.text(session.clockOut, x, currentY, {
          width: colWidths[2],
          align: "left",
        });
        x += colWidths[2];

        // 休憩
        doc.text(session.breakTime, x, currentY, {
          width: colWidths[3],
          align: "left",
        });
        x += colWidths[3];

        // 勤務時間
        doc.text(session.workTime, x, currentY, {
          width: colWidths[4],
          align: "left",
        });
        x += colWidths[4];

        // 備考（手動編集マーク）
        doc.text(session.hasEdit ? "手動編集" : "", x, currentY, {
          width: colWidths[5],
          align: "left",
        });
        x += colWidths[5];

        // コメント
        doc.text(session.comment || "", x, currentY, {
          width: colWidths[6],
          align: "left",
        });

        currentY += 15;
      }

      // 日ごとに区切り線
      doc
        .moveTo(50, currentY)
        .lineTo(545, currentY)
        .strokeColor("#cccccc")
        .stroke();
      doc.strokeColor("#000000");
      currentY += 5;
    }

    doc.end();
  });
}

function formatDateTime(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = (jst.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = jst.getUTCDate().toString().padStart(2, "0");
  const hours = jst.getUTCHours().toString().padStart(2, "0");
  const minutes = jst.getUTCMinutes().toString().padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}
