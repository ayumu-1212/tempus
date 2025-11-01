"use client";

import { useEffect, useState, useRef } from "react";
import { ClockButton } from "@/components/ClockButton";
import { StatusDisplay } from "@/components/StatusDisplay";
import { RecordsList, type RecordsListRef } from "@/components/RecordsList";

export default function Home() {
	const [status, setStatus] = useState<"clocked_in" | "clocked_out">("clocked_out");
	const [breakStatus, setBreakStatus] = useState<"on_break" | "not_on_break">("not_on_break");
	const [isLoading, setIsLoading] = useState(true);
	const recordsListRef = useRef<RecordsListRef>(null);

	const fetchStatus = async () => {
		try {
			const response = await fetch("/api/status");
			if (!response.ok) {
				throw new Error("Failed to fetch status");
			}
			const data = await response.json();
			setStatus(data.status);
			setBreakStatus(data.breakStatus);
		} catch (error) {
			console.error("Failed to fetch status:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	const handleClockSuccess = () => {
		// 打刻成功後にステータスと履歴リストを再取得
		fetchStatus();
		recordsListRef.current?.refresh();
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg">読み込み中...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-gray-50">
			<header className="border-b border-gray-200 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold text-gray-900">Tempus</h1>
						<StatusDisplay status={status} breakStatus={breakStatus} />
					</div>
				</div>
			</header>

			<main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
				<div className="space-y-8">
					{/* 打刻ボタンエリア */}
					<div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
						<ClockButton
							currentStatus={status}
							breakStatus={breakStatus}
							onClockSuccess={handleClockSuccess}
						/>
					</div>

					{/* 履歴表示エリア */}
					<RecordsList ref={recordsListRef} />
				</div>
			</main>
		</div>
	);
}
