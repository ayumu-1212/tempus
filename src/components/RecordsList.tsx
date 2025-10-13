"use client";

import { useState, useEffect } from "react";
import { RecordItem } from "./RecordItem";
import { AlertBanner } from "./AlertBanner";
import type { RecordsResponse } from "@/types";

export function RecordsList() {
	const [data, setData] = useState<RecordsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1);

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
				<h3 className="text-lg font-semibold text-gray-900 mb-4">打刻履歴</h3>
				{data.records.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						この月の打刻記録はありません
					</div>
				) : (
					<div className="space-y-2">
						{data.records.map((record) => (
							<RecordItem key={record.id} record={record} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
