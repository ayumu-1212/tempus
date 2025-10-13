"use client";

import type { RecordWithType } from "@/types";

interface RecordItemProps {
	record: RecordWithType;
	onEdit: (record: RecordWithType) => void;
	onDelete: (record: RecordWithType) => void;
}

export function RecordItem({ record, onEdit, onDelete }: RecordItemProps) {
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
			className={`p-4 border rounded-lg ${
				record.isEdited ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"
			}`}
		>
			<div className="flex items-center justify-between">
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
					<button
						type="button"
						onClick={() => onEdit(record)}
						className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
					>
						編集
					</button>
					<button
						type="button"
						onClick={() => onDelete(record)}
						className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
					>
						削除
					</button>
				</div>
			</div>

			{record.comment && (
				<div className="mt-2 text-sm text-gray-600 italic">
					コメント: {record.comment}
				</div>
			)}
		</div>
	);
}
