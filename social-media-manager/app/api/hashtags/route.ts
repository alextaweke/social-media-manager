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
    const category = searchParams.get("category");

    let query = supabase
      .from("hashtags")
      .select("*")
      .eq("user_id", user.id)
      .order("usage_count", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: hashtags, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, hashtags: hashtags || [] });
  } catch (error: any) {
    console.error("Error fetching hashtags:", error);
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

    const { tag, category } = await request.json();

    // Remove # if present
    const cleanTag = tag.replace(/^#/, "").toLowerCase();

    const { data: hashtag, error } = await supabase
      .from("hashtags")
      .insert({
        user_id: user.id,
        tag: cleanTag,
        category: category || "General",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, hashtag });
  } catch (error: any) {
    console.error("Error creating hashtag:", error);
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

    const { id } = await request.json();

    const { error } = await supabase
      .from("hashtags")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting hashtag:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get trending/suggested hashtags
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    // Increment usage count
    const { error } = await supabase
      .from("hashtags")
      .update({ usage_count: supabase.rpc("increment", { row_id: id }) })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating hashtag:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
