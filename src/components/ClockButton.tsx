"use client";

import { useState } from "react";
import type { ClockType } from "@/types";

interface ClockButtonProps {
	currentStatus: "clocked_in" | "clocked_out";
	breakStatus: "on_break" | "not_on_break";
	onClockSuccess: () => void;
}

export function ClockButton({ currentStatus, breakStatus, onClockSuccess }: ClockButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleClock = async (recordType: "work" | "break" = "work") => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/clock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					source: "web",
					recordType,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to clock");
			}

			const data = await response.json();
			console.log("Clock response:", data);

			// 成功時のコールバック
			onClockSuccess();
		} catch (error) {
			console.error("Clock error:", error);
			alert("打刻に失敗しました");
		} finally {
			setIsLoading(false);
		}
	};

	const isWorking = currentStatus === "clocked_in";
	const isOnBreak = breakStatus === "on_break";

	const workButtonText = currentStatus === "clocked_out" ? "出勤する" : "退勤する";
	const workButtonColor = currentStatus === "clocked_out"
		? "bg-blue-600 hover:bg-blue-700"
		: "bg-green-600 hover:bg-green-700";

	const breakButtonText = isOnBreak ? "休憩終了" : "休憩開始";
	const breakButtonColor = isOnBreak
		? "bg-blue-500 hover:bg-blue-600"
		: "bg-orange-500 hover:bg-orange-600";

	return (
		<div className="flex flex-col gap-4 items-center">
			{/* 出退勤ボタン */}
			<button
				type="button"
				onClick={() => handleClock("work")}
				disabled={isLoading}
				className={`${workButtonColor} text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
			>
				{isLoading ? "処理中..." : workButtonText}
			</button>

			{/* 休憩ボタン（出勤中のみ表示） */}
			{isWorking && (
				<button
					type="button"
					onClick={() => handleClock("break")}
					disabled={isLoading}
					className={`${breakButtonColor} text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
				>
					{isLoading ? "処理中..." : breakButtonText}
				</button>
			)}
		</div>
	);
}
