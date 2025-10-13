"use client";

interface StatusDisplayProps {
	status: "clocked_in" | "clocked_out";
}

export function StatusDisplay({ status }: StatusDisplayProps) {
	const isWorking = status === "clocked_in";
	const statusText = isWorking ? "出勤中" : "退勤済み";
	const statusColor = isWorking ? "text-blue-600" : "text-gray-600";
	const dotColor = isWorking ? "bg-blue-600" : "bg-gray-400";

	return (
		<div className="flex items-center gap-2">
			<div className={`w-3 h-3 rounded-full ${dotColor} animate-pulse`} />
			<span className={`text-lg font-medium ${statusColor}`}>
				{statusText}
			</span>
		</div>
	);
}
