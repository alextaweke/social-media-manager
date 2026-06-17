/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { error: "Bot not configured" },
        { status: 500 },
      );
    }

    // 1. Get updates from Telegram
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates`,
    );

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Telegram updates" },
        { status: 500 },
      );
    }

    // 2. Find channel/group where bot is added
    const chat = data.result
      ?.map((u: any) => u.my_chat_member?.chat)
      .find(Boolean);

    if (!chat) {
      return NextResponse.json(
        {
          error: "No Telegram channel found. Add bot as admin first.",
        },
        { status: 400 },
      );
    }

    // 3. Save into YOUR existing table
    const { error } = await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: "telegram",
        platform_user_id: chat.id.toString(),
        platform_username: chat.title,
        access_token: botToken, // optional (keep for your schema requirement)
        is_active: true,
        metadata: {
          type: chat.type,
          title: chat.title,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,platform",
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chat: chat.title,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
