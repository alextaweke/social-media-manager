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

    let query = supabase
      .from("posts")
      .select(
        `
        id,
        content,
        published_at,
        published_posts (
          platform,
          engagement_likes,
          engagement_comments,
          engagement_shares,
          engagement_saves,
          reach,
          impressions
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") {
      query = query.eq("published_posts.platform", platform);
    }

    const { data: posts, error } = await query;

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
