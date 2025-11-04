import type { Record } from "@prisma/client";
import type { ClockType, RecordWithType } from "@/types";

// 日本時間のUTCオフセット（+9時間 = 540分）
const JST_OFFSET_MINUTES = 540;

/**
 * UTC時刻を日本時間（JST）に変換
 * @param date UTC日時
 * @returns 日本時間の日時オブジェクト（内部的にはUTCだが、日本時間として扱う）
 */
function toJST(date: Date): Date {
	const jst = new Date(date.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
	return jst;
}

/**
 * 日本時間として扱っている日時をUTCに戻す
 * @param jstDate 日本時間として扱っている日時
 * @returns UTC日時
 */
function fromJST(jstDate: Date): Date {
	const utc = new Date(jstDate.getTime() - JST_OFFSET_MINUTES * 60 * 1000);
	return utc;
}

/**
 * 指定された日時が属する「1日」の開始時刻を取得
 * 1日の定義: 日本時間 AM 6:00 ～ 翌日 AM 6:00
 *
 * @param date 日時（UTC）
 * @returns その日の開始時刻（日本時間6:00、UTC表現）
 */
export function getDayStart(date: Date): Date {
	// UTC時刻を日本時間に変換
	const jst = toJST(date);

	// 日本時間での時刻を取得
	const jstHours = jst.getUTCHours();

	// 日本時間で6:00:00にセット
	const dayStart = new Date(jst);
	dayStart.setUTCHours(6, 0, 0, 0);

	// もし現在時刻が日本時間で6時より前なら、前日の6時が開始
	if (jstHours < 6) {
		dayStart.setUTCDate(dayStart.getUTCDate() - 1);
	}

	// 日本時間からUTCに戻す
	return fromJST(dayStart);
}

/**
 * 指定された日時が属する「1日」の終了時刻を取得
 * 1日の定義: 日本時間 AM 6:00 ～ 翌日 AM 6:00
 *
 * @param date 日時（UTC）
 * @returns その日の終了時刻（日本時間翌日の5:59:59.999、UTC表現）
 */
export function getDayEnd(date: Date): Date {
	const dayEnd = new Date(getDayStart(date));
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
	dayEnd.setUTCMilliseconds(-1); // 5:59:59.999

	return dayEnd;
}

/**
 * 指定された月の開始時刻を取得
 * 月の定義: 日本時間でその月1日の6:00
 *
 * @param year 年（日本時間）
 * @param month 月（1-12、日本時間）
 * @returns 月の開始時刻（UTC表現）
 */
export function getMonthStart(year: number, month: number): Date {
	// 日本時間での月初1日6:00を作成（UTCとして）
	const jstMonthStart = new Date(Date.UTC(year, month - 1, 1, 6, 0, 0, 0));
	// 日本時間からUTCに変換
	return fromJST(jstMonthStart);
}

/**
 * 指定された月の終了時刻を取得
 * 月の定義: 日本時間で翌月1日の5:59:59.999
 *
 * @param year 年（日本時間）
 * @param month 月（1-12、日本時間）
 * @returns 月の終了時刻（UTC表現）
 */
export function getMonthEnd(year: number, month: number): Date {
	// 日本時間での翌月1日6:00を作成（UTCとして）
	const jstMonthEnd = new Date(Date.UTC(year, month, 1, 6, 0, 0, -1));
	// 日本時間からUTCに変換
	return fromJST(jstMonthEnd);
}

/**
 * レコードに出勤/退勤/休憩の種類を付与
 * recordTypeごとに、その日の打刻順序により判定：
 * - work: 奇数番目=出勤(clock_in)、偶数番目=退勤(clock_out)
 * - break: 奇数番目=休憩開始(break_start)、偶数番目=休憩終了(break_end)
 *
 * @param records 時系列順にソートされた打刻レコード（同じ日のもの）
 * @returns 種類が付与されたレコード
 */
export function addTypeToRecords(records: Record[]): RecordWithType[] {
	// recordTypeごとにグループ化してインデックスを管理
	const workIndex: { [key: number]: number } = {};
	const breakIndex: { [key: number]: number } = {};
	let workCount = 0;
	let breakCount = 0;

	return records.map((record, globalIndex) => {
		const isWork = record.recordType === "work";
		let type: ClockType;

		if (isWork) {
			const index = workCount;
			workIndex[globalIndex] = index;
			type = index % 2 === 0 ? "clock_in" : "clock_out";
			workCount++;
		} else {
			const index = breakCount;
			breakIndex[globalIndex] = index;
			type = index % 2 === 0 ? "break_start" : "break_end";
			breakCount++;
		}

		return {
			...record,
			type,
		};
	});
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
 * 日付を "YYYY-MM-DD" 形式に変換（日本時間基準）
 *
 * @param date 日付（UTC）
 * @returns "YYYY-MM-DD" 形式の文字列（日本時間での日付）
 */
export function formatDateToISO(date: Date): string {
	// UTC時刻を日本時間に変換
	const jst = toJST(date);
	const year = jst.getUTCFullYear();
	const month = (jst.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = jst.getUTCDate().toString().padStart(2, "0");
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

/**
 * 月次統計を計算
 * 休憩時間は勤務時間から除外される
 *
 * @param records その月の全打刻レコード
 * @returns 月次統計（総勤務時間、勤務日数、退勤未打刻の日）
 */
export function calculateMonthlyStats(records: Record[]): {
	totalWorkingHours: string;
	workingDays: number;
	missingClockOuts: string[];
} {
	const grouped = groupRecordsByDay(records);
	let totalMinutes = 0;
	let workingDays = 0;
	const missingClockOuts: string[] = [];

	for (const [dateKey, dayRecords] of grouped) {
		const recordsWithType = addTypeToRecords(dayRecords);

		// work(出退勤)のレコードのみをフィルタ
		const workRecords = recordsWithType.filter(
			(r) => r.type === "clock_in" || r.type === "clock_out",
		);

		// 奇数個（退勤未打刻）の場合
		if (workRecords.length % 2 !== 0) {
			missingClockOuts.push(dateKey);
			continue; // 集計から除外
		}

		// workレコードがない日はスキップ
		if (workRecords.length === 0) {
			continue;
		}

		// ペアごとに勤務時間を計算
		let dayWorkMinutes = 0;
		for (let i = 0; i < workRecords.length; i += 2) {
			const clockIn = workRecords[i];
			const clockOut = workRecords[i + 1];

			if (clockIn && clockOut) {
				const minutes = getMinutesDiff(
					new Date(clockIn.timestamp),
					new Date(clockOut.timestamp),
				);
				dayWorkMinutes += minutes;
			}
		}

		// break(休憩)のレコードのみをフィルタ
		const breakRecords = recordsWithType.filter(
			(r) => r.type === "break_start" || r.type === "break_end",
		);

		// ペアごとに休憩時間を計算
		let dayBreakMinutes = 0;
		for (let i = 0; i < breakRecords.length; i += 2) {
			const breakStart = breakRecords[i];
			const breakEnd = breakRecords[i + 1];

			if (breakStart && breakEnd) {
				const minutes = getMinutesDiff(
					new Date(breakStart.timestamp),
					new Date(breakEnd.timestamp),
				);
				dayBreakMinutes += minutes;
			}
		}

		// 勤務時間から休憩時間を差し引く
		totalMinutes += dayWorkMinutes - dayBreakMinutes;
		workingDays++;
	}

	return {
		totalWorkingHours: formatMinutesToHHMM(totalMinutes),
		workingDays,
		missingClockOuts,
	};
}
