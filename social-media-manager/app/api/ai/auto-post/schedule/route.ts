/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    let autoPostQuery = supabase
      .from("auto_post_queue")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"]);

    if (date) {
      autoPostQuery = autoPostQuery.eq("scheduled_for", date);
    }

    if (startDate && endDate) {
      autoPostQuery = autoPostQuery
        .gte("scheduled_for", startDate)
        .lte("scheduled_for", endDate);
    }

    const { data: autoPosts, error: autoPostError } = await autoPostQuery.order(
      "scheduled_for",
      { ascending: true },
    );

    if (autoPostError) throw autoPostError;

    const normalizedAutoPosts = (autoPosts || []).map((post) => ({
      id: post.id,
      content: post.content,
      platforms: post.platforms || [],
      scheduled_for: post.scheduled_for,
      status: post.status,
      source: "auto",
    }));

    const normalizedPosts = (posts || []).map((post) => ({
      ...post,
      platforms: Array.isArray(post.platforms)
        ? post.platforms
        : Array.isArray(post.platform_specific?.platforms)
          ? post.platform_specific.platforms
          : [],
      source: "manual",
    }));

    return NextResponse.json({
      success: true,
      posts: [...normalizedPosts, ...normalizedAutoPosts].sort(
        (a, b) =>
          new Date(a.scheduled_for).getTime() -
          new Date(b.scheduled_for).getTime(),
      ),
    });
  } catch (error: any) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

      tags,
    } = await request.json();

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        media_urls: media_urls || [],
        platforms,
        status: "scheduled",
        scheduled_for,
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // `source` tells us which table owns this post:
    //   "auto"   → cancel row in auto_post_queue only
    //   "manual" → delete from posts + content_queue
    const { postId, source } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 },
      );
    }

    if (source === "auto") {
      const { error: queueError } = await supabase
        .from("auto_post_queue")
        .update({ status: "cancelled" })
        .eq("id", postId)
        .eq("user_id", user.id);

      if (queueError) throw queueError;
    } else {
      // Remove platform queue entries first (FK constraint)
      const { error: contentQueueError } = await supabase
        .from("content_queue")
        .delete()
        .eq("post_id", postId);

      if (contentQueueError) throw contentQueueError;

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
