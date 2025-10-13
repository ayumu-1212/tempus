import type { Record } from "@prisma/client";
import type { ClockType, RecordWithType } from "@/types";

/**
 * 指定された日時が属する「1日」の開始時刻を取得
 * 1日の定義: AM 6:00 ～ 翌日 AM 6:00
 *
 * @param date 日時
 * @returns その日の開始時刻（6:00）
 */
export function getDayStart(date: Date): Date {
	const dayStart = new Date(date);
	dayStart.setHours(6, 0, 0, 0);

	// もし現在時刻が6時より前なら、前日の6時が開始
	if (date.getHours() < 6) {
		dayStart.setDate(dayStart.getDate() - 1);
	}

	return dayStart;
}

/**
 * 指定された日時が属する「1日」の終了時刻を取得
 * 1日の定義: AM 6:00 ～ 翌日 AM 6:00
 *
 * @param date 日時
 * @returns その日の終了時刻（翌日の5:59:59.999）
 */
export function getDayEnd(date: Date): Date {
	const dayEnd = new Date(getDayStart(date));
	dayEnd.setDate(dayEnd.getDate() + 1);
	dayEnd.setMilliseconds(-1); // 5:59:59.999

	return dayEnd;
}

/**
 * 指定された月の開始時刻を取得
 * 月の定義: その月1日の6:00
 *
 * @param year 年
 * @param month 月（1-12）
 * @returns 月の開始時刻
 */
export function getMonthStart(year: number, month: number): Date {
	const monthStart = new Date(year, month - 1, 1, 6, 0, 0, 0);
	return monthStart;
}

/**
 * 指定された月の終了時刻を取得
 * 月の定義: 翌月1日の5:59:59.999
 *
 * @param year 年
 * @param month 月（1-12）
 * @returns 月の終了時刻
 */
export function getMonthEnd(year: number, month: number): Date {
	const monthEnd = new Date(year, month, 1, 6, 0, 0, -1);
	return monthEnd;
}

/**
 * レコードに出勤/退勤の種類を付与
 * その日の打刻順序により判定：奇数番目=出勤、偶数番目=退勤
 *
 * @param records 時系列順にソートされた打刻レコード（同じ日のもの）
 * @returns 種類が付与されたレコード
 */
export function addTypeToRecords(records: Record[]): RecordWithType[] {
	return records.map((record, index) => ({
		...record,
		type: (index % 2 === 0 ? "clock_in" : "clock_out") as ClockType,
	}));
}

/**
 * 2つの日時間の時間差を計算（分単位）
 *
 * @param start 開始日時
 * @param end 終了日時
 * @returns 時間差（分）
 */
export function getMinutesDiff(start: Date, end: Date): number {
	return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * 分を "HH:MM" 形式に変換
 *
 * @param minutes 分
 * @returns "HH:MM" 形式の文字列
 */
export function formatMinutesToHHMM(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours}:${mins.toString().padStart(2, "0")}`;
}

/**
 * 日付を "YYYY-MM-DD" 形式に変換
 *
 * @param date 日付
 * @returns "YYYY-MM-DD" 形式の文字列
 */
export function formatDateToISO(date: Date): string {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * 打刻レコードを日ごとにグループ化
 *
 * @param records 打刻レコード
 * @returns 日付をキーとしたレコードのマップ
 */
export function groupRecordsByDay(
	records: Record[],
): Map<string, Record[]> {
	const grouped = new Map<string, Record[]>();

	for (const record of records) {
		const dayStart = getDayStart(new Date(record.timestamp));
		const dateKey = formatDateToISO(dayStart);

		if (!grouped.has(dateKey)) {
			grouped.set(dateKey, []);
		}
		grouped.get(dateKey)?.push(record);
	}

	// 各日のレコードを時系列順にソート
	for (const [, dayRecords] of grouped) {
		dayRecords.sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		);
	}

	return grouped;
}
