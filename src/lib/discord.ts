import type { RecordWithType } from "@/types";

/**
 * Discordに打刻通知を送信する
 * @param record 打刻レコード（type付き）
 * @param displayName ユーザーの表示名
 */
export async function sendDiscordNotification(
  record: RecordWithType,
  displayName: string,
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  // Webhook URLが設定されていない場合は何もしない
  if (!webhookUrl) {
    console.log("Discord webhook URL not configured, skipping notification");
    return;
  }

  try {
    // 打刻種類に応じたメッセージとカラー
    const isClockIn = record.type === "clock_in";
    const title = isClockIn
      ? `🟢 ${displayName}が出勤しました`
      : `🔴 ${displayName}が退勤しました`;
    const color = isClockIn ? 0x00ff00 : 0xff0000; // 緑 or 赤

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

    // Embedメッセージの作成
    const embed = {
      title,
      color,
      fields: [
        {
          name: "打刻時刻",
          value: formattedTime,
          inline: true,
        },
        {
          name: "打刻元",
          value: record.source === "web" ? "Web" : "Discord",
          inline: true,
        },
      ],
      timestamp: timestamp.toISOString(),
      footer: {
        text: "Tempus",
      },
    };

    // コメントがあれば追加
    if (record.comment) {
      embed.fields.push({
        name: "コメント",
        value: record.comment,
        inline: false,
      });
    }

    // Webhookにメッセージを送信
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    console.log("Discord notification sent successfully");
  } catch (error) {
    // 通知エラーはログに記録するだけで、本体の処理は失敗させない
    console.error("Failed to send Discord notification:", error);
  }
}
