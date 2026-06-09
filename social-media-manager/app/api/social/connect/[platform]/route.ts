/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const oauthPlatforms = {
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: "instagram_basic,instagram_content_publish,pages_read_engagement",
    clientId: process.env.INSTAGRAM_CLIENT_ID!,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "r_liteprofile w_member_social r_emailaddress",
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
  },
  facebook: {
    authUrl: "https://www.facebook.com/v25.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v25.0/oauth/access_token",
    scope: "pages_manage_posts pages_read_engagement instagram_basic",
    clientId: process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
  },
  telegram: {
    // Telegram doesn't use OAuth, we'll handle it differently
    type: "bot",
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
};

// Define the Next.js 15 context type where params is a Promise
type RouteContext = {
  params: Promise<{ platform: string }>;
};

// For Telegram, we need a different endpoint
export async function POST(
  request: NextRequest,
  context: RouteContext, // Replaced destructured params with context
) {
  // Await the params before extracting properties
  const { platform } = await context.params;

  if (platform === "telegram") {
    return await handleTelegramConnection(request);
  }

  // Handle OAuth platforms
  return await handleOAuthConnection(platform);
}

async function handleTelegramConnection(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { botToken, chatId, botUsername } = await request.json();

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Bot token and chat ID are required" },
      { status: 400 },
    );
  }

  try {
    // Verify the bot token by getting bot info
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
    );
    const botInfo = await botInfoResponse.json();

    if (!botInfo.ok) {
      throw new Error("Invalid bot token");
    }

    // Verify the chat ID
    const chatResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId }),
      },
    );
    const chatInfo = await chatResponse.json();

    if (!chatInfo.ok) {
      throw new Error("Invalid chat ID or bot cannot access this chat");
    }

    // Save to database
    await supabase.from("social_accounts").upsert(
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
        updated_at: new Date(),
      },
      {
        onConflict: "user_id,platform",
      },
    );

    return NextResponse.json({
      success: true,
      message: "Telegram bot connected successfully",
    });
  } catch (error: any) {
    console.error("Telegram connection error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleOAuthConnection(platform: string) {
  // Check if platform is a valid key to prevent runtime errors
  if (!(platform in oauthPlatforms)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const config = oauthPlatforms[platform as keyof typeof oauthPlatforms];
  // ... rest of your OAuth code
}
