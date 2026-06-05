/* eslint-disable @typescript-eslint/no-explicit-any */

export class TelegramClient {
  private botToken: string;
  private chatId: string;
  private platform_user_id: string;
  private access_token: string;
  constructor(
    botToken: string,
    chatId: string,
    platform_user_id: string,
    access_token: string,
  ) {
    if (!botToken || !chatId || !platform_user_id || !access_token) {
      throw new Error(
        "Bot token, chat ID, platform user ID, and access token are required",
      );
    }

    this.botToken = botToken.trim();
    this.chatId = chatId.toString();
    this.platform_user_id = platform_user_id.toString();
    this.access_token = access_token.trim();
  }

  private async telegramRequest(method: string, data: any) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/telegram/proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        botToken: this.botToken,
        method,
        data,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Telegram ${method} failed`);
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
    try {
      const bot = await this.telegramRequest("getMe", {});

      const chat = await this.telegramRequest("getChat", {
        chat_id: this.chatId,
      });

      return {
        success: true,
        bot,
        chat,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
