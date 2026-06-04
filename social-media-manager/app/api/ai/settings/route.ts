/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get existing settings
    const { data: settings, error } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116 error

    if (error && error.code !== "PGRST116") throw error;

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          auto_post_enabled: false,
          auto_post_schedule: "daily",
          auto_post_time: "09:00",
          auto_post_platforms: [],
          auto_post_topics: [],
          content_tone: "professional",
          image_generation_enabled: false,
          image_enhancement_enabled: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Error fetching AI settings:", error);
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

    const newSettings = await request.json();

    // First, check if settings exist
    const { data: existingSettings } = await supabase
      .from("ai_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let result;

    if (existingSettings) {
      // Update existing
      result = await supabase
        .from("ai_settings")
        .update({
          ...newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("ai_settings")
        .insert({
          user_id: user.id,
          ...newSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, settings: result.data });
  } catch (error: any) {
    console.error("Error saving AI settings:", error);

    // Handle unique violation gracefully
    if (error.code === "23505") {
      // Try update instead
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const newSettings = await request.json();
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { data, error: updateError } = await supabase
          .from("ai_settings")
          .update({
            ...newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select()
          .single();

        if (!updateError) {
          return NextResponse.json({ success: true, settings: data });
        }
      } catch (retryError) {
        console.error("Retry also failed:", retryError);
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
