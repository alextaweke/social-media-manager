/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Note: Gemini doesn't generate images, so we'll use a prompt to suggest images
// For actual image generation, you'd need Replicate, Stability AI, or DALL-E

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, style, postId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    // For demo, we'll use placeholder images from Unsplash based on the prompt
    // In production, integrate with Replicate, Stability AI, or DALL-E

    const searchQuery = encodeURIComponent(prompt);
    const imageUrl = `https://source.unsplash.com/featured/800x600?${searchQuery}&sig=${Date.now()}`;

    // For actual AI image generation, uncomment this and add your API key:
    /*
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          negative_prompt: "blurry, bad quality, distorted",
          width: 1024,
          height: 768,
        }
      }
    );
    
    const imageUrl = output[0];
    */

    // Save to database
    const { data: aiImage, error } = await supabase
      .from("ai_images")
      .insert({
        user_id: user.id,
        prompt: prompt,
        image_url: imageUrl,
        used_in_post_id: postId || null,
        style: style || "photorealistic",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      image: {
        id: aiImage.id,
        url: imageUrl,
        prompt: prompt,
      },
    });
  } catch (error: any) {
    console.error("AI image generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
