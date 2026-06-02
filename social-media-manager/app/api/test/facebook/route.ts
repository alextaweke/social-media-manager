/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Facebook account from database
    const { data: fbAccount, error: fbError } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .single();

    if (fbError || !fbAccount) {
      return NextResponse.json(
        { error: "No Facebook account found" },
        { status: 404 },
      );
    }

    const results: any = {};

    // Test 1: Get page info via proxy
    try {
      const proxyRes = await fetch("http://localhost:3000/api/facebook/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: fbAccount.platform_user_id,
          method: "GET",
          data: { fields: "id,name,username" },
          accessToken: fbAccount.access_token,
        }),
      });
      results.pageInfo = await proxyRes.json();
    } catch (e: any) {
      results.pageInfo = { error: e.message };
    }

    // Test 2: Try to post via proxy
    try {
      const postRes = await fetch("http://localhost:3000/api/facebook/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `${fbAccount.platform_user_id}/feed`,
          method: "POST",
          data: {
            message: `Test post from SocialHub - ${new Date().toISOString()}`,
          },
          accessToken: fbAccount.access_token,
        }),
      });
      results.testPost = await postRes.json();
    } catch (e: any) {
      results.testPost = { error: e.message };
    }

    return NextResponse.json({
      success: true,
      account: {
        pageId: fbAccount.platform_user_id,
        username: fbAccount.platform_username,
      },
      testResults: results,
    });
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
