/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { InstagramClient } from "@/lib/social/clients/instagram";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
import { TelegramClient } from "@/lib/social/clients/telegram";
import { FacebookClient } from "@/lib/social/clients/facebook";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      content,
      platforms,
      mediaUrls,
      scheduleFor,
      aiGenerated,
      aiPrompt,
    } = body;

    console.log("Received post request:", {
      content: content?.substring(0, 100),
      platforms,
      mediaUrls: mediaUrls?.length || 0,
      scheduleFor,
    });

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "At least one platform is required" },
        { status: 400 },
      );
    }

    // Create post record
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        media_urls: mediaUrls || [],
        ai_generated: aiGenerated || false,
        ai_prompt: aiPrompt,
        status: scheduleFor ? "scheduled" : "processing",
        scheduled_for: scheduleFor || null,
      })
      .select()
      .single();

    if (postError) {
      console.error("Post creation error:", postError);
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    const results = [];

    // If scheduled, just create queue items
    if (scheduleFor) {
      for (const platform of platforms) {
        await supabase.from("content_queue").insert({
          post_id: post.id,
          platform,
          scheduled_for: scheduleFor,
        });
      }

      return NextResponse.json({
        success: true,
        postId: post.id,
        scheduled: true,
        scheduledFor: scheduleFor,
      });
    }

    // Publish immediately to selected platforms
    for (const platform of platforms) {
      try {
        console.log(`Processing platform: ${platform}`);

        // Get user's social account for this platform
        const { data: socialAccount, error: accountError } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .eq("is_active", true)
          .single();

        if (accountError || !socialAccount) {
          console.error(`Account error for ${platform}:`, accountError);
          throw new Error(`${platform} account not connected`);
        }

        console.log(`Found account for ${platform}:`, {
          platform_user_id: socialAccount.platform_user_id,
          hasToken: !!socialAccount.access_token,
        });

        let result;
        switch (platform) {
          case "twitter":
            const twitter = new TwitterClient({
              accessToken: socialAccount.access_token,
            });
            result = await twitter.post(content, mediaUrls);
            break;
          case "instagram":
            const instagram = new InstagramClient(
              socialAccount.access_token,
              socialAccount.platform_user_id,
            );
            result = await instagram.post(content, mediaUrls?.[0]);
            break;
          case "linkedin":
            const linkedin = new LinkedInClient(socialAccount.access_token);
            result = await linkedin.post(content, mediaUrls?.[0]);
            break;
          case "telegram":
            console.log("Creating Telegram client");
            const telegram = new TelegramClient(
              socialAccount.access_token,
              socialAccount.platform_user_id,
            );
            if (mediaUrls && mediaUrls.length > 0) {
              result = await telegram.sendPhoto(mediaUrls[0], content);
            } else {
              result = await telegram.sendMessage(content);
            }
            break;
          case "facebook":
            console.log(
              "Facebook posting - Page ID:",
              socialAccount.platform_user_id,
            );
            const facebook = new FacebookClient(
              socialAccount.access_token,
              socialAccount.platform_user_id,
            );
            if (mediaUrls && mediaUrls.length > 0) {
              result = await facebook.post(content, mediaUrls[0]);
            } else {
              result = await facebook.post(content);
            }
            console.log("Facebook post successful:", result.id);
            break;
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }

        // Store platform_post_id in posts table for analytics
        await supabase
          .from("posts")
          .update({ platform_post_id: result.id })
          .eq("id", post.id);

        // Record published post
        await supabase.from("published_posts").insert({
          post_id: post.id,
          platform,
          platform_post_id: result.id,
          platform_post_url: result.url,
          published_at: new Date(),
        });

        results.push({
          platform,
          success: true,
          postId: result.id,
          url: result.url,
        });
      } catch (error: any) {
        console.error(`Error posting to ${platform}:`, error);
        results.push({ platform, success: false, error: error.message });
      }
    }

    // Update post status
    const hasFailures = results.some((r) => !r.success);
    const hasSuccess = results.some((r) => r.success);

    let finalStatus = "failed";
    if (hasSuccess && !hasFailures) {
      finalStatus = "published";
    } else if (hasSuccess && hasFailures) {
      finalStatus = "partially_published";
    }

    await supabase
      .from("posts")
      .update({
        status: finalStatus,
        published_at: hasSuccess ? new Date() : null,
        error_message: hasFailures
          ? results
              .filter((r) => !r.success)
              .map((r) => `${r.platform}: ${r.error}`)
              .join(", ")
          : null,
      })
      .eq("id", post.id);

    // Return appropriate response
    if (!hasSuccess) {
      return NextResponse.json(
        { error: "All platforms failed", details: results },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      results,
      partial: hasFailures,
    });
  } catch (error: any) {
    console.error("Unexpected error in post API:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
