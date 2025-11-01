"use client";

interface StatusDisplayProps {
	status: "clocked_in" | "clocked_out";
	breakStatus: "on_break" | "not_on_break";
}

export function StatusDisplay({ status, breakStatus }: StatusDisplayProps) {
	const isWorking = status === "clocked_in";
	const isOnBreak = breakStatus === "on_break";

	// 休憩中の場合は休憩表示を優先
	const statusText = isOnBreak
		? "休憩中"
		: isWorking
			? "出勤中"
			: "退勤済み";

	const statusColor = isOnBreak
		? "text-orange-600"
		: isWorking
			? "text-blue-600"
			: "text-gray-600";

	const dotColor = isOnBreak
		? "bg-orange-600"
		: isWorking
			? "bg-blue-600"
			: "bg-gray-400";

	return (
		<div className="flex items-center gap-2">
			<div className={`w-3 h-3 rounded-full ${dotColor} animate-pulse`} />
			<span className={`text-lg font-medium ${statusColor}`}>
				{statusText}
			</span>
		</div>
	);
}
