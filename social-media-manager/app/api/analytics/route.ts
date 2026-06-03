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

    // Get posts analytics
    let postsQuery = supabase
      .from("posts")
      .select("id, content, created_at, published_at, platform_specific")
      .eq("user_id", user.id)
      .eq("status", "published")
      .gte("created_at", startDate.toISOString());

    if (platform) {
      postsQuery = postsQuery.contains("platform_specific->platforms", [
        platform,
      ]);
    }

    const { data: posts } = await postsQuery;

    // Get engagement data from published_posts
    const { data: engagement } = await supabase
      .from("published_posts")
      .select("*")
      .in("post_id", posts?.map((p) => p.id) || [])
      .gte("published_at", startDate.toISOString());

    // Calculate analytics
    const totalReach =
      engagement?.reduce((sum, e) => sum + (e.reach || 0), 0) || 0;
    const totalEngagement =
      engagement?.reduce(
        (sum, e) =>
          sum +
          (e.engagement_likes || 0) +
          (e.engagement_comments || 0) +
          (e.engagement_shares || 0),
        0,
      ) || 0;
    const totalPosts = posts?.length || 0;

    // Platform breakdown
    const platformBreakdown: Record<string, any> = {};
    for (const post of posts || []) {
      const platforms = post.platform_specific?.platforms || [];
      for (const p of platforms) {
        if (!platformBreakdown[p]) {
          platformBreakdown[p] = { engagement: 0, reach: 0, posts: 0 };
        }
        platformBreakdown[p].posts++;
      }
    }

    for (const e of engagement || []) {
      if (platformBreakdown[e.platform]) {
        platformBreakdown[e.platform].engagement +=
          (e.engagement_likes || 0) +
          (e.engagement_comments || 0) +
          (e.engagement_shares || 0);
        platformBreakdown[e.platform].reach += e.reach || 0;
      }
    }

    // Daily stats
    const dailyStats = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayEngagement =
        engagement?.filter((e) => e.published_at?.split("T")[0] === dateStr) ||
        [];

      dailyStats.push({
        date: dateStr,
        engagement: dayEngagement.reduce(
          (sum, e) =>
            sum +
            (e.engagement_likes || 0) +
            (e.engagement_comments || 0) +
            (e.engagement_shares || 0),
          0,
        ),
        reach: dayEngagement.reduce((sum, e) => sum + (e.reach || 0), 0),
        posts:
          posts?.filter((p) => p.published_at?.split("T")[0] === dateStr)
            .length || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        total_reach: totalReach,
        total_engagement: totalEngagement,
        total_posts: totalPosts,
        engagement_rate:
          totalReach > 0
            ? ((totalEngagement / totalReach) * 100).toFixed(2)
            : 0,
        platform_breakdown: platformBreakdown,
        daily_stats: dailyStats.reverse(),
      },
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
