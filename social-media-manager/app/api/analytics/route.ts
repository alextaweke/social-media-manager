/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";
    const platform = searchParams.get("platform");

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get posts for this user in the period
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, published_at, platform_specific")
      .eq("user_id", user.id)
      .eq("status", "published")
      .gte("published_at", startDate.toISOString()); // FIX: use published_at consistently

    const postIds = posts?.map((p) => p.id) || [];

    // FIX: if no posts, return empty structure early
    if (postIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: buildEmptyResponse(days),
        },
        {
          headers: { "Cache-Control": "private, max-age=60" }, // ADDED: cache header
        },
      );
    }

    // Get engagement data from published_posts
    // FIX: also select engagement_saves which was missing
    let engagementQuery = supabase
      .from("published_posts")
      .select(
        "platform, reach, impressions, engagement_likes, engagement_comments, engagement_shares, engagement_saves, published_at",
      )
      .in("post_id", postIds)
      .gte("published_at", startDate.toISOString());

    // FIX: platform filter is now consistent — applied at the same query level as posts
    if (platform && platform !== "all") {
      engagementQuery = engagementQuery.eq("platform", platform);
    }

    const { data: engagement } = await engagementQuery;

    // Aggregate totals
    const totalReach =
      engagement?.reduce((sum, e) => sum + (e.reach || 0), 0) ?? 0;
    const totalLikes =
      engagement?.reduce((sum, e) => sum + (e.engagement_likes || 0), 0) ?? 0;
    const totalComments =
      engagement?.reduce((sum, e) => sum + (e.engagement_comments || 0), 0) ??
      0;
    const totalShares =
      engagement?.reduce((sum, e) => sum + (e.engagement_shares || 0), 0) ?? 0;
    // FIX: total_saves now actually computed from DB instead of hardcoded 0
    const totalSaves =
      engagement?.reduce((sum, e) => sum + (e.engagement_saves || 0), 0) ?? 0;
    const totalImpressions =
      engagement?.reduce(
        (sum, e) => sum + (e.impressions || e.reach || 0),
        0,
      ) ?? 0;
    const totalEngagement = totalLikes + totalComments + totalShares;

    // Platform breakdown
    const platformBreakdown: Record<string, any> = {};
    for (const e of engagement || []) {
      if (!platformBreakdown[e.platform]) {
        platformBreakdown[e.platform] = {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0, // ADDED
          engagement: 0,
          posts: 0,
        };
      }
      const s = platformBreakdown[e.platform];
      s.posts++;
      s.reach += e.reach || 0;
      s.impressions += e.impressions || e.reach || 0;
      s.likes += e.engagement_likes || 0;
      s.comments += e.engagement_comments || 0;
      s.shares += e.engagement_shares || 0;
      s.saves += e.engagement_saves || 0; // ADDED
      s.engagement +=
        (e.engagement_likes || 0) +
        (e.engagement_comments || 0) +
        (e.engagement_shares || 0);
    }

    // FIX: build daily stats in a single pass, and populate all metrics (was losing likes data)
    const dailyMap: Record<
      string,
      {
        date: string;
        impressions: number;
        reach: number;
        likes: number;
        comments: number;
        shares: number;
        engagement: number;
        posts: number;
      }
    > = {};

    // Pre-populate all days so gaps show as zeros
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyMap[dateStr] = {
        date: dateStr,
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement: 0,
        posts: 0,
      };
    }

    for (const e of engagement || []) {
      const dateStr = e.published_at?.split("T")[0];
      if (dateStr && dailyMap[dateStr]) {
        dailyMap[dateStr].impressions += e.impressions || e.reach || 0;
        dailyMap[dateStr].reach += e.reach || 0;
        dailyMap[dateStr].likes += e.engagement_likes || 0; // FIX: was 0
        dailyMap[dateStr].comments += e.engagement_comments || 0;
        dailyMap[dateStr].shares += e.engagement_shares || 0;
        dailyMap[dateStr].engagement +=
          (e.engagement_likes || 0) +
          (e.engagement_comments || 0) +
          (e.engagement_shares || 0);
      }
    }

    for (const p of posts || []) {
      const dateStr = p.published_at?.split("T")[0];
      if (dateStr && dailyMap[dateStr]) {
        dailyMap[dateStr].posts++;
      }
    }

    // Sort ascending by date
    const dailyStats = Object.values(dailyMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          total_impressions: totalImpressions,
          total_reach: totalReach,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_shares: totalShares,
          total_saves: totalSaves, // FIX: real value
          total_clicks: 0, // Not tracked at DB level yet — honest zero
          total_engagement: totalEngagement,
          total_posts: posts?.length || 0,
          engagement_rate:
            totalReach > 0
              ? ((totalEngagement / totalReach) * 100).toFixed(2)
              : "0.00",
          by_platform: platformBreakdown,
          daily: dailyStats, // FIX: single unified array, all fields populated
        },
      },
      {
        headers: { "Cache-Control": "private, max-age=60" }, // ADDED
      },
    );
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildEmptyResponse(days: number) {
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    daily.push({
      date: date.toISOString().split("T")[0],
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagement: 0,
      posts: 0,
    });
  }
  return {
    total_impressions: 0,
    total_reach: 0,
    total_likes: 0,
    total_comments: 0,
    total_shares: 0,
    total_saves: 0,
    total_clicks: 0,
    total_engagement: 0,
    total_posts: 0,
    engagement_rate: "0.00",
    by_platform: {},
    daily,
  };
}
