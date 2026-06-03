/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    const files = formData.getAll("files") as File[];
    const uploadedFiles = [];

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", user.id);
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const ext = path.extname(file.name);
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Save file
      await writeFile(filepath, buffer);

      // Determine file type
      let fileType = "image";
      if (file.type.startsWith("video")) fileType = "video";
      else if (file.type.includes("gif")) fileType = "gif";

      const fileUrl = `/uploads/${user.id}/${filename}`;

      // Save to database
      const { data: media, error } = await supabase
        .from("media_library")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileUrl,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (error) throw error;

      uploadedFiles.push(media);
    }

    return NextResponse.json({ success: true, files: uploadedFiles });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
