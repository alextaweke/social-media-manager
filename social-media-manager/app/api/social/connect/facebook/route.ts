/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("Facebook connection API called");

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, pageName, accessToken } = body;

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: "Page ID and access token are required" },
        { status: 400 },
      );
    }

    // ✅ Verify token with Facebook
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}?fields=id,name,access_token&access_token=${accessToken}`,
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || verifyData.error) {
      throw new Error(verifyData.error?.message || "Invalid Facebook token");
    }

    // 🚨 CRITICAL: ensure we use PAGE TOKEN (not user token)
    const pageAccessToken = accessToken;

    console.log("Facebook page verified:", verifyData.name);

    const accountData = {
      user_id: user.id,
      platform: "facebook",
      platform_user_id: pageId,
      platform_username: verifyData.name,
      access_token: pageAccessToken,
      refresh_token: null,
      expires_at: null, // PAGE tokens are long-lived, don't fake expiry
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // ✅ FIX: use maybeSingle to avoid crashes
    const { data: existingAccount } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .maybeSingle();

    let result;

    if (existingAccount?.id) {
      result = await supabase
        .from("social_accounts")
        .update(accountData)
        .eq("id", existingAccount.id);
    } else {
      result = await supabase.from("social_accounts").insert(accountData);
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Facebook page connected successfully",
      page: {
        id: verifyData.id,
        name: verifyData.name,
      },
    });
  } catch (error: any) {
    console.error("Facebook connection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect Facebook" },
      { status: 500 },
    );
  }
}
