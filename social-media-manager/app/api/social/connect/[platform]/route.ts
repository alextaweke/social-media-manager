/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { platform } = await context.params;

  if (platform !== "telegram") {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  return await handleTelegramConnection(request);
}

async function handleTelegramConnection(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { botToken, chatId } = await request.json();

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Bot token and chat ID are required" },
      { status: 400 },
    );
  }

  try {
    const botInfoRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
    );
    const botInfo = await botInfoRes.json();
    if (!botInfo.ok) throw new Error("Invalid bot token");

    const chatRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId }),
      },
    );
    const chatInfo = await chatRes.json();
    if (!chatInfo.ok)
      throw new Error("Invalid chat ID or bot cannot access this chat");

    const { error } = await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: "telegram",
        platform_user_id: chatId.toString(),
        platform_username: chatInfo.result.username || chatInfo.result.title,
        access_token: botToken,
        metadata: {
          bot_username: botInfo.result.username,
          chat_type: chatInfo.result.type,
          chat_title: chatInfo.result.title,
        },
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Telegram connection error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
