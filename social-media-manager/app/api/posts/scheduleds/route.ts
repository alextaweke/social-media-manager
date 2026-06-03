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

    return NextResponse.json({ success: true, posts: posts || [] });
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
      is_recurring,
      recurring_pattern,
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
        is_recurring: is_recurring || false,
        recurring_pattern,
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

    const { postId } = await request.json();

    // Delete post and related queue entries
    await supabase.from("content_queue").delete().eq("post_id", postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting scheduled post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
