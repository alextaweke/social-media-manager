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

    const { daysBack = 30, platform } = await request.json();

    // Get all published posts with their platform_post_id
    let query = supabase
      .from("posts")
      .select(
        `
        id,
        platform_post_id,
        published_at,
        published_posts!inner (
          id,
          platform,
          platform_post_id,
          last_synced
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "published")
      .gte(
        "published_at",
        new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (platform && platform !== "all") {
      query = query.eq("published_posts.platform", platform);
    }

    const { data: posts, error } = await query;

    if (error) throw error;

    // Get social accounts for tokens
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const accountMap = new Map();
    accounts?.forEach((acc) => accountMap.set(acc.platform, acc));

    const results = {
      total: posts?.length || 0,
      synced: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const post of posts || []) {
      const publishedPost = post.published_posts;
      const pp = Array.isArray(publishedPost)
        ? publishedPost[0]
        : publishedPost;

      if (!pp || !post.platform_post_id) {
        results.failed++;
        continue;
      }

      const account = accountMap.get(pp.platform);
      if (!account) {
        results.failed++;
        results.details.push({
          postId: post.id,
          platform: pp.platform,
          error: "No connected account found",
        });
        continue;
      }

      try {
        let metrics: any = null;

        switch (pp.platform) {
          case "facebook":
            metrics = await AnalyticsService.fetchFacebookPostData(
              account.access_token,
              post.platform_post_id,
            );
            break;
          // case "instagram":
          //   metrics = await AnalyticsService.fetchInstagramPostData(
          //     account.access_token,
          //     post.platform_post_id,
          //   );
          //   break;
          // case "twitter":
          //   metrics = await AnalyticsService.fetchTwitterPostData(
          //     account.access_token,
          //     post.platform_post_id,
          //   );
          //   break;
          // case "linkedin":
          //   metrics = await AnalyticsService.fetchLinkedInPostData(
          //     account.access_token,
          //     post.platform_post_id,
          //   );
          //   break;
          // case "telegram":
          //   metrics = await AnalyticsService.fetchTelegramPostData(
          //     account.access_token,
          //     account.platform_user_id,
          //     post.platform_post_id,
          //   );
          //   break;
        }

        if (metrics) {
          // Update published_posts with fresh metrics
          await supabase
            .from("published_posts")
            .update({
              engagement_likes: metrics.likes,
              engagement_comments: metrics.comments,
              engagement_shares: metrics.shares,
              engagement_saves: metrics.saves,
              impressions: metrics.impressions,
              reach: metrics.reach,
              clicks: metrics.clicks,
              video_views: metrics.video_views,
              video_avg_watch_time: metrics.video_avg_watch_time,
              profile_views: metrics.profile_views,
              follower_gain: metrics.follower_gain,
              last_synced: new Date().toISOString(),
              raw_response: metrics.raw_response,
            })
            .eq("id", pp.id);

          results.synced++;
          results.details.push({
            postId: post.id,
            platform: pp.platform,
            metrics: {
              likes: metrics.likes,
              comments: metrics.comments,
              shares: metrics.shares,
              impressions: metrics.impressions,
              reach: metrics.reach,
            },
          });
        } else {
          results.failed++;
          results.details.push({
            postId: post.id,
            platform: pp.platform,
            error: "Failed to fetch metrics",
          });
        }
      } catch (error: any) {
        results.failed++;
        results.details.push({
          postId: post.id,
          platform: pp.platform,
          error: error.message,
        });
      }
    }

    // Update last sync time
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      analytics_last_synced: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Fetch metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
