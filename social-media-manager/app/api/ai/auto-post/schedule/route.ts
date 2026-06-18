/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── GET: Fetch auto-post settings ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: queue, error: queueError } = await supabase
      .from("auto_post_queue")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .order("scheduled_for", { ascending: true });

    if (queueError) {
      console.error("Error fetching queue:", queueError);
    }

    return NextResponse.json({
      success: true,
      settings: settings || {
        auto_post_enabled: false,
        auto_post_schedule: "daily",
        auto_post_time: "09:00",
        auto_post_platforms: [],
        auto_post_topics: [],
        content_tone: "professional",
        image_generation_enabled: false,
        image_enhancement_enabled: false,
      },
      queue: queue || [],
    });
  } catch (error: any) {
    console.error("Error fetching auto-post settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Save auto-post settings and schedule posts ──────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled, schedule, time, platforms, topics } = await request.json();

    // Save settings
    const { data: existingSettings } = await supabase
      .from("ai_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let settingsError;

    if (existingSettings) {
      const { error } = await supabase
        .from("ai_settings")
        .update({
          auto_post_enabled: enabled,
          auto_post_schedule: schedule,
          auto_post_time: time,
          auto_post_platforms: platforms,
          auto_post_topics: topics,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      settingsError = error;
    } else {
      const { error } = await supabase.from("ai_settings").insert({
        user_id: user.id,
        auto_post_enabled: enabled,
        auto_post_schedule: schedule,
        auto_post_time: time,
        auto_post_platforms: platforms,
        auto_post_topics: topics,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      settingsError = error;
    }

    if (settingsError) {
      console.error("Error saving settings:", settingsError);
      return NextResponse.json(
        { error: settingsError.message },
        { status: 500 },
      );
    }

    if (enabled) {
      // Clear old pending auto posts
      await supabase
        .from("auto_post_queue")
        .update({ status: "cancelled" })
        .eq("user_id", user.id)
        .in("status", ["pending", "processing"]);

      // Generate and schedule new posts
      await generateAndSchedulePosts(
        user.id,
        schedule,
        time,
        platforms,
        topics,
      );
    }

    return NextResponse.json({
      success: true,
      message: enabled
        ? "Auto-posting enabled and scheduled"
        : "Auto-posting disabled",
    });
  } catch (error: any) {
    console.error("Error in auto-post schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Helper: Generate and schedule posts ────────────────────────────────────

async function generateAndSchedulePosts(
  userId: string,
  schedule: string,
  time: string,
  platforms: string[],
  topics: string[],
) {
  const supabase = await createClient();
  // ✅ FIX: Use the correct model name - gemini-1.5-pro instead of gemini-pro
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const scheduleDates = calculateScheduleDates(schedule, time);

  let scheduledCount = 0;

  for (const date of scheduleDates) {
    for (const topic of topics) {
      try {
        // Generate content using AI with the correct model
        const prompt = `Create a short, engaging social media post about "${topic}". 
        Make it interesting, include relevant emojis, and keep it under 280 characters.
        Return ONLY the post content, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text().trim();

        const { error } = await supabase.from("auto_post_queue").insert({
          user_id: userId,
          content: content,
          platforms: platforms,
          scheduled_for: date.toISOString(),
          status: "pending",
          created_at: new Date().toISOString(),
        });

        if (!error) {
          scheduledCount++;
        }
      } catch (error) {
        console.error(`Error generating post for topic ${topic}:`, error);
      }
    }
  }

  console.log(`Scheduled ${scheduledCount} auto-posts for user ${userId}`);
  return scheduledCount;
}

// ─── Helper: Calculate schedule dates ───────────────────────────────────────

function calculateScheduleDates(schedule: string, time: string): Date[] {
  const dates: Date[] = [];
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();

  switch (schedule) {
    case "daily":
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        date.setHours(hours, minutes, 0, 0);
        if (date > now) {
          dates.push(date);
        }
      }
      break;
    case "weekly":
      for (let i = 1; i <= 4; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i * 7);
        date.setHours(hours, minutes, 0, 0);
        if (date > now) {
          dates.push(date);
        }
      }
      break;
    case "custom":
      for (let i = 1; i <= 3; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        date.setHours(hours, minutes, 0, 0);
        if (date > now) {
          dates.push(date);
        }
      }
      break;
    default:
      const date = new Date();
      date.setDate(now.getDate() + 1);
      date.setHours(hours, minutes, 0, 0);
      if (date > now) {
        dates.push(date);
      }
  }

  return dates;
}
