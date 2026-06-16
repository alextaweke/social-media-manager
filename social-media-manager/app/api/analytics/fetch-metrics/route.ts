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

    const { daysBack = 30, platform, postId } = await request.json();

    // If specific post ID provided, fetch just that post
    if (postId) {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select(
          `
          id,
          platform_post_id,
          published_at,
          published_posts!left (
            id,
            platform,
            platform_post_id,
            last_synced
          )
        `,
        )
        .eq("id", postId)
        .eq("user_id", user.id)
        .eq("status", "published")
        .single();

      if (postError || !post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const metrics = await fetchMetricsForPost(post, user.id);
      return NextResponse.json({
        success: true,
        metrics,
      });
    }

    // Get all published posts
    let query = supabase
      .from("posts")
      .select(
        `
        id,
        platform_post_id,
        published_at,
        published_posts!left (
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
      metrics: [] as any[], // Full metrics array
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
        // Extract the actual platform post ID
        let platformPostId = post.platform_post_id;

        if (
          typeof platformPostId === "string" &&
          platformPostId.startsWith("{")
        ) {
          try {
            const parsed = JSON.parse(platformPostId);
            if (parsed.facebook) platformPostId = parsed.facebook;
            else if (parsed[pp.platform]) platformPostId = parsed[pp.platform];
          } catch (e) {}
        }

        console.log(`Fetching metrics for ${pp.platform}:`, {
          originalPostId: post.platform_post_id,
          extractedId: platformPostId,
        });

        let metrics: any = null;

        switch (pp.platform) {
          case "facebook":
            metrics = await AnalyticsService.fetchFacebookPostData(
              account.access_token,
              platformPostId,
            );
            break;
          case "instagram":
            metrics = await AnalyticsService.fetchInstagramPostData(
              account.access_token,
              platformPostId,
            );
            break;
          case "twitter":
            metrics = await AnalyticsService.fetchTwitterPostData(
              account.access_token,
              platformPostId,
            );
            break;
          case "linkedin":
            metrics = await AnalyticsService.fetchLinkedInPostData(
              account.access_token,
              platformPostId,
            );
            break;
          case "telegram":
            metrics = await AnalyticsService.fetchTelegramPostData(
              account.access_token,
              account.platform_user_id,
              platformPostId,
            );
            break;
        }

        if (metrics) {
          // Update published_posts with fresh metrics
          const { error: updateError } = await supabase
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
              platform_post_url: metrics.permalink,
            })
            .eq("id", pp.id);

          if (updateError) {
            console.error(`Update error for post ${post.id}:`, updateError);
          }

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

          // Add full metrics to array
          results.metrics.push(metrics);
        } else {
          results.failed++;
          results.details.push({
            postId: post.id,
            platform: pp.platform,
            error: "Failed to fetch metrics",
          });
        }
      } catch (error: any) {
        console.error(
          `Error processing ${pp.platform} post ${post.id}:`,
          error,
        );
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

    // Return full metrics response
    return NextResponse.json({
      success: true,
      results: {
        total: results.total,
        synced: results.synced,
        failed: results.failed,
        details: results.details,
        metrics: results.metrics, // Full metrics array
      },
    });
  } catch (error: any) {
    console.error("Fetch metrics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to fetch metrics for a single post
async function fetchMetricsForPost(post: any, userId: string) {
  const supabase = await createClient();

  // Get social account for token
  const publishedPost = post.published_posts;
  const pp = Array.isArray(publishedPost) ? publishedPost[0] : publishedPost;

  if (!pp || !post.platform_post_id) {
    return null;
  }

  const { data: account } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", pp.platform)
    .eq("is_active", true)
    .single();

  if (!account) {
    return null;
  }

  let platformPostId = post.platform_post_id;

  if (typeof platformPostId === "string" && platformPostId.startsWith("{")) {
    try {
      const parsed = JSON.parse(platformPostId);
      if (parsed.facebook) platformPostId = parsed.facebook;
      else if (parsed[pp.platform]) platformPostId = parsed[pp.platform];
    } catch (e) {}
  }

  let metrics: any = null;

  switch (pp.platform) {
    case "facebook":
      metrics = await AnalyticsService.fetchFacebookPostData(
        account.access_token,
        platformPostId,
      );
      break;
    case "instagram":
      metrics = await AnalyticsService.fetchInstagramPostData(
        account.access_token,
        platformPostId,
      );
      break;
    case "twitter":
      metrics = await AnalyticsService.fetchTwitterPostData(
        account.access_token,
        platformPostId,
      );
      break;
    case "linkedin":
      metrics = await AnalyticsService.fetchLinkedInPostData(
        account.access_token,
        platformPostId,
      );
      break;
    case "telegram":
      metrics = await AnalyticsService.fetchTelegramPostData(
        account.access_token,
        account.platform_user_id,
        platformPostId,
      );
      break;
  }

  return metrics;
}
