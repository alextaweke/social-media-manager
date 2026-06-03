/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 10MB" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, GIF, WEBP, MP4" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop();
    const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(filename);

    const fileUrl = urlData.publicUrl;

    // Determine file type
    let fileType = "image";
    if (file.type.startsWith("video")) fileType = "video";
    else if (file.type.includes("gif")) fileType = "gif";

    // Save to database
    const { data: media, error: dbError } = await supabase
      .from("media_library")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: fileUrl,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        storage_path: filename,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: Delete from storage if DB insert fails
      await supabase.storage.from("media").remove([filename]);
      console.error("Database error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: media.id,
        url: fileUrl,
        name: file.name,
        type: fileType,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
