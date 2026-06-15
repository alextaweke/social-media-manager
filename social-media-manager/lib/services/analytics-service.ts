/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";

export interface PlatformMetrics {
  post_id: string;
  platform: string;
  published_at: string;

  // Engagement Metrics
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reactions: number;
  engagement_rate: number;

  // Reach Metrics
  impressions: number;
  reach: number;
  unique_impressions: number;

  // Click Metrics
  clicks: number;
  link_clicks: number;
  profile_clicks: number;
  hashtag_clicks: number;

  // Audience Metrics
  profile_views: number;
  follower_gain: number;
  follower_loss: number;
  new_followers: number;

  // Video Metrics
  video_views: number;
  video_3s_views: number;
  video_10s_views: number;
  video_25s_views: number;
  video_50s_views: number;
  video_avg_watch_time: number;
  video_completion_rate: number;
  video_retention_graph: any;

  // Platform Specific Reactions (Facebook)
  reaction_like: number;
  reaction_love: number;
  reaction_wow: number;
  reaction_haha: number;
  reaction_sad: number;
  reaction_angry: number;
  reaction_care: number;

  // Post Info
  permalink: string;
  media_type: string; // photo, video, carousel, reel, story
  media_url: string;

  raw_response: any;
  fetched_at: string;
}

export class AnalyticsService {
  // ============ FACEBOOK - Complete Metrics ============
  static async fetchFacebookPostData(
    accessToken: string,
    postId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      // Fetch all possible insights
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v25.0/${postId}/insights?metric=post_impressions,post_impressions_unique,post_impressions_frequency,post_engaged_users,post_reactions_like_total,post_reactions_love_total,post_reactions_wow_total,post_reactions_haha_total,post_reactions_sad_total,post_reactions_anger_total,post_clicks,post_clicks_by_type,post_video_views,post_video_avg_time_watched,post_video_complete_views_organic&access_token=${accessToken}`,
      );
      const insights = await insightsResponse.json();

      // Fetch post details
      const postResponse = await fetch(
        `https://graph.facebook.com/v25.0/${postId}?fields=comments.summary(true),shares,reactions.summary(true),permalink_url,created_time,message_tags,attachments{media_type,media_url,unshimmed_url}&access_token=${accessToken}`,
      );
      const postData = await postResponse.json();

      // Parse insights
      const metrics: any = {
        impressions: 0,
        reach: 0,
        engaged_users: 0,
        clicks: 0,
        video_views: 0,
        video_avg_watch_time: 0,
        video_complete_views: 0,
        reaction_like: 0,
        reaction_love: 0,
        reaction_wow: 0,
        reaction_haha: 0,
        reaction_sad: 0,
        reaction_angry: 0,
        
      };

      for (const item of insights.data || []) {
        const value = item.values?.[0]?.value || 0;
        switch (item.name) {
          case "post_impressions":
            metrics.impressions = value;
            break;
          case "post_impressions_unique":
            metrics.reach = value;
            break;
          case "post_engaged_users":
            metrics.engaged_users = value;
            break;
          case "post_reactions_like_total":
            metrics.reaction_like = value;
            break;
          case "post_reactions_love_total":
            metrics.reaction_love = value;
            break;
          case "post_reactions_wow_total":
            metrics.reaction_wow = value;
            break;
          case "post_reactions_haha_total":
            metrics.reaction_haha = value;
            break;
          case "post_reactions_sad_total":
            metrics.reaction_sad = value;
            break;
          case "post_reactions_anger_total":
            metrics.reaction_angry = value;
            break;
          case "post_clicks":
            metrics.clicks = value;
            break;
          case "post_video_views":
            metrics.video_views = value;
            break;
          case "post_video_avg_time_watched":
            metrics.video_avg_watch_time = value;
            break;
          case "post_video_complete_views_organic":
            metrics.video_complete_views = value;
            break;
        }
      }

      const totalReactions =
        metrics.reaction_like +
        metrics.reaction_love +
        metrics.reaction_wow +
        metrics.reaction_haha +
        metrics.reaction_sad +
        metrics.reaction_angry;

      // Get media type from attachments
      let mediaType = "text";
      let mediaUrl = null;
      if (postData.attachments?.data?.[0]) {
        mediaType = postData.attachments.data[0].media_type || "photo";
        mediaUrl =
          postData.attachments.data[0].media_url ||
          postData.attachments.data[0].unshimmed_url;
      }

      return {
        post_id: postId,
        platform: "facebook",
        published_at: postData.created_time || new Date().toISOString(),

        // Engagement
        likes: totalReactions,
        comments: postData.comments?.summary?.total_count || 0,
        shares: postData.shares?.count || 0,
        saves: 0,
        reactions: totalReactions,
        engagement_rate:
          metrics.reach > 0 ? (metrics.engaged_users / metrics.reach) * 100 : 0,

        // Reach
        impressions: metrics.impressions,
        reach: metrics.reach,
        unique_impressions: metrics.impressions,

        // Clicks
        clicks: metrics.clicks,
        link_clicks: metrics.clicks,
        profile_clicks: 0,
        hashtag_clicks: 0,

        // Audience
        profile_views: 0,
        follower_gain: 0,
        follower_loss: 0,
        new_followers: 0,

        // Video
        video_views: metrics.video_views,
        video_3s_views: 0,
        video_10s_views: 0,
        video_25s_views: 0,
        video_50s_views: 0,
        video_avg_watch_time: metrics.video_avg_watch_time,
        video_completion_rate:
          metrics.video_views > 0
            ? (metrics.video_complete_views / metrics.video_views) * 100
            : 0,
        video_retention_graph: null,

        // Facebook specific reactions
        reaction_like: metrics.reaction_like,
        reaction_love: metrics.reaction_love,
        reaction_wow: metrics.reaction_wow,
        reaction_haha: metrics.reaction_haha,
        reaction_sad: metrics.reaction_sad,
        reaction_angry: metrics.reaction_angry,
        reaction_care: 0,

        // Post info
        permalink: postData.permalink_url || `https://facebook.com/${postId}`,
        media_type: mediaType,
        media_url: mediaUrl,

        raw_response: { insights, postData },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Facebook post data:", error);
      return null;
    }
  }

  // ============ INSTAGRAM - Complete Metrics ============
  static async fetchInstagramPostData(
    accessToken: string,
    mediaId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      // Get media info with all fields
      const mediaResponse = await fetch(
        `https://graph.facebook.com/v25.0/${mediaId}?fields=like_count,comments_count,media_type,video_views,permalink,caption,timestamp,owner,media_url,thumbnail_url,children{like_count,comments_count,media_url}&access_token=${accessToken}`,
      );
      const media = await mediaResponse.json();

      // Get insights
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v25.0/${mediaId}/insights?metric=impressions,reach,saved,video_views,reel_plays,reel_average_reel_watch_time,reel_completion_rate,shares,profile_visits,follower_count&access_token=${accessToken}`,
      );
      const insights = await insightsResponse.json();

      const metrics: any = {
        impressions: 0,
        reach: 0,
        saves: 0,
        video_views: 0,
        reel_plays: 0,
        avg_watch_time: 0,
        completion_rate: 0,
        shares: 0,
        profile_visits: 0,
      };

      for (const item of insights.data || []) {
        const value = item.values?.[0]?.value || 0;
        switch (item.name) {
          case "impressions":
            metrics.impressions = value;
            break;
          case "reach":
            metrics.reach = value;
            break;
          case "saved":
            metrics.saves = value;
            break;
          case "video_views":
            metrics.video_views = value;
            break;
          case "reel_plays":
            metrics.reel_plays = value;
            metrics.video_views = value;
            break;
          case "reel_average_reel_watch_time":
            metrics.avg_watch_time = value;
            break;
          case "reel_completion_rate":
            metrics.completion_rate = value;
            break;
          case "shares":
            metrics.shares = value;
            break;
          case "profile_visits":
            metrics.profile_visits = value;
            break;
        }
      }

      // For carousel posts, sum likes/comments from children
      let totalLikes = media.like_count || 0;
      let totalComments = media.comments_count || 0;
      if (media.media_type === "CAROUSEL_ALBUM" && media.children?.data) {
        for (const child of media.children.data) {
          totalLikes += child.like_count || 0;
          totalComments += child.comments_count || 0;
        }
      }

      return {
        post_id: mediaId,
        platform: "instagram",
        published_at: media.timestamp || new Date().toISOString(),

        // Engagement
        likes: totalLikes,
        comments: totalComments,
        shares: metrics.shares,
        saves: metrics.saves,
        reactions: totalLikes,
        engagement_rate:
          metrics.reach > 0
            ? ((totalLikes + totalComments + metrics.shares) / metrics.reach) *
              100
            : 0,

        // Reach
        impressions: metrics.impressions,
        reach: metrics.reach,
        unique_impressions: metrics.impressions,

        // Clicks
        clicks: metrics.profile_visits,
        link_clicks: 0,
        profile_clicks: metrics.profile_visits,
        hashtag_clicks: 0,

        // Audience
        profile_views: metrics.profile_visits,
        follower_gain: 0,
        follower_loss: 0,
        new_followers: 0,

        // Video
        video_views: metrics.video_views || metrics.reel_plays,
        video_3s_views: 0,
        video_10s_views: 0,
        video_25s_views: 0,
        video_50s_views: 0,
        video_avg_watch_time: metrics.avg_watch_time,
        video_completion_rate: metrics.completion_rate,
        video_retention_graph: null,

        // Platform specific (not applicable for Instagram)
        reaction_like: 0,
        reaction_love: 0,
        reaction_wow: 0,
        reaction_haha: 0,
        reaction_sad: 0,
        reaction_angry: 0,
        reaction_care: 0,

        // Post info
        permalink: media.permalink || `https://instagram.com/p/${mediaId}`,
        media_type: media.media_type?.toLowerCase() || "image",
        media_url: media.media_url || media.thumbnail_url,

        raw_response: { media, insights },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Instagram post data:", error);
      return null;
    }
  }

  // ============ TWITTER - Complete Metrics ============
  static async fetchTwitterPostData(
    accessToken: string,
    tweetId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics,context_annotations,created_at,attachments,referenced_tweets,text,author_id&expansions=author_id,attachments.media_keys&media.fields=preview_image_url,url,type,alt_text`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await response.json();

      const publicMetrics = data.data?.public_metrics || {};
      const organicMetrics = data.data?.organic_metrics || {};
      const nonPublicMetrics = data.data?.non_public_metrics || {};

      // Get media type
      let mediaType = "text";
      if (data.includes?.media?.[0]) {
        mediaType = data.includes.media[0].type === "video" ? "video" : "photo";
      }

      return {
        post_id: tweetId,
        platform: "twitter",
        published_at: data.data?.created_at || new Date().toISOString(),

        // Engagement
        likes: publicMetrics.like_count || 0,
        comments: publicMetrics.reply_count || 0,
        shares: publicMetrics.retweet_count || 0,
        saves: publicMetrics.bookmark_count || 0,
        reactions: publicMetrics.like_count || 0,
        engagement_rate: 0,

        // Reach
        impressions:
          organicMetrics.impression_count ||
          publicMetrics.impression_count ||
          0,
        reach: organicMetrics.impression_count || 0,
        unique_impressions: organicMetrics.impression_count || 0,

        // Clicks
        clicks:
          nonPublicMetrics.url_link_clicks ||
          organicMetrics.url_link_clicks ||
          0,
        link_clicks:
          nonPublicMetrics.url_link_clicks ||
          organicMetrics.url_link_clicks ||
          0,
        profile_clicks:
          nonPublicMetrics.user_profile_clicks ||
          organicMetrics.user_profile_clicks ||
          0,
        hashtag_clicks: 0,

        // Audience
        profile_views: nonPublicMetrics.user_profile_clicks || 0,
        follower_gain: 0,
        follower_loss: 0,
        new_followers: 0,

        // Video
        video_views: nonPublicMetrics.video_view_count || 0,
        video_3s_views: 0,
        video_10s_views: 0,
        video_25s_views: 0,
        video_50s_views: 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        video_retention_graph: null,

        // Platform specific
        reaction_like: 0,
        reaction_love: 0,
        reaction_wow: 0,
        reaction_haha: 0,
        reaction_sad: 0,
        reaction_angry: 0,
        reaction_care: 0,

        // Post info
        permalink: `https://twitter.com/i/web/status/${tweetId}`,
        media_type: mediaType,
        media_url:
          data.includes?.media?.[0]?.preview_image_url ||
          data.includes?.media?.[0]?.url,

        raw_response: data,
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Twitter post data:", error);
      return null;
    }
  }

  // ============ LINKEDIN - Complete Metrics ============
  static async fetchLinkedInPostData(
    accessToken: string,
    shareUrn: string,
  ): Promise<PlatformMetrics | null> {
    try {
      const encodedUrn = encodeURIComponent(shareUrn);

      // Get social actions
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

      // Get statistics
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

      // Get post content
      const shareResponse = await fetch(
        `https://api.linkedin.com/v2/shares/${encodedUrn}?fields=created,content`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": "202404",
          },
        },
      );
      const shareData = await shareResponse.json();

      return {
        post_id: shareUrn,
        platform: "linkedin",
        published_at: shareData.created || new Date().toISOString(),

        // Engagement
        likes: social.likesSummary?.totalLikes || 0,
        comments: social.commentsSummary?.totalFirstLevelComments || 0,
        shares: social.sharesSummary?.totalShares || 0,
        saves: 0,
        reactions: social.likesSummary?.totalLikes || 0,
        engagement_rate:
          shareStats.impressionCount > 0
            ? ((shareStats.engagement || 0) / shareStats.impressionCount) * 100
            : 0,

        // Reach
        impressions: shareStats.impressionCount || 0,
        reach: shareStats.uniqueImpressionsCount || 0,
        unique_impressions: shareStats.uniqueImpressionsCount || 0,

        // Clicks
        clicks: shareStats.clickCount || 0,
        link_clicks: shareStats.clickCount || 0,
        profile_clicks: 0,
        hashtag_clicks: 0,

        // Audience
        profile_views: 0,
        follower_gain: 0,
        follower_loss: 0,
        new_followers: 0,

        // Video
        video_views: 0,
        video_3s_views: 0,
        video_10s_views: 0,
        video_25s_views: 0,
        video_50s_views: 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        video_retention_graph: null,

        // Platform specific
        reaction_like: 0,
        reaction_love: 0,
        reaction_wow: 0,
        reaction_haha: 0,
        reaction_sad: 0,
        reaction_angry: 0,
        reaction_care: 0,

        // Post info
        permalink: `https://linkedin.com/feed/update/${shareUrn}`,
        media_type: "text",
        media_url: shareData.content?.media?.url,

        raw_response: { social, stats, shareData },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching LinkedIn post data:", error);
      return null;
    }
  }

  // ============ TELEGRAM - Complete Metrics ============
  static async fetchTelegramPostData(
    botToken: string,
    chatId: string,
    messageId: string,
  ): Promise<PlatformMetrics | null> {
    try {
      // Get chat info
      const chatResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
      );
      const chatInfo = await chatResponse.json();

      // Get message info
      const messageResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: parseInt(messageId),
          }),
        },
      );
      const messageData = messageResponse.ok
        ? await messageResponse.json()
        : {};

      // Get message reactions
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

      let totalReactions = 0;
      for (const reaction of reactions.result?.reactions || []) {
        totalReactions += reaction.total_count || 0;
      }

      // Get message views (for channels)
      let views = 0;
      if (messageData.result?.forward_from_chat) {
        views = messageData.result?.views || 0;
      }

      // Determine media type
      let mediaType = "text";
      if (messageData.result?.photo) mediaType = "photo";
      else if (messageData.result?.video) mediaType = "video";
      else if (messageData.result?.animation) mediaType = "gif";
      else if (messageData.result?.document) mediaType = "document";

      return {
        post_id: messageId,
        platform: "telegram",
        published_at: messageData.result?.date
          ? new Date(messageData.result.date * 1000).toISOString()
          : new Date().toISOString(),

        // Engagement
        likes: totalReactions,
        comments: 0,
        shares: messageData.result?.forward_count || 0,
        saves: 0,
        reactions: totalReactions,
        engagement_rate: 0,

        // Reach
        impressions: views,
        reach: chatInfo.result?.member_count || 0,
        unique_impressions: views,

        // Clicks
        clicks: 0,
        link_clicks: 0,
        profile_clicks: 0,
        hashtag_clicks: 0,

        // Audience
        profile_views: 0,
        follower_gain: 0,
        follower_loss: 0,
        new_followers: 0,

        // Video
        video_views: 0,
        video_3s_views: 0,
        video_10s_views: 0,
        video_25s_views: 0,
        video_50s_views: 0,
        video_avg_watch_time: 0,
        video_completion_rate: 0,
        video_retention_graph: null,

        // Platform specific
        reaction_like: 0,
        reaction_love: 0,
        reaction_wow: 0,
        reaction_haha: 0,
        reaction_sad: 0,
        reaction_angry: 0,
        reaction_care: 0,

        // Post info
        permalink: `https://t.me/${chatInfo.result?.username || chatId}/${messageId}`,
        media_type: mediaType,
        media_url:
          messageData.result?.photo?.[messageData.result.photo.length - 1]
            ?.file_id || messageData.result?.video?.file_id,

        raw_response: { chatInfo, reactions, messageData },
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Telegram post data:", error);
      return null;
    }
  }

  // ============ UPDATE PUBLISHED POSTS ============
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
        raw_response: {
          reactions: {
            like: metrics.reaction_like,
            love: metrics.reaction_love,
            wow: metrics.reaction_wow,
            haha: metrics.reaction_haha,
            sad: metrics.reaction_sad,
            angry: metrics.reaction_angry,
          },
          media_type: metrics.media_type,
          permalink: metrics.permalink,
          engagement_rate: metrics.engagement_rate,
        },
      })
      .eq("post_id", postId)
      .eq("platform", metrics.platform);

    if (error) {
      console.error(`Error updating metrics for post ${postId}:`, error);
    }
  }

  // ============ GET ANALYTICS SUMMARY ============
  static async getAnalyticsSummary(userId: string, days: number = 30) {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", userId)
      .gte("published_at", startDate.toISOString());

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

    const { data: engagement } = await supabase
      .from("published_posts")
      .select("*")
      .in("post_id", postIds);

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

    for (const item of engagement || []) {
      summary.total_impressions += item.impressions || 0;
      summary.total_reach += item.reach || 0;
      summary.total_likes += item.engagement_likes || 0;
      summary.total_comments += item.engagement_comments || 0;
      summary.total_shares += item.engagement_shares || 0;
      summary.total_saves += item.engagement_saves || 0;
      summary.total_clicks += item.clicks || 0;

      if (!summary.by_platform[item.platform]) {
        summary.by_platform[item.platform] = {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          clicks: 0,
        };
      }
      summary.by_platform[item.platform].impressions += item.impressions || 0;
      summary.by_platform[item.platform].reach += item.reach || 0;
      summary.by_platform[item.platform].likes += item.engagement_likes || 0;
      summary.by_platform[item.platform].comments +=
        item.engagement_comments || 0;
      summary.by_platform[item.platform].shares += item.engagement_shares || 0;
      summary.by_platform[item.platform].saves += item.engagement_saves || 0;
      summary.by_platform[item.platform].clicks += item.clicks || 0;
    }

    return summary;
  }

  // ============ GET POSTS WITH ENGAGEMENT ============
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
          engagement_likes,
          engagement_comments,
          engagement_shares,
          engagement_saves,
          impressions,
          reach,
          clicks,
          video_views,
          raw_response
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") {
      query = query.eq("published_posts.platform", platform);
    }

    const { data: posts, error } = await query;
    if (error) throw error;
    return posts;
  }

  // ============ GENERATE CSV ============
  static generateCSV(summary: any, posts: any[]): string {
    const rows: string[] = [];

    rows.push(`"SocialHub Analytics Report"`);
    rows.push(`"Generated:",${new Date().toISOString()}`);
    rows.push(``);
    rows.push(`"SUMMARY STATISTICS"`);
    rows.push(`"Total Impressions",${summary.total_impressions}`);
    rows.push(`"Total Reach",${summary.total_reach}`);
    rows.push(`"Total Likes",${summary.total_likes}`);
    rows.push(`"Total Comments",${summary.total_comments}`);
    rows.push(`"Total Shares",${summary.total_shares}`);
    rows.push(`"Total Saves",${summary.total_saves}`);
    rows.push(`"Total Posts",${posts.length}`);
    rows.push(``);
    rows.push(`"PLATFORM BREAKDOWN"`);
    rows.push(
      `"Platform","Impressions","Reach","Likes","Comments","Shares","Saves","Clicks"`,
    );

    for (const [platform, data] of Object.entries(summary.by_platform || {})) {
      rows.push(
        `"${platform}",${(data as any).impressions},${(data as any).reach},${(data as any).likes},${(data as any).comments},${(data as any).shares},${(data as any).saves},${(data as any).clicks}`,
      );
    }
    rows.push(``);
    rows.push(`"POST DETAILS"`);
    rows.push(
      `"Date","Platform","Content","Likes","Comments","Shares","Saves","Impressions","Reach","Clicks"`,
    );

    for (const post of posts) {
      for (const pp of post.published_posts || []) {
        const content = `"${(post.content || "").replace(/"/g, '""').substring(0, 100)}"`;
        rows.push(
          `"${post.published_at?.split("T")[0] || ""}","${pp.platform}",${content},${pp.engagement_likes || 0},${pp.engagement_comments || 0},${pp.engagement_shares || 0},${pp.engagement_saves || 0},${pp.impressions || 0},${pp.reach || 0},${pp.clicks || 0}`,
        );
      }
    }

    return rows.join("\n");
  }
}
