/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { TelegramClient } from "@/lib/social/clients/telegram";

export async function POST(request: Request) {
  try {
    const { botToken, chatId, message } = await request.json();

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Bot token and chat ID are required" },
        { status: 400 },
      );
    }

    const client = new TelegramClient(botToken, chatId);

    // Test connection first
    const testResult = await client.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        { error: "Connection test failed" },
        { status: 400 },
      );
    }

    // Send test message
    const result = await client.sendMessage(
      message || "Test message from SocialHub! 🎉",
    );

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully!",
      result,
      bot: testResult.bot,
      chat: testResult.chat,
    });
  } catch (error: any) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to send test message",
      },
      { status: 500 },
    );
  }
}
