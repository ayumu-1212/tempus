import type { RecordWithType } from "@/types";

/**
 * Slackに打刻通知を送信する
 * @param record 打刻レコード（type付き）
 */
export async function sendSlackNotification(
	record: RecordWithType,
): Promise<void> {
	const webhookUrl = process.env.SLACK_WEBHOOK_URL;

	// Webhook URLが設定されていない場合は何もしない
	if (!webhookUrl) {
		console.log("Slack webhook URL not configured, skipping notification");
		return;
	}

	try {
		// 打刻種類に応じたメッセージとカラー
		let emoji: string;
		let action: string;
		let color: string;

		switch (record.type) {
			case "clock_in":
				emoji = ":large_green_circle:";
				action = "出勤しました";
				color = "#36a64f"; // 緑
				break;
			case "clock_out":
				emoji = ":red_circle:";
				action = "退勤しました";
				color = "#ff0000"; // 赤
				break;
			case "break_start":
				emoji = ":coffee:";
				action = "休憩を開始しました";
				color = "#FFA500"; // オレンジ
				break;
			case "break_end":
				emoji = ":muscle:";
				action = "休憩を終了しました";
				color = "#0000FF"; // 青
				break;
		}

		// 日時のフォーマット
		const timestamp = new Date(record.timestamp);
		const formattedTime = timestamp.toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			timeZone: "Asia/Tokyo",
		});

		// Slackメッセージの作成
		const message = {
			text: `${emoji} ちゃなべが${action}`,
			attachments: [
				{
					color,
					fields: [
						{
							title: "打刻時刻",
							value: formattedTime,
							short: true,
						},
						{
							title: "打刻元",
							value: record.source === "web" ? "Web" : "Discord",
							short: true,
						},
					],
					footer: "Tempus",
					ts: Math.floor(timestamp.getTime() / 1000),
				},
			],
		};

		// コメントがあれば追加
		if (record.comment) {
			message.attachments[0].fields.push({
				title: "コメント",
				value: record.comment,
				short: false,
			});
		}

		// Webhookにメッセージを送信
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(message),
		});

		if (!response.ok) {
			throw new Error(`Slack API error: ${response.status}`);
		}

		console.log("Slack notification sent successfully");
	} catch (error) {
		// 通知エラーはログに記録するだけで、本体の処理は失敗させない
		console.error("Failed to send Slack notification:", error);
	}
}
