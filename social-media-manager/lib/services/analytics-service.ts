/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";

export interface PlatformMetrics {
  // Common metrics
  post_id: string;
  platform: string;
  published_at: string;

  // Engagement metrics
  likes: number;
  comments: number;
  shares: number;
  saves: number;

  // Reach metrics
  impressions: number;
  reach: number;
  clicks: number;

  // Video metrics (if applicable)
  video_views: number;
  video_avg_watch_time: number;
  video_completion_rate: number;

  // Profile metrics
  profile_views: number;
  follower_gain: number;

  // Raw response data
  raw_response: any;
  fetched_at: string;
}

export class AnalyticsService {
  // ============ FACEBOOK ============
  static async fetchFacebookPostData(
    accessToken: string,
    postId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      // Fetch post insights
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v20.0/${postId}/insights?metric=post_impressions,post_impressions_unique,post_engaged_users,post_reactions_like_total,post_clicks,post_video_views&access_token=${accessToken}`,
      );
      const insights = await insightsResponse.json();

      // Fetch post comments and shares
      const postResponse = await fetch(
        `https://graph.facebook.com/v20.0/${postId}?fields=comments.summary(true),shares,reactions.summary(true)&access_token=${accessToken}`,
      );
      const postData = await postResponse.json();

      // Parse insights data
      let impressions = 0,
        reach = 0,
        engaged_users = 0,
        likes = 0,
        clicks = 0,
        video_views = 0;

      for (const item of insights.data || []) {
        const value = item.values?.[0]?.value || 0;
        switch (item.name) {
          case "post_impressions":
            impressions = value;
            break;
          case "post_impressions_unique":
            reach = value;
            break;
          case "post_engaged_users":
            engaged_users = value;
            break;
          case "post_reactions_like_total":
            likes = value;
            break;
          case "post_clicks":
            clicks = value;
            break;
          case "post_video_views":
            video_views = value;
            break;
        }
      }

      return {
        post_id: postId,
        platform: "facebook",
        published_at: new Date().toISOString(),
        likes: likes,
        comments: postData.comments?.summary?.total_count || 0,
        shares: postData.shares?.count || 0,
        saves: 0, // Facebook doesn't have public saves metric
        impressions: impressions,
        reach: reach,
        clicks: clicks,
        video_views: video_views,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        profile_views: 0,
        follower_gain: 0,
        raw_response: { insights, postData },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Facebook post data:", error);
      return null;
    }
  }

  // ============ INSTAGRAM ============
  static async fetchInstagramPostData(
    accessToken: string,
    mediaId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      // Get media info
      const mediaResponse = await fetch(
        `https://graph.facebook.com/v20.0/${mediaId}?fields=like_count,comments_count,media_type,video_views,permalink&access_token=${accessToken}`,
      );
      const media = await mediaResponse.json();

      // Get insights
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v20.0/${mediaId}/insights?metric=impressions,reach,saved,video_views,reel_plays&access_token=${accessToken}`,
      );
      const insights = await insightsResponse.json();

      let impressions = 0,
        reach = 0,
        saves = 0,
        video_views = 0;

      for (const item of insights.data || []) {
        const value = item.values?.[0]?.value || 0;
        switch (item.name) {
          case "impressions":
            impressions = value;
            break;
          case "reach":
            reach = value;
            break;
          case "saved":
            saves = value;
            break;
          case "video_views":
            video_views = value;
            break;
          case "reel_plays":
            video_views = value;
            break;
        }
      }

      return {
        post_id: mediaId,
        platform: "instagram",
        published_at: new Date().toISOString(),
        likes: media.like_count || 0,
        comments: media.comments_count || 0,
        shares: 0, // Instagram doesn't have shares in API
        saves: saves,
        impressions: impressions,
        reach: reach,
        clicks: 0, // Instagram doesn't provide clicks
        video_views: video_views || media.video_views || 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        profile_views: 0,
        follower_gain: 0,
        raw_response: { media, insights },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Instagram post data:", error);
      return null;
    }
  }

  // ============ TWITTER/X ============
  static async fetchTwitterPostData(
    accessToken: string,
    tweetId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics,context_annotations&expansions=author_id`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await response.json();

      const publicMetrics = data.data?.public_metrics || {};
      const organicMetrics = data.data?.organic_metrics || {};
      const nonPublicMetrics = data.data?.non_public_metrics || {};

      return {
        post_id: tweetId,
        platform: "twitter",
        published_at: new Date().toISOString(),
        likes: publicMetrics.like_count || 0,
        comments: publicMetrics.reply_count || 0,
        shares: publicMetrics.retweet_count || 0,
        saves: publicMetrics.bookmark_count || 0,
        impressions:
          organicMetrics.impression_count ||
          publicMetrics.impression_count ||
          0,
        reach: organicMetrics.impression_count || 0,
        clicks:
          nonPublicMetrics.url_link_clicks ||
          organicMetrics.url_link_clicks ||
          0,
        video_views: nonPublicMetrics.video_view_count || 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        profile_views: nonPublicMetrics.user_profile_clicks || 0,
        follower_gain: 0,
        raw_response: data,
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Twitter post data:", error);
      return null;
    }
  }

  // ============ LINKEDIN ============
  static async fetchLinkedInPostData(
    accessToken: string,
    shareUrn: string,
  ): Promise<PlatformMetrics | null> {
    try {
      const encodedUrn = encodeURIComponent(shareUrn);

      // Get social actions (likes, comments)
      const socialResponse = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodedUrn}?fields=likesSummary,commentsSummary,sharesSummary`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": "202404",
          },
        },
      );
      const social = await socialResponse.json();

      // Get statistics (impressions, clicks)
      const statsResponse = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodedUrn}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": "202404",
          },
        },
      );
      const stats = await statsResponse.json();
      const shareStats = stats.elements?.[0]?.totalShareStatistics || {};

      return {
        post_id: shareUrn,
        platform: "linkedin",
        published_at: new Date().toISOString(),
        likes: social.likesSummary?.totalLikes || 0,
        comments: social.commentsSummary?.totalFirstLevelComments || 0,
        shares: social.sharesSummary?.totalShares || 0,
        saves: 0, // LinkedIn doesn't have saves
        impressions: shareStats.impressionCount || 0,
        reach: shareStats.uniqueImpressionsCount || 0,
        clicks: shareStats.clickCount || 0,
        video_views: 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        profile_views: 0,
        follower_gain: 0,
        raw_response: { social, stats },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching LinkedIn post data:", error);
      return null;
    }
  }

  // ============ TELEGRAM ============
  static async fetchTelegramPostData(
    botToken: string,
    chatId: string,
    messageId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      // Get message info
      const messageResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
      );
      const chatInfo = await messageResponse.json();

      // Get message reactions (Bot API 7.0+)
      const reactionsResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getMessageReactionCount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: parseInt(messageId),
          }),
        },
      );
      const reactions = reactionsResponse.ok
        ? await reactionsResponse.json()
        : { result: { reactions: [] } };

      // Calculate total reactions
      let totalReactions = 0;
      for (const reaction of reactions.result?.reactions || []) {
        totalReactions += reaction.total_count || 0;
      }

      return {
        post_id: messageId,
        platform: "telegram",
        published_at: new Date().toISOString(),
        likes: totalReactions, // Reactions as likes
        comments: 0, // Telegram doesn't expose comments
        shares: 0, // Telegram doesn't expose forwards via API easily
        saves: 0,
        impressions: 0, // Telegram doesn't expose impressions
        reach: chatInfo.result?.member_count || 0, // Subscriber count as reach proxy
        clicks: 0,
        video_views: 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        profile_views: 0,
        follower_gain: 0,
        raw_response: { chatInfo, reactions },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Telegram post data:", error);
      return null;
    }
  }

  // ============ UPDATE PUBLISHED POSTS WITH METRICS ============
  static async updatePostMetrics(postId: string, metrics: PlatformMetrics) {
    const supabase = await createClient();

    const { error } = await supabase
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
        last_synced: new Date(),
        raw_response: metrics.raw_response,
      })
      .eq("post_id", postId)
      .eq("platform", metrics.platform);

    if (error) {
      console.error(`Error updating metrics for post ${postId}:`, error);
    }
  }

  // ============ BATCH FETCH ALL POSTS ============
  static async fetchAllPostMetrics(userId: string, daysBack: number = 30) {
    const supabase = await createClient();

    // Get published posts from last N days that have platform_post_id
    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        platform_post_id,
        published_posts!left (
          platform,
          platform_post_id,
          last_synced
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "published")
      .gte(
        "published_at",
        new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) throw error;

    // Get social accounts for tokens
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const accountMap = new Map();
    accounts?.forEach((acc) => accountMap.set(acc.platform, acc));

    const results = [];

    for (const post of posts || []) {
      const publishedPost = post.published_posts?.[0];
      if (!publishedPost || !post.platform_post_id) continue;

      const account = accountMap.get(publishedPost.platform);
      if (!account) continue;

      let metrics: PlatformMetrics | null = null;

      try {
        switch (publishedPost.platform) {
          case "facebook":
            metrics = await this.fetchFacebookPostData(
              account.access_token,
              post.platform_post_id,
            );
            break;
          case "instagram":
            metrics = await this.fetchInstagramPostData(
              account.access_token,
              post.platform_post_id,
            );
            break;
          case "twitter":
            metrics = await this.fetchTwitterPostData(
              account.access_token,
              post.platform_post_id,
            );
            break;
          case "linkedin":
            metrics = await this.fetchLinkedInPostData(
              account.access_token,
              post.platform_post_id,
            );
            break;
          case "telegram":
            metrics = await this.fetchTelegramPostData(
              account.access_token,
              account.platform_user_id,
              post.platform_post_id,
            );
            break;
        }

        if (metrics) {
          await this.updatePostMetrics(post.id, metrics);
          results.push({
            postId: post.id,
            platform: publishedPost.platform,
            success: true,
          });
        } else {
          results.push({
            postId: post.id,
            platform: publishedPost.platform,
            success: false,
            error: "No data returned",
          });
        }
      } catch (error: any) {
        results.push({
          postId: post.id,
          platform: publishedPost.platform,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}
