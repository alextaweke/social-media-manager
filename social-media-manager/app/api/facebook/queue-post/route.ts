/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Create a table for queued Facebook posts if not exists
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId, accessToken, content } = await request.json();

    // Store in queue table
    const { data, error } = await supabase
      .from("facebook_post_queue")
      .insert({
        user_id: user.id,
        page_id: pageId,
        access_token: accessToken,
        content: content,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Create table if doesn't exist
      if (error.code === "42P01") {
        await createQueueTable();
        // Retry insert
        const retry = await supabase
          .from("facebook_post_queue")
          .insert({
            user_id: user.id,
            page_id: pageId,
            access_token: accessToken,
            content: content,
            status: "pending",
          })
          .select()
          .single();

        if (retry.error) throw retry.error;
        return NextResponse.json({ success: true, queueId: retry.data.id });
      }
      throw error;
    }

    return NextResponse.json({ success: true, queueId: data.id });
  } catch (error: any) {
    console.error("Queue error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function createQueueTable() {
  const supabase = await createClient();
  const sql = `
    CREATE TABLE IF NOT EXISTS facebook_post_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      page_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      retry_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await supabase.rpc("exec_sql", { query: sql });
}
