/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/analytics-service";

// POST /api/analytics/sync
// Triggers a re-fetch of analytics from all connected platforms and updates the DB
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const platform: string = body.platform || "all";

    // Fetch connected social accounts for this user
    const { data: accounts, error: accountsError } = await supabase
      .from("social_accounts")
      .select("platform, access_token, page_id, username, bot_token, chat_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (accountsError) throw accountsError;

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const until = new Date();

    const syncResults: Record<string, any> = {};

    for (const account of accounts || []) {
      if (platform !== "all" && account.platform !== platform) continue;

      try {
        switch (account.platform) {
          case "facebook":
            if (account.access_token && account.page_id) {
              syncResults.facebook =
                await AnalyticsService.fetchFacebookInsights(
                  account.access_token,
                  account.page_id,
                  since,
                  until,
                );
            }
            break;

          case "instagram":
            if (account.access_token && account.page_id) {
              syncResults.instagram =
                await AnalyticsService.fetchInstagramInsights(
                  account.access_token,
                  account.page_id,
                  since,
                  until,
                );
            }
            break;

          case "twitter":
            if (account.access_token && account.username) {
              syncResults.twitter = await AnalyticsService.fetchTwitterInsights(
                account.access_token,
                account.username,
              );
            }
            break;

          case "linkedin":
            if (account.access_token && account.page_id) {
              syncResults.linkedin =
                await AnalyticsService.fetchLinkedInInsights(
                  account.access_token,
                  account.page_id,
                  since,
                  until,
                );
            }
            break;

          case "telegram":
            if (account.bot_token && account.chat_id) {
              syncResults.telegram = await AnalyticsService.fetchTelegramStats(
                account.bot_token,
                account.chat_id,
              );
            }
            break;
        }
      } catch (platformError) {
        console.error(`Sync error for ${account.platform}:`, platformError);
        syncResults[account.platform] = { error: "Sync failed" };
      }
    }

    // Update last_synced_at timestamp on the user's profile or settings table
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        analytics_last_synced: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      synced_platforms: Object.keys(syncResults),
      results: syncResults,
    });
  } catch (error: any) {
    console.error("Analytics sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
