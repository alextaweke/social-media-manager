/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { platform } = await request.json();

    // Get connected accounts
    let query = supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError) throw accountsError;

    // Get posts from last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: posts } = await supabase
      .from("posts")
      .select("id, platform, published_at, platform_post_id")
      .eq("user_id", user.id)
      .eq("status", "published")
      .gte("published_at", since.toISOString());

    let synced = 0;
    const errors: any[] = [];

    for (const post of posts || []) {
      const account = accounts?.find((a) => a.platform === post.platform);

      if (!account || !post.platform_post_id) {
        continue;
      }

      // Here you would call platform-specific APIs to fetch metrics
      // For now, we'll just update the sync timestamp

      synced++;
    }

    // Update last sync time
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      analytics_last_synced: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      synced,
      errors,
    });
  } catch (error: any) {
    console.error("Analytics sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
