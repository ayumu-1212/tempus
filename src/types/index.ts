import type { Record } from "@prisma/client";

export type ClockType = "clock_in" | "clock_out" | "break_start" | "break_end";
export type RecordType = "work" | "break";
export type Source = "web" | "discord";

export interface RecordWithType extends Record {
	type: ClockType;
}

export interface MonthlyStats {
	totalWorkingHours: string; // "HH:MM" format
	workingDays: number;
	missingClockOuts: string[]; // ISO date strings (YYYY-MM-DD)
}

export interface RecordsResponse {
	records: RecordWithType[];
	stats: MonthlyStats;
}

export interface ClockResponse {
	success: boolean;
	record: RecordWithType;
	type: ClockType;
}

export interface StatusResponse {
	status: "clocked_in" | "clocked_out";
	breakStatus: "on_break" | "not_on_break";
	lastRecord: RecordWithType | null;
}
