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

    const { text, platform, tone, action } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = "";
    let enhancedText = "";

    switch (action) {
      case "enhance":
        prompt = `Enhance this social media post for ${platform || "general"} platform. 
        Tone: ${tone || "professional and engaging"}.
        Make it more compelling, add emojis where appropriate, and optimize for engagement.
        
        Original text: "${text}"
        
        Return ONLY the enhanced text without explanations.`;
        break;

      case "improve_grammar":
        prompt = `Fix grammar and improve readability of this text while keeping the same meaning:
        "${text}"
        
        Return ONLY the corrected text.`;
        break;

      case "make_shorter":
        prompt = `Make this text shorter and more concise for social media (max 200 characters):
        "${text}"
        
        Return ONLY the shortened text.`;
        break;

      case "make_longer":
        prompt = `Expand this text with more details and value (add 2-3 sentences):
        "${text}"
        
        Return ONLY the expanded text.`;
        break;

      case "add_hashtags":
        prompt = `Generate 5-7 relevant hashtags for this content:
        "${text}"
        
        Return ONLY the hashtags separated by spaces.`;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    enhancedText = response.text().trim();

    // Save enhancement to database
    await supabase.from("ai_enhancements").insert({
      user_id: user.id,
      original_text: text,
      enhanced_text: enhancedText,
      platform: platform || "general",
      tone: tone || "professional",
    });

    return NextResponse.json({
      success: true,
      original: text,
      enhanced: enhancedText,
      action,
    });
  } catch (error: any) {
    console.error("AI enhancement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
