/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { TelegramClient } from "@/lib/social/clients/telegram";
import { InstagramClient } from "@/lib/social/clients/instagram";
import { LinkedInClient } from "@/lib/social/clients/linkedin";

// This endpoint should be called by a cron job (e.g., every 5 minutes)
export async function POST() {
  try {
    const supabase = await createClient();

    // Get pending auto posts that are due
    const { data: pendingPosts, error } = await supabase
      .from("auto_post_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString());

    if (error) throw error;

    console.log(
      `Found ${pendingPosts?.length || 0} pending auto-posts to process`,
    );

    if (!pendingPosts || pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No pending posts",
      });
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const post of pendingPosts) {
      // Update status to processing
      await supabase
        .from("auto_post_queue")
        .update({
          status: "processing",
          processed_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      // Get user's social accounts
      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", post.user_id)
        .in("platform", post.platforms)
        .eq("is_active", true);

      if (!socialAccounts || socialAccounts.length === 0) {
        console.error(`No social accounts found for user ${post.user_id}`);
        await supabase
          .from("auto_post_queue")
          .update({
            status: "failed",
            error_message: "No connected social accounts found",
          })
          .eq("id", post.id);
        failedCount++;
        continue;
      }

      const results = [];

      for (const account of socialAccounts) {
        try {
          let result;
          console.log(
            `Publishing auto-post to ${account.platform} for post ${post.id}`,
          );

          switch (account.platform) {
            case "twitter":
              const twitter = new TwitterClient({
                accessToken: account.access_token,
              });
              result = await twitter.post(
                post.content,
                post.image_url ? [post.image_url] : [],
              );
              break;

            case "facebook":
              const facebook = new FacebookClient(
                account.access_token,
                account.platform_user_id,
              );
              result = await facebook.post(post.content, post.image_url);
              break;

            case "instagram":
              const instagram = new InstagramClient(
                account.access_token,
                account.platform_user_id,
              );
              result = await instagram.post(post.content, post.image_url);
              break;

            case "linkedin":
              const linkedin = new LinkedInClient(account.access_token);
              result = await linkedin.post(post.content, post.image_url);
              break;

            case "telegram":
              // ✅ FIX: Use access_token as bot token and platform_user_id as chat_id
              const telegram = new TelegramClient(
                account.access_token, // Use access_token as bot token
                account.platform_user_id, // Use platform_user_id as chat_id
              );
              if (post.image_url) {
                result = await telegram.sendPhoto(post.image_url, post.content);
              } else {
                result = await telegram.sendMessage(post.content);
              }
              break;

            default:
              throw new Error(`Unsupported platform: ${account.platform}`);
          }

          results.push({
            platform: account.platform,
            success: true,
            postId: result.id,
            url: result.url,
          });

          // Record in published_posts
          await supabase.from("published_posts").insert({
            post_id: post.id,
            platform: account.platform,
            platform_post_id: result.id,
            platform_post_url: result.url,
            published_at: new Date().toISOString(),
            date: new Date().toISOString().split("T")[0],
            engagement_likes: 0,
            engagement_comments: 0,
            engagement_shares: 0,
            engagement_saves: 0,
            impressions: 0,
            reach: 0,
            clicks: 0,
            video_views: 0,
          });
        } catch (error: any) {
          console.error(`Error publishing to ${account.platform}:`, error);
          results.push({
            platform: account.platform,
            success: false,
            error: error.message,
          });
        }
      }

      const hasFailures = results.some((r) => !r.success);
      const hasSuccess = results.some((r) => r.success);

      let finalStatus = "failed";
      if (hasSuccess && !hasFailures) {
        finalStatus = "completed";
        processedCount++;
      } else if (hasSuccess && hasFailures) {
        finalStatus = "completed"; // Partial success counts as completed
        processedCount++;
      } else {
        failedCount++;
      }

      await supabase
        .from("auto_post_queue")
        .update({
          status: finalStatus,
          error_message: hasFailures
            ? results
                .filter((r) => !r.success)
                .map((r) => `${r.platform}: ${r.error}`)
                .join(", ")
            : null,
        })
        .eq("id", post.id);
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      failed: failedCount,
      total: pendingPosts.length,
    });
  } catch (error: any) {
    console.error("Auto-post processor error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
