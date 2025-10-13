"use client";

import { useEffect, useState } from "react";
import { ClockButton } from "@/components/ClockButton";
import { StatusDisplay } from "@/components/StatusDisplay";

export default function Home() {
	const [status, setStatus] = useState<"clocked_in" | "clocked_out">("clocked_out");
	const [isLoading, setIsLoading] = useState(true);

	const fetchStatus = async () => {
		try {
			const response = await fetch("/api/status");
			if (!response.ok) {
				throw new Error("Failed to fetch status");
			}
			const data = await response.json();
			setStatus(data.status);
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
		// 打刻成功後にステータスを再取得
		fetchStatus();
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg">読み込み中...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<header className="border-b border-gray-200 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold text-gray-900">Tempus</h1>
						<StatusDisplay status={status} />
					</div>
				</div>
			</header>

			<main className="flex-1 flex items-center justify-center p-8">
				<div className="text-center">
					<ClockButton
						currentStatus={status}
						onClockSuccess={handleClockSuccess}
					/>
				</div>
			</main>
		</div>
	);
}
