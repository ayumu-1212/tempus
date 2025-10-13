"use client";

import { useState } from "react";
import type { ClockType } from "@/types";

interface ClockButtonProps {
	currentStatus: "clocked_in" | "clocked_out";
	onClockSuccess: () => void;
}

export function ClockButton({ currentStatus, onClockSuccess }: ClockButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleClock = async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/clock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					source: "web",
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

	const buttonText = currentStatus === "clocked_out" ? "出勤する" : "退勤する";
	const buttonColor = currentStatus === "clocked_out"
		? "bg-blue-600 hover:bg-blue-700"
		: "bg-green-600 hover:bg-green-700";

	return (
		<button
			type="button"
			onClick={handleClock}
			disabled={isLoading}
			className={`${buttonColor} text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
		>
			{isLoading ? "処理中..." : buttonText}
		</button>
	);
}
