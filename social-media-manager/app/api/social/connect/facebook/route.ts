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
      console.error("Auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("Received body:", {
        ...body,
        accessToken: body.accessToken ? "***hidden***" : undefined,
      });
    } catch (parseError) {
      console.error("Failed to parse body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { pageId, pageName, accessToken } = body;

    if (!pageId || !accessToken) {
      console.error("Missing fields:", {
        hasPageId: !!pageId,
        hasAccessToken: !!accessToken,
      });
      return NextResponse.json(
        {
          error: "Page ID and access token are required",
        },
        { status: 400 },
      );
    }

    // First, verify the token works by getting page info with only basic fields
    try {
      // Use only fields that are guaranteed to exist
      const verifyResponse = await fetch(
        `https://graph.facebook.com/v25.0/${pageId}?fields=id,name&access_token=${accessToken}`,
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        console.error("Token verification failed:", verifyData);
        throw new Error(
          verifyData.error?.message || "Invalid access token or page ID",
        );
      }

      console.log("Token verified successfully for page:", verifyData.name);

      // Save to database (without problematic metadata)
      const accountData = {
        user_id: user.id,
        platform: "facebook",
        platform_user_id: pageId,
        platform_username: verifyData.username || pageName || verifyData.name,
        access_token: accessToken,
        refresh_token: null,
        expires_at: new Date(
          Date.now() + 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
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
        page: {
          id: verifyData.id,
          name: verifyData.name,
          username: verifyData.username,
        },
      });
    } catch (apiError: any) {
      console.error("Facebook API error:", apiError);
      return NextResponse.json(
        {
          error: apiError.message || "Failed to verify Facebook page",
        },
        { status: 400 },
      );
    }
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
