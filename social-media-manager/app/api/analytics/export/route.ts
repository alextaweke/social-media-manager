/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/analytics-service";

// GET /api/analytics/export
// Streams a CSV file download with analytics summary + per-post breakdown
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";
    const platform = searchParams.get("platform") || "all";
    const format = searchParams.get("format") || "csv"; // csv or json

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

    // Fetch summary and posts using the service
    const [summary, posts] = await Promise.all([
      AnalyticsService.getAnalyticsSummary(user.id, days),
      AnalyticsService.getPostsWithEngagement(user.id, 500, platform), // Increased limit for export
    ]);

    // If JSON format requested
    if (format === "json") {
      return NextResponse.json({
        success: true,
        summary,
        posts,
        exported_at: new Date().toISOString(),
      });
    }

    // Generate CSV
    const csv = generateEnhancedCSV(summary, posts || [], period, platform);

    const filename = `analytics_${platform}_${period}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Analytics export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export analytics" },
      { status: 500 },
    );
  }
}

// Generate enhanced CSV with more data sections
function generateEnhancedCSV(
  summary: any,
  posts: any[],
  period: string,
  platform: string,
): string {
  const rows: string[] = [];
  const timestamp = new Date().toISOString();

  // ========== HEADER SECTION ==========
  rows.push(`"SocialHub Analytics Report"`);
  rows.push(`"Generated:","${timestamp}"`);
  rows.push(
    `"Period:","${period === "7d" ? "Last 7 Days" : period === "90d" ? "Last 90 Days" : "Last 30 Days"}"`,
  );
  rows.push(`"Platform:","${platform === "all" ? "All Platforms" : platform}"`);
  rows.push(``);

  // ========== SUMMARY SECTION ==========
  rows.push(`"=== SUMMARY STATISTICS ==="`);
  rows.push(`"Metric","Value"`);
  rows.push(
    `"Total Impressions","${summary.total_impressions?.toLocaleString() || 0}"`,
  );
  rows.push(`"Total Reach","${summary.total_reach?.toLocaleString() || 0}"`);
  rows.push(`"Total Likes","${summary.total_likes?.toLocaleString() || 0}"`);
  rows.push(
    `"Total Comments","${summary.total_comments?.toLocaleString() || 0}"`,
  );
  rows.push(`"Total Shares","${summary.total_shares?.toLocaleString() || 0}"`);
  rows.push(`"Total Saves","${summary.total_saves?.toLocaleString() || 0}"`);
  rows.push(`"Total Posts","${posts.length}"`);

  if (summary.total_reach > 0) {
    const engagementRate = (
      ((summary.total_likes + summary.total_comments + summary.total_shares) /
        summary.total_reach) *
      100
    ).toFixed(2);
    rows.push(`"Overall Engagement Rate","${engagementRate}%"`);
  }
  rows.push(``);

  // ========== PLATFORM BREAKDOWN ==========
  rows.push(`"=== PLATFORM BREAKDOWN ==="`);
  rows.push(
    `"Platform","Impressions","Reach","Likes","Comments","Shares","Saves"`,
  );

  for (const [plat, data] of Object.entries(summary.by_platform || {}) as [
    string,
    any,
  ][]) {
    rows.push(
      `"${plat}",${data.impressions || 0},${data.reach || 0},${data.likes || 0},${data.comments || 0},${data.shares || 0},${data.saves || 0}`,
    );
  }
  rows.push(``);

  // ========== TOP PERFORMING POSTS ==========
  rows.push(`"=== TOP PERFORMING POSTS ==="`);
  rows.push(
    `"Rank","Platform","Content","Published Date","Likes","Comments","Shares","Impressions","Reach","Engagement Rate"`,
  );

  // Calculate engagement rate for each post and sort
  const postsWithEngagement = posts
    .map((post) => {
      const totalEngagement =
        post.published_posts?.reduce(
          (sum: number, pp: any) =>
            sum +
            (pp.engagement_likes || 0) +
            (pp.engagement_comments || 0) +
            (pp.engagement_shares || 0),
          0,
        ) || 0;
      const reach =
        post.published_posts?.reduce(
          (sum: number, pp: any) => sum + (pp.reach || 0),
          0,
        ) || 1;
      const engagementRate = ((totalEngagement / reach) * 100).toFixed(2);
      return { ...post, totalEngagement, engagementRate };
    })
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 10);

  postsWithEngagement.forEach((post, index) => {
    const content = `"${(post.content || "").replace(/"/g, '""').substring(0, 150)}"`;
    const publishedDate = post.published_at
      ? new Date(post.published_at).toLocaleDateString()
      : "N/A";
    const platformNames =
      post.published_posts?.map((pp: any) => pp.platform).join(", ") || "N/A";
    const likes =
      post.published_posts?.reduce(
        (sum: number, pp: any) => sum + (pp.engagement_likes || 0),
        0,
      ) || 0;
    const comments =
      post.published_posts?.reduce(
        (sum: number, pp: any) => sum + (pp.engagement_comments || 0),
        0,
      ) || 0;
    const shares =
      post.published_posts?.reduce(
        (sum: number, pp: any) => sum + (pp.engagement_shares || 0),
        0,
      ) || 0;
    const impressions =
      post.published_posts?.reduce(
        (sum: number, pp: any) => sum + (pp.impressions || 0),
        0,
      ) || 0;
    const reach =
      post.published_posts?.reduce(
        (sum: number, pp: any) => sum + (pp.reach || 0),
        0,
      ) || 0;

    rows.push(
      `${index + 1},"${platformNames}",${content},"${publishedDate}",${likes},${comments},${shares},${impressions},${reach},"${post.engagementRate}%"`,
    );
  });
  rows.push(``);

  // ========== ALL POSTS DETAIL ==========
  rows.push(`"=== ALL POSTS DETAIL ==="`);
  rows.push(
    `"Post ID","Platform","Content","Published Date","Likes","Comments","Shares","Saves","Impressions","Reach","Clicks","Video Views","URL"`,
  );

  for (const post of posts) {
    for (const pp of post.published_posts || []) {
      const content = `"${(post.content || "").replace(/"/g, '""').substring(0, 200)}"`;
      const publishedDate = post.published_at
        ? new Date(post.published_at).toLocaleString()
        : "N/A";

      rows.push(
        `"${post.id}","${pp.platform}",${content},"${publishedDate}",${pp.engagement_likes || 0},${pp.engagement_comments || 0},${pp.engagement_shares || 0},${pp.engagement_saves || 0},${pp.impressions || 0},${pp.reach || 0},${pp.clicks || 0},${pp.video_views || 0},"${pp.platform_post_url || ""}"`,
      );
    }
  }
  rows.push(``);

  // ========== DAILY BREAKDOWN ==========
  rows.push(`"=== DAILY PERFORMANCE ==="`);
  rows.push(`"Date","Impressions","Reach","Likes","Comments","Shares","Posts"`);

  for (const day of summary.daily || []) {
    rows.push(
      `"${day.date}",${day.impressions || 0},${day.reach || 0},${day.likes || 0},${day.comments || 0},${day.shares || 0},${day.posts || 0}`,
    );
  }

  return rows.join("\n");
}
