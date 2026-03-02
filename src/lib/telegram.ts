interface TelegramMessage {
  name: string;
  email: string;
  telegram: string;
  message: string;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export async function sendToTelegram(data: TelegramMessage): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram credentials not configured");
    return false;
  }

  const text = [
    "🌙 *Новая заявка с сайта Лунный Свет*",
    "",
    `👤 *Имя:* ${escapeMarkdown(data.name)}`,
    `📧 *Email:* ${escapeMarkdown(data.email)}`,
    data.telegram ? `✈️ *Telegram:* ${escapeMarkdown(data.telegram)}` : "",
    "",
    `💬 *Сообщение:*`,
    escapeMarkdown(data.message),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2",
        }),
      }
    );

    return res.ok;
  } catch (error) {
    console.error("Telegram API error:", error);
    return false;
  }
}
