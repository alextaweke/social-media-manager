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

    const { data: templates, error } = await supabase
      .from("post_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("usage_count", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, templates: templates || [] });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
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

    const { name, content, platforms, media_urls, hashtags, category } =
      await request.json();

    const { data: template, error } = await supabase
      .from("post_templates")
      .insert({
        user_id: user.id,
        name,
        content,
        platforms: platforms || [],
        media_urls: media_urls || [],
        hashtags: hashtags || [],
        category: category || "General",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ...updates } = await request.json();

    const { data: template, error } = await supabase
      .from("post_templates")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error updating template:", error);
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
      .from("post_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
