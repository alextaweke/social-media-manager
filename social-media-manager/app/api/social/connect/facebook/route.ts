/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId, pageName, accessToken } = await request.json();

    if (!pageId || !accessToken) {
      return NextResponse.json(
        {
          error: "Page ID and access token are required",
        },
        { status: 400 },
      );
    }

    // Verify the token and get page info
    const { FacebookClient } = await import("@/lib/social/clients/facebook");
    const client = new FacebookClient(accessToken, pageId);
    const pageInfo = await client.getPageInfo();

    // Save to database
    const accountData = {
      user_id: user.id,
      platform: "facebook",
      platform_user_id: pageId,
      platform_username: pageInfo.username || pageName || pageInfo.name,
      access_token: accessToken,
      refresh_token: null,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        page_name: pageInfo.name,
        page_followers: pageInfo.followers,
        page_url: pageInfo.url,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .single();

    let result;
    if (existingAccount) {
      result = await supabase
        .from("social_accounts")
        .update(accountData)
        .eq("id", existingAccount.id);
    } else {
      result = await supabase.from("social_accounts").insert([accountData]);
    }

    if (result.error) {
      console.error("Database error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Facebook page connected successfully",
      page: pageInfo,
    });
  } catch (error: any) {
    console.error("Facebook connection error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to connect Facebook page",
      },
      { status: 500 },
    );
  }
}
