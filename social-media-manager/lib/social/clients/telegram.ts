/* eslint-disable @typescript-eslint/no-explicit-any */
/* lib/social/clients/telegram.ts */

export class TelegramClient {
  private botToken: string;
  private chatId: string;

  constructor(botToken: string, chatId: string) {
    if (!botToken || !chatId) {
      throw new Error("Bot token and chat ID are required");
    }

    this.botToken = botToken.trim();
    this.chatId = chatId.toString();
  }

  private async telegramRequest(method: string, data: any) {
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );

    const text = await response.text();

    let result;
    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Telegram returned invalid JSON: ${text}`);
    }

    if (!response.ok || !result?.ok) {
      throw new Error(result?.description || `Telegram ${method} failed`);
    }

    return result.result;
  }

  async sendMessage(text: string, parseMode: "HTML" | "Markdown" = "HTML") {
    const maxLength = 4096;

    const messageText =
      text.length > maxLength
        ? text.substring(0, maxLength - 100) + "..."
        : text;

    const result = await this.telegramRequest("sendMessage", {
      chat_id: this.chatId,
      text: messageText,
      parse_mode: parseMode,
      disable_web_page_preview: false,
      disable_notification: false,
    });

    return {
      id: result.message_id.toString(),
      url: null,
      success: true,
    };
  }

  async sendPhoto(imageUrl: string, caption?: string) {
    const result = await this.telegramRequest("sendPhoto", {
      chat_id: this.chatId,
      photo: imageUrl,
      caption,
      parse_mode: "HTML",
    });

    return {
      id: result.message_id.toString(),
      url: null,
      success: true,
    };
  }

  async testConnection() {
    const bot = await this.telegramRequest("getMe", {});
    const chat = await this.telegramRequest("getChat", {
      chat_id: this.chatId,
    });

    return {
      success: true,
      bot,
      chat,
    };
  }
}
