"use client";

import { useState, useEffect } from "react";
import type { RecordWithType } from "@/types";

interface EditModalProps {
	record: RecordWithType;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function EditModal({ record, isOpen, onClose, onSuccess }: EditModalProps) {
	const [timestamp, setTimestamp] = useState("");
	const [comment, setComment] = useState("");
	const [recordType, setRecordType] = useState<"work" | "break">("work");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (isOpen && record) {
			// ISO 8601形式からdatetime-local形式に変換
			const date = new Date(record.timestamp);
			const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
				.toISOString()
				.slice(0, 16);
			setTimestamp(localDatetime);
			setComment(record.comment || "");
			setRecordType(record.recordType as "work" | "break");
		}
	}, [isOpen, record]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const isNewRecord = record.id === 0;
			const url = isNewRecord ? "/api/clock" : `/api/records/${record.id}`;
			const method = isNewRecord ? "POST" : "PUT";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					timestamp: new Date(timestamp).toISOString(),
					comment: comment || null,
					source: "web",
					recordType,
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to ${isNewRecord ? "create" : "update"} record`);
			}

			onSuccess();
			onClose();
		} catch (error) {
			console.error("Submit error:", error);
			alert(`${record.id === 0 ? "追加" : "更新"}に失敗しました`);
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<h2 className="text-xl font-bold mb-4">
					{record.id === 0 ? "打刻を追加" : "打刻を編集"}
				</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-1">
							日時
						</label>
						<input
							type="datetime-local"
							id="timestamp"
							value={timestamp}
							onChange={(e) => setTimestamp(e.target.value)}
							required
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<div>
						<label htmlFor="recordType" className="block text-sm font-medium text-gray-700 mb-1">
							種類
						</label>
						<select
							id="recordType"
							value={recordType}
							onChange={(e) => setRecordType(e.target.value as "work" | "break")}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="work">勤務（出勤/退勤）</option>
							<option value="break">休憩（休憩開始/終了）</option>
						</select>
					</div>

					<div>
						<label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
							コメント
						</label>
						<textarea
							id="comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							rows={3}
							placeholder="編集理由など（任意）"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isLoading}
							className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
						>
							キャンセル
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
						>
							{isLoading ? "保存中..." : "保存"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
