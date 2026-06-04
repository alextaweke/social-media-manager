/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/analytics-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { platform, forceRefresh } = await request.json();

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

    const results = [];

    for (const account of accounts || []) {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const until = new Date();

        const analyticsData = [];

        switch (account.platform) {
          case "facebook":
            const fbInsights = await AnalyticsService.fetchFacebookInsights(
              account.access_token,
              account.platform_user_id,
              since,
              until,
            );

            for (const insight of fbInsights) {
              analyticsData.push({
                user_id: user.id,
                platform: "facebook",
                date:
                  insight.period?.start ||
                  new Date().toISOString().split("T")[0],
                impressions: insight.values?.[0]?.value || 0,
                reach:
                  insight.name === "page_impressions"
                    ? insight.values?.[0]?.value
                    : 0,
                likes:
                  insight.name === "page_actions_post_reactions_like_total"
                    ? insight.values?.[0]?.value
                    : 0,
              });
            }
            break;

          case "twitter":
            const twitterStats = await AnalyticsService.fetchTwitterInsights(
              account.access_token,
              account.platform_username,
            );
            if (twitterStats) {
              analyticsData.push({
                user_id: user.id,
                platform: "twitter",
                date: new Date().toISOString().split("T")[0],
                impressions: twitterStats.tweet_count || 0,
                reach: 0,
                likes: twitterStats.like_count || 0,
              });
            }
            break;

          case "telegram":
            const telegramStats = await AnalyticsService.fetchTelegramStats(
              account.access_token,
              account.platform_user_id,
            );
            if (telegramStats) {
              // Store member count as followers
              await supabase.from("account_stats").upsert({
                user_id: user.id,
                platform: "telegram",
                date: new Date().toISOString().split("T")[0],
                followers: telegramStats.members,
              });
            }
            break;
        }

        // Save analytics data
        for (const data of analyticsData) {
          await supabase
            .from("analytics_data")
            .upsert(data, { onConflict: "platform,post_id,date" });
        }

        results.push({
          platform: account.platform,
          success: true,
          dataCount: analyticsData.length,
        });
      } catch (error: any) {
        console.error(`Error syncing ${account.platform}:`, error);
        results.push({
          platform: account.platform,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: "Analytics sync completed",
    });
  } catch (error: any) {
    console.error("Analytics sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
