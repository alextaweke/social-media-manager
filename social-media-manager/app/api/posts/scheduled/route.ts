/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ─── GET: Fetch scheduled posts ──────────────────────────────────────────────

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
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // ── Fetch manual scheduled posts ──
    let query = supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "processing"]);

    if (date) {
      query = query.eq("scheduled_for", date);
    }
    if (startDate && endDate) {
      query = query
        .gte("scheduled_for", startDate)
        .lte("scheduled_for", endDate);
    }

    const { data: posts, error } = await query.order("scheduled_for", {
      ascending: true,
    });
    if (error) throw error;

    // ── Fetch auto-scheduled posts ──
    let autoQuery = supabase
      .from("auto_post_queue")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"]);

    if (date) {
      autoQuery = autoQuery.eq("scheduled_for", date);
    }
    if (startDate && endDate) {
      autoQuery = autoQuery
        .gte("scheduled_for", startDate)
        .lte("scheduled_for", endDate);
    }

    const { data: autoPosts, error: autoError } = await autoQuery.order(
      "scheduled_for",
      { ascending: true },
    );
    if (autoError) throw autoError;

    // ── Normalize responses ──
    const normalizedPosts = (posts || []).map((post) => ({
      ...post,
      platforms: Array.isArray(post.platforms)
        ? post.platforms
        : Array.isArray(post.platform_specific?.platforms)
          ? post.platform_specific.platforms
          : [],
      source: "manual",
    }));

    const normalizedAutoPosts = (autoPosts || []).map((post) => ({
      id: post.id,
      content: post.content,
      platforms: post.platforms || [],
      scheduled_for: post.scheduled_for,
      status: post.status,
      source: "auto",
      media_urls: post.image_url ? [post.image_url] : [],
    }));

    // ── Combine and sort by date ──
    const allPosts = [...normalizedPosts, ...normalizedAutoPosts].sort(
      (a, b) =>
        new Date(a.scheduled_for).getTime() -
        new Date(b.scheduled_for).getTime(),
    );

    return NextResponse.json({ success: true, posts: allPosts });
  } catch (error: any) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Create a new scheduled post ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      content,
      platforms,
      scheduled_for,
      media_urls,
      is_recurring,
      recurring_pattern,
      tags,
    } = await request.json();

    // Validate required fields
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
    if (!scheduled_for) {
      return NextResponse.json(
        { error: "Scheduled date is required" },
        { status: 400 },
      );
    }

    // Validate scheduled date is in the future
    if (new Date(scheduled_for) < new Date()) {
      return NextResponse.json(
        { error: "Scheduled date must be in the future" },
        { status: 400 },
      );
    }

    // Create post record
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        media_urls: media_urls || [],
        platforms,
        status: "scheduled",
        scheduled_for,
        is_recurring: is_recurring || false,
        recurring_pattern: recurring_pattern || null,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Create queue entries for each platform
    for (const platform of platforms) {
      await supabase.from("content_queue").insert({
        post_id: post.id,
        platform,
        scheduled_for,
        status: "pending",
      });
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Error scheduling post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Cancel a scheduled post ────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId, source } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 },
      );
    }

    if (source === "auto") {
      // Cancel auto-scheduled post
      const { error: queueError } = await supabase
        .from("auto_post_queue")
        .update({ status: "cancelled" })
        .eq("id", postId)
        .eq("user_id", user.id);

      if (queueError) throw queueError;
    } else {
      // Delete manual scheduled post
      // First, delete content queue entries (foreign key constraint)
      const { error: contentQueueError } = await supabase
        .from("content_queue")
        .delete()
        .eq("post_id", postId);

      if (contentQueueError) throw contentQueueError;

      // Then delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting scheduled post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
