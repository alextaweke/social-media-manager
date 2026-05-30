/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Removed RouteContext type and context parameter entirely
export async function POST(request: NextRequest) {
  // Since this route is statically located at /api/social/connect,
  // we assume it is dedicated to handling the Telegram connection.
  return await handleTelegramConnection(request);
}

async function handleTelegramConnection(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botToken, chatId } = await request.json();

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Bot token and chat ID are required" },
        { status: 400 },
      );
    }

    // Verify the connection
    const { TelegramClient } = await import("@/lib/social/clients/telegram");
    const client = new TelegramClient(botToken, chatId);
    const testResult = await client.testConnection();

    if (!testResult.success) {
      return NextResponse.json({ error: testResult }, { status: 400 });
    }

    // Save to database
    const { error: upsertError } = await supabase
      .from("social_accounts")
      .upsert(
        {
          user_id: user.id,
          platform: "telegram",
          platform_user_id: chatId.toString(),
          platform_username:
            testResult.chat.username ||
            testResult.chat.title ||
            chatId.toString(),
          access_token: botToken,
          metadata: {
            bot_username: testResult.bot.username,
            chat_type: testResult.chat.type,
            chat_title: testResult.chat.title,
            chat_username: testResult.chat.username,
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,platform",
        },
      );

    if (upsertError) {
      console.error("Database error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save connection" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Telegram bot connected successfully",
      chat: testResult.chat,
    });
  } catch (error: any) {
    console.error("Telegram connection error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to connect Telegram",
      },
      { status: 500 },
    );
  }
}
