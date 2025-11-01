"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { RecordItem } from "./RecordItem";
import { AlertBanner } from "./AlertBanner";
import { EditModal } from "./EditModal";
import type { RecordsResponse, RecordWithType } from "@/types";

export interface RecordsListRef {
	refresh: () => void;
}

export const RecordsList = forwardRef<RecordsListRef>((props, ref) => {
	const [data, setData] = useState<RecordsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [editingRecord, setEditingRecord] = useState<RecordWithType | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const fetchRecords = async (y: number, m: number) => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/records?year=${y}&month=${m}`);
			if (!response.ok) {
				throw new Error("Failed to fetch records");
			}
			const json = await response.json();
			setData(json);
		} catch (error) {
			console.error("Failed to fetch records:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchRecords(year, month);
	}, [year, month]);

	// 親コンポーネントから呼び出せるrefメソッド
	useImperativeHandle(ref, () => ({
		refresh: () => {
			fetchRecords(year, month);
		},
	}));

	const handlePrevMonth = () => {
		if (month === 1) {
			setYear(year - 1);
			setMonth(12);
		} else {
			setMonth(month - 1);
		}
	};

	const handleNextMonth = () => {
		if (month === 12) {
			setYear(year + 1);
			setMonth(1);
		} else {
			setMonth(month + 1);
		}
	};

	const handleEdit = (record: RecordWithType) => {
		setEditingRecord(record);
		setIsEditModalOpen(true);
	};

	const handleDelete = async (record: RecordWithType) => {
		if (!confirm("この打刻を削除しますか？")) {
			return;
		}

		try {
			const response = await fetch(`/api/records/${record.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete record");
			}

			// 削除成功後、リストを再取得
			fetchRecords(year, month);
		} catch (error) {
			console.error("Delete error:", error);
			alert("削除に失敗しました");
		}
	};

	const handleEditSuccess = () => {
		// 編集成功後、リストを再取得
		fetchRecords(year, month);
	};

	const handleAddRecord = () => {
		// 新規打刻用のダミーレコードを作成
		const now = new Date();
		const dummyRecord: RecordWithType = {
			id: 0, // ダミーID
			timestamp: now,
			source: "web",
			recordType: "work",
			isEdited: false,
			comment: null,
			createdAt: now,
			updatedAt: now,
			type: "clock_in",
		};
		setEditingRecord(dummyRecord);
		setIsEditModalOpen(true);
	};

	if (isLoading) {
		return (
			<div className="text-center py-8">
				<div className="text-gray-500">読み込み中...</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="text-center py-8">
				<div className="text-gray-500">データの取得に失敗しました</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* 月切り替えUI */}
			<div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
				<button
					type="button"
					onClick={handlePrevMonth}
					className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				>
					← 前月
				</button>
				<h2 className="text-xl font-bold text-gray-900">
					{year}年 {month}月
				</h2>
				<button
					type="button"
					onClick={handleNextMonth}
					className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				>
					次月 →
				</button>
			</div>

			{/* 月次集計 */}
			<div className="bg-white p-6 rounded-lg border border-gray-200">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">月次集計</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<div className="text-sm text-gray-500">総勤務時間</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.stats.totalWorkingHours}
						</div>
					</div>
					<div>
						<div className="text-sm text-gray-500">勤務日数</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.stats.workingDays}日
						</div>
					</div>
				</div>
			</div>

			{/* 退勤未打刻アラート */}
			<AlertBanner missingClockOuts={data.stats.missingClockOuts} />

			{/* 履歴一覧 */}
			<div className="space-y-2">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">打刻履歴</h3>
					<button
						type="button"
						onClick={handleAddRecord}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						+ 打刻を追加
					</button>
				</div>
				{data.records.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						この月の打刻記録はありません
					</div>
				) : (
					<div className="space-y-4">
						{(() => {
							// 日付ごとにグループ化（6:00-6:00基準）
							const groupedByDate = new Map<string, RecordWithType[]>();

							for (const record of data.records) {
								const date = new Date(record.timestamp);
								// 6時より前なら前日扱い
								if (date.getHours() < 6) {
									date.setDate(date.getDate() - 1);
								}
								const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

								if (!groupedByDate.has(dateKey)) {
									groupedByDate.set(dateKey, []);
								}
								groupedByDate.get(dateKey)?.push(record);
							}

							// 日付を降順でソート
							const sortedDates = Array.from(groupedByDate.keys()).sort((a, b) => b.localeCompare(a));

							return sortedDates.map((dateKey) => {
								const records = groupedByDate.get(dateKey) || [];
								// 各日のレコードも降順でソート
								const sortedRecords = records.sort((a, b) =>
									new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
								);

								// 日付をフォーマット
								const [year, month, day] = dateKey.split('-');
								const dateLabel = `${year}年${Number(month)}月${Number(day)}日`;

								return (
									<div key={dateKey} className="space-y-2">
										<div className="text-sm font-semibold text-gray-600 px-2 py-1 bg-gray-50 rounded">
											{dateLabel}
										</div>
										<div className="space-y-2">
											{sortedRecords.map((record) => (
												<RecordItem
													key={record.id}
													record={record}
													onEdit={handleEdit}
													onDelete={handleDelete}
												/>
											))}
										</div>
									</div>
								);
							});
						})()}
					</div>
				)}
			</div>

			{/* 編集モーダル */}
			{editingRecord && (
				<EditModal
					record={editingRecord}
					isOpen={isEditModalOpen}
					onClose={() => setIsEditModalOpen(false)}
					onSuccess={handleEditSuccess}
				/>
			)}
		</div>
	);
});

RecordsList.displayName = "RecordsList";
