/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/analytics/posts
// Returns recent published posts with engagement data for the dashboard
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
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // In the posts query, add media_urls:
    let postsQuery = supabase
      .from("posts")
      .select(
        `
    id,
    content,
    media_urls,
    platform_post_id,
    published_at,
    status,
    published_posts!left (
      id,
      platform,
      platform_post_id,
      platform_post_url,
      engagement_likes,
      engagement_comments,
      engagement_shares,
      engagement_saves,
      impressions,
      reach,
      clicks,
      video_views,
      video_avg_watch_time,
      profile_views,
      follower_gain,
      last_synced,
      raw_response
    )
  `,
      )
      .eq("user_id", user.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") {
      postsQuery = postsQuery.eq("published_posts.platform", platform);
    }

    const { data: posts, error } = await postsQuery;

    if (error) throw error;

    return NextResponse.json(
      { success: true, posts: posts || [] },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (error: any) {
    console.error("Analytics posts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
