/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("=== Telegram Connect API Called ===");

    // Get user session
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User auth error:", userError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }

    console.log("User authenticated:", user.email);

    // Parse request body
    let botToken, chatId;
    try {
      const body = await request.json();
      botToken = body.botToken;
      chatId = body.chatId;
      console.log("Received data:", { hasToken: !!botToken, chatId });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Validate inputs
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 },
      );
    }

    // Get token from body or environment
    let finalToken = botToken;
    if (!finalToken) {
      finalToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!finalToken) {
        return NextResponse.json(
          {
            error:
              "Bot token is required. Please provide a token or set TELEGRAM_BOT_TOKEN in .env.local",
          },
          { status: 400 },
        );
      }
      console.log("Using token from environment variables");
    }

    // Save to database (without metadata column)
    const accountData = {
      user_id: user.id,
      platform: "telegram",
      platform_user_id: chatId.toString(),
      platform_username: `telegram_${chatId}`,
      access_token: finalToken,
      refresh_token: null,
      expires_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    console.log("Attempting to save account data...");

    // Check if account already exists
    const { data: existingAccount, error: findError } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "telegram")
      .single();

    if (findError && findError.code !== "PGRST116") {
      console.error("Error checking existing account:", findError);
    }

    let result;
    if (existingAccount) {
      // Update existing
      result = await supabase
        .from("social_accounts")
        .update(accountData)
        .eq("id", existingAccount.id);
    } else {
      // Insert new
      result = await supabase.from("social_accounts").insert([accountData]); // Note: array syntax
    }

    if (result.error) {
      console.error("Database error:", result.error);
      return NextResponse.json(
        {
          error: `Database error: ${result.error.message}`,
        },
        { status: 500 },
      );
    }

    console.log("Telegram account connected successfully!");

    return NextResponse.json({
      success: true,
      message: "Telegram account connected successfully",
      source: botToken ? "user_input" : "environment",
    });
  } catch (error: any) {
    console.error("Unexpected error in Telegram connection:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
