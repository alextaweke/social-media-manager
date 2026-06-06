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
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get posts for post count
    const { data: posts } = await supabase
      .from("posts")
      .select("id, published_at")
      .eq("user_id", user.id)
      .eq("status", "published")
      .gte("published_at", startDate.toISOString());

    // Get published posts with engagement data
    let query = supabase
      .from("published_posts")
      .select(
        `
        platform,
        engagement_likes,
        engagement_comments,
        engagement_shares,
        engagement_saves,
        impressions,
        reach,
        clicks,
        video_views,
        published_at,
        date
      `,
      )
      .in("post_id", posts?.map((p) => p.id) || []);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    const { data: publishedData, error } = await query;

    if (error) {
      console.error("Analytics query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no data, return empty response
    if (!publishedData || publishedData.length === 0) {
      return NextResponse.json({
        success: true,
        data: buildEmptyResponse(days),
      });
    }

    // Aggregate totals
    const totalImpressions = publishedData.reduce(
      (sum, item) => sum + (item.impressions || 0),
      0,
    );
    const totalReach = publishedData.reduce(
      (sum, item) => sum + (item.reach || 0),
      0,
    );
    const totalLikes = publishedData.reduce(
      (sum, item) => sum + (item.engagement_likes || 0),
      0,
    );
    const totalComments = publishedData.reduce(
      (sum, item) => sum + (item.engagement_comments || 0),
      0,
    );
    const totalShares = publishedData.reduce(
      (sum, item) => sum + (item.engagement_shares || 0),
      0,
    );
    const totalSaves = publishedData.reduce(
      (sum, item) => sum + (item.engagement_saves || 0),
      0,
    );
    const totalClicks = publishedData.reduce(
      (sum, item) => sum + (item.clicks || 0),
      0,
    );
    const totalVideoViews = publishedData.reduce(
      (sum, item) => sum + (item.video_views || 0),
      0,
    );

    const totalEngagement = totalLikes + totalComments + totalShares;

    // Platform breakdown
    const platformBreakdown: Record<string, any> = {};
    for (const item of publishedData) {
      const plat = item.platform;
      if (!platformBreakdown[plat]) {
        platformBreakdown[plat] = {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          clicks: 0,
          video_views: 0,
          engagement: 0,
        };
      }
      const s = platformBreakdown[plat];
      s.impressions += item.impressions || 0;
      s.reach += item.reach || 0;
      s.likes += item.engagement_likes || 0;
      s.comments += item.engagement_comments || 0;
      s.shares += item.engagement_shares || 0;
      s.saves += item.engagement_saves || 0;
      s.clicks += item.clicks || 0;
      s.video_views += item.video_views || 0;
      s.engagement +=
        (item.engagement_likes || 0) +
        (item.engagement_comments || 0) +
        (item.engagement_shares || 0);
    }

    // Count unique posts per platform
    const uniquePostsPerPlatform: Record<string, Set<string>> = {};
    // Need to get post_id from published_posts, so adjust query
    const { data: postsWithIds } = await supabase
      .from("published_posts")
      .select("platform, post_id")
      .in("post_id", posts?.map((p) => p.id) || []);

    for (const item of postsWithIds || []) {
      if (!uniquePostsPerPlatform[item.platform]) {
        uniquePostsPerPlatform[item.platform] = new Set();
      }
      uniquePostsPerPlatform[item.platform].add(item.post_id);
    }

    for (const [plat, postSet] of Object.entries(uniquePostsPerPlatform)) {
      if (platformBreakdown[plat]) {
        platformBreakdown[plat].posts = postSet.size;
      }
    }

    // Daily stats aggregation
    const dailyMap: Record<string, any> = {};

    // Pre-populate all days
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
        saves: 0,
        clicks: 0,
        engagement: 0,
        posts: 0,
      };
    }

    // Fill daily data
    for (const item of publishedData) {
      const dateStr = item.date || item.published_at?.split("T")[0];
      if (dateStr && dailyMap[dateStr]) {
        dailyMap[dateStr].impressions += item.impressions || 0;
        dailyMap[dateStr].reach += item.reach || 0;
        dailyMap[dateStr].likes += item.engagement_likes || 0;
        dailyMap[dateStr].comments += item.engagement_comments || 0;
        dailyMap[dateStr].shares += item.engagement_shares || 0;
        dailyMap[dateStr].saves += item.engagement_saves || 0;
        dailyMap[dateStr].clicks += item.clicks || 0;
        dailyMap[dateStr].engagement +=
          (item.engagement_likes || 0) +
          (item.engagement_comments || 0) +
          (item.engagement_shares || 0);
      }
    }

    // Count daily posts
    const { data: dailyPosts } = await supabase
      .from("posts")
      .select("published_at")
      .eq("user_id", user.id)
      .eq("status", "published")
      .gte("published_at", startDate.toISOString());

    for (const post of dailyPosts || []) {
      const dateStr = post.published_at?.split("T")[0];
      if (dateStr && dailyMap[dateStr]) {
        dailyMap[dateStr].posts++;
      }
    }

    // Sort daily stats ascending
    const dailyStats = Object.values(dailyMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return NextResponse.json({
      success: true,
      data: {
        total_impressions: totalImpressions,
        total_reach: totalReach,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        total_saves: totalSaves,
        total_clicks: totalClicks,
        total_video_views: totalVideoViews,
        total_engagement: totalEngagement,
        total_posts: posts?.length || 0,
        engagement_rate:
          totalReach > 0
            ? ((totalEngagement / totalReach) * 100).toFixed(2)
            : "0.00",
        by_platform: platformBreakdown,
        daily: dailyStats,
      },
    });
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
      saves: 0,
      clicks: 0,
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
    total_video_views: 0,
    total_engagement: 0,
    total_posts: 0,
    engagement_rate: "0.00",
    by_platform: {},
    daily,
  };
}
