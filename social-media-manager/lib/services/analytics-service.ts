/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";

export class AnalyticsService {
  // Fetch Facebook Page Insights
  static async fetchFacebookInsights(
    accessToken: string,
    pageId: string,
    since: Date,
    until: Date,
  ) {
    try {
      const metrics = [
        "page_fans",
        "page_impressions",
        "page_posts_impressions",
        "page_engaged_users",
        "page_actions_post_reactions_like_total",
        "page_views_total",
        "page_follows",
      ].join(",");

      // FIX: updated from v18.0 → v21.0 (latest stable Graph API)
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metrics}&since=${since.toISOString().split("T")[0]}&until=${until.toISOString().split("T")[0]}&access_token=${accessToken}`,
      );

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching Facebook insights:", error);
      return [];
    }
  }

  // Fetch Instagram Insights
  static async fetchInstagramInsights(
    accessToken: string,
    igUserId: string,
    since: Date,
    until: Date,
  ) {
    try {
      const metrics = [
        "impressions",
        "reach",
        "profile_views",
        "follower_count",
      ].join(",");

      // FIX: updated from v18.0 → v21.0
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/insights?metric=${metrics}&period=day&since=${since.toISOString().split("T")[0]}&until=${until.toISOString().split("T")[0]}&access_token=${accessToken}`,
      );

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching Instagram insights:", error);
      return [];
    }
  }

  // Fetch Twitter/X Analytics
  static async fetchTwitterInsights(accessToken: string, username: string) {
    try {
      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.public_metrics || null;
    } catch (error) {
      console.error("Error fetching Twitter insights:", error);
      return null;
    }
  }

  // ADDED: Fetch LinkedIn Page Analytics
  static async fetchLinkedInInsights(
    accessToken: string,
    organizationId: string,
    since: Date,
    until: Date,
  ) {
    try {
      const sinceMs = since.getTime();
      const untilMs = until.getTime();

      const response = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${sinceMs}&timeIntervals.timeRange.end=${untilMs}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": "202404",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error("Error fetching LinkedIn insights:", error);
      return [];
    }
  }

  // Fetch Telegram Stats
  static async fetchTelegramStats(botToken: string, chatId: string) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
      );

      const data = await response.json();
      if (data.ok) {
        return {
          members: data.result.member_count,
          title: data.result.title,
          type: data.result.type,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching Telegram stats:", error);
      return null;
    }
  }

  // Get posts from database with engagement
  // FIX: added optional platform filter to match usage in API route
  static async getPostsWithEngagement(
    userId: string,
    limit: number = 50,
    platform?: string,
  ) {
    const supabase = await createClient();

    let query = supabase
      .from("posts")
      .select(
        `
        *,
        published_posts (
          platform,
          platform_post_id,
          engagement_likes,
          engagement_comments,
          engagement_shares,
          engagement_saves,
          reach,
          impressions
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    // FIX: filter by platform at DB level when specified
    if (platform && platform !== "all") {
      query = query.eq("published_posts.platform", platform);
    }

    const { data: posts, error } = await query;
    if (error) throw error;
    return posts;
  }

  // Calculate engagement rate
  static calculateEngagementRate(post: any): number {
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

    return (totalEngagement / reach) * 100;
  }

  // FIX: getAnalyticsSummary now queries "published_posts" (consistent with route.ts)
  // instead of the non-existent "analytics_data" table
  static async getAnalyticsSummary(userId: string, days: number = 30) {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all published posts for this user in the period
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "published")
      .gte("published_at", startDate.toISOString());

    if (postsError) throw postsError;

    const postIds = posts?.map((p) => p.id) || [];

    if (postIds.length === 0) {
      return {
        total_impressions: 0,
        total_reach: 0,
        total_likes: 0,
        total_comments: 0,
        total_shares: 0,
        total_saves: 0,
        total_clicks: 0,
        by_platform: {},
        daily: [],
      };
    }

    const { data: engagement, error } = await supabase
      .from("published_posts")
      .select("*")
      .in("post_id", postIds);

    if (error) throw error;

    const summary = {
      total_impressions: 0,
      total_reach: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_saves: 0, // FIX: now actually summed
      total_clicks: 0,
      by_platform: {} as Record<string, any>,
      daily: [] as any[],
    };

    for (const item of engagement || []) {
      summary.total_impressions += item.impressions || item.reach || 0;
      summary.total_reach += item.reach || 0;
      summary.total_likes += item.engagement_likes || 0;
      summary.total_comments += item.engagement_comments || 0;
      summary.total_shares += item.engagement_shares || 0;
      summary.total_saves += item.engagement_saves || 0; // FIX: was missing

      if (!summary.by_platform[item.platform]) {
        summary.by_platform[item.platform] = {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        };
      }
      summary.by_platform[item.platform].impressions +=
        item.impressions || item.reach || 0;
      summary.by_platform[item.platform].reach += item.reach || 0;
      summary.by_platform[item.platform].likes += item.engagement_likes || 0;
      summary.by_platform[item.platform].comments +=
        item.engagement_comments || 0;
      summary.by_platform[item.platform].shares += item.engagement_shares || 0;
      summary.by_platform[item.platform].saves += item.engagement_saves || 0;
    }

    return summary;
  }

  // ADDED: Generate CSV export data (referenced by /api/analytics/export)
  static generateCSV(analyticsData: any, posts: any[]): string {
    const lines: string[] = [];

    // Summary section
    lines.push("ANALYTICS SUMMARY");
    lines.push(`Total Impressions,${analyticsData.total_impressions}`);
    lines.push(`Total Reach,${analyticsData.total_reach}`);
    lines.push(`Total Likes,${analyticsData.total_likes}`);
    lines.push(`Total Comments,${analyticsData.total_comments}`);
    lines.push(`Total Shares,${analyticsData.total_shares}`);
    lines.push(`Total Saves,${analyticsData.total_saves}`);
    lines.push("");

    // Platform breakdown
    lines.push("PLATFORM BREAKDOWN");
    lines.push("Platform,Impressions,Reach,Likes,Comments,Shares");
    for (const [platform, data] of Object.entries(
      analyticsData.by_platform || {},
    ) as [string, any][]) {
      lines.push(
        `${platform},${data.impressions},${data.reach},${data.likes},${data.comments},${data.shares}`,
      );
    }
    lines.push("");

    // Posts section
    lines.push("RECENT POSTS");
    lines.push("Date,Content,Platform,Likes,Comments,Shares,Reach");
    for (const post of posts) {
      for (const pp of post.published_posts || []) {
        const content = `"${(post.content || "").replace(/"/g, '""').substring(0, 100)}"`;
        lines.push(
          `${post.published_at?.split("T")[0] || ""},${content},${pp.platform},${pp.engagement_likes || 0},${pp.engagement_comments || 0},${pp.engagement_shares || 0},${pp.reach || 0}`,
        );
      }
    }

    return lines.join("\n");
  }
}
