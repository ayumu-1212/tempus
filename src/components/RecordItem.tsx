"use client";

import type { RecordWithType } from "@/types";

interface RecordItemProps {
	record: RecordWithType;
}

export function RecordItem({ record }: RecordItemProps) {
	const timestamp = new Date(record.timestamp);
	const dateStr = timestamp.toLocaleDateString("ja-JP", {
		month: "numeric",
		day: "numeric",
		weekday: "short",
	});
	const timeStr = timestamp.toLocaleTimeString("ja-JP", {
		hour: "2-digit",
		minute: "2-digit",
	});

	const typeText = record.type === "clock_in" ? "出勤" : "退勤";
	const typeColor = record.type === "clock_in" ? "text-blue-600" : "text-green-600";
	const sourceBadge = record.source === "web" ? "Web" : "Discord";

	return (
		<div
			className={`flex items-center justify-between p-4 border rounded-lg ${
				record.isEdited ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"
			}`}
		>
			<div className="flex items-center gap-4">
				<div className="flex flex-col">
					<span className="text-sm text-gray-500">{dateStr}</span>
					<span className="text-lg font-medium">{timeStr}</span>
				</div>
				<div className={`font-semibold ${typeColor}`}>{typeText}</div>
			</div>

			<div className="flex items-center gap-2">
				{record.isEdited && (
					<span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
						編集済み
					</span>
				)}
				<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
					{sourceBadge}
				</span>
			</div>

			{record.comment && (
				<div className="mt-2 text-sm text-gray-600 italic">
					コメント: {record.comment}
				</div>
			)}
		</div>
	);
}
