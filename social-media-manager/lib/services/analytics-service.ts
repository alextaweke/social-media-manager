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

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/insights?metric=${metrics}&since=${since.toISOString().split("T")[0]}&until=${until.toISOString().split("T")[0]}&access_token=${accessToken}`,
      );

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

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/insights?metric=${metrics}&period=day&since=${since.toISOString().split("T")[0]}&until=${until.toISOString().split("T")[0]}&access_token=${accessToken}`,
      );

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

      const data = await response.json();
      return data.data?.public_metrics || null;
    } catch (error) {
      console.error("Error fetching Twitter insights:", error);
      return null;
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
  static async getPostsWithEngagement(userId: string, limit: number = 50) {
    const supabase = await createClient();

    const { data: posts, error } = await supabase
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

  // Get analytics summary
  static async getAnalyticsSummary(userId: string, days: number = 30) {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: analytics, error } = await supabase
      .from("analytics_data")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString().split("T")[0]);

    if (error) throw error;

    const summary = {
      total_impressions: 0,
      total_reach: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_saves: 0,
      total_clicks: 0,
      by_platform: {} as Record<string, any>,
      daily: [] as any[],
    };

    for (const item of analytics || []) {
      summary.total_impressions += item.impressions || 0;
      summary.total_reach += item.reach || 0;
      summary.total_likes += item.likes || 0;
      summary.total_comments += item.comments || 0;
      summary.total_shares += item.shares || 0;
      summary.total_saves += item.saves || 0;
      summary.total_clicks += item.clicks || 0;

      if (!summary.by_platform[item.platform]) {
        summary.by_platform[item.platform] = {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
        };
      }
      summary.by_platform[item.platform].impressions += item.impressions || 0;
      summary.by_platform[item.platform].reach += item.reach || 0;
      summary.by_platform[item.platform].likes += item.likes || 0;
      summary.by_platform[item.platform].comments += item.comments || 0;
      summary.by_platform[item.platform].shares += item.shares || 0;
    }

    return summary;
  }
}
