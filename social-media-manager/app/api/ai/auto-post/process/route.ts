/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { TelegramClient } from "@/lib/social/clients/telegram";

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

    for (const post of pendingPosts || []) {
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
        .in("platform", post.platforms);

      const results = [];

      for (const account of socialAccounts || []) {
        try {
          let result;
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
            case "telegram":
              const telegram = new TelegramClient(
                account.bot_token,
                account.chat_id,
                // Pass access token for Telegram API calls
              );
              result = await telegram.sendMessage(post.content);
              break;
          }
          results.push({ platform: account.platform, success: true, result });
        } catch (error: any) {
          results.push({
            platform: account.platform,
            success: false,
            error: error.message,
          });
        }
      }

      const hasFailures = results.some((r) => !r.success);

      await supabase
        .from("auto_post_queue")
        .update({
          status: hasFailures ? "failed" : "completed",
          error_message: hasFailures
            ? JSON.stringify(results.filter((r) => !r.success))
            : null,
        })
        .eq("id", post.id);
    }

    return NextResponse.json({
      success: true,
      processed: pendingPosts?.length || 0,
    });
  } catch (error: any) {
    console.error("Auto-post processor error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
