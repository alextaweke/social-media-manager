/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from("ai_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSettings) {
      // Update existing
      const { error: settingsError } = await supabase
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

      if (settingsError) throw settingsError;
    } else {
      // Insert new
      const { error: settingsError } = await supabase
        .from("ai_settings")
        .insert({
          user_id: user.id,
          auto_post_enabled: enabled,
          auto_post_schedule: schedule,
          auto_post_time: time,
          auto_post_platforms: platforms,
          auto_post_topics: topics,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (settingsError) throw settingsError;
    }

    if (enabled) {
      // Clear old pending auto posts first
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error scheduling auto posts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateAndSchedulePosts(
  userId: string,
  schedule: string,
  time: string,
  platforms: string[],
  topics: string[],
) {
  const supabase = await createClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Calculate schedule dates
  const scheduleDates = calculateScheduleDates(schedule, time);

  for (const date of scheduleDates) {
    for (const topic of topics) {
      try {
        // Generate content using AI
        const prompt = `Create a short, engaging social media post about "${topic}". 
        Make it interesting, include relevant emojis, and keep it under 280 characters.
        Return ONLY the post content, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text().trim();

        // Add to queue
        await supabase.from("auto_post_queue").insert({
          user_id: userId,
          content: content,
          platforms: platforms,
          scheduled_for: date.toISOString(),
          status: "pending",
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error generating post for topic ${topic}:`, error);
      }
    }
  }
}

function calculateScheduleDates(schedule: string, time: string): Date[] {
  const dates: Date[] = [];
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();

  switch (schedule) {
    case "daily":
      // Schedule for next 7 days
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        date.setHours(hours, minutes, 0, 0);
        // Only add if in the future
        if (date > now) {
          dates.push(date);
        }
      }
      break;
    case "weekly":
      // Schedule for next 4 weeks on same day
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
      // Schedule for tomorrow
      const date = new Date();
      date.setDate(now.getDate() + 1);
      date.setHours(hours, minutes, 0, 0);
      if (date > now) {
        dates.push(date);
      }
      break;
  }

  return dates;
}
