/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get media record
    const { data: media, error: fetchError } = await supabase
      .from("media_library")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), "public", media.file_url);

    try {
      await unlink(filePath);
    } catch (err) {
      console.error("File deletion error:", err);
    }

    // Delete from database
    const { error } = await supabase
      .from("media_library")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
