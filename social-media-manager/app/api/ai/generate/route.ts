/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    topic,
    platform,
    tone = "professional",
    includeHashtags = true,
    length = "medium",
    additionalInstructions,
  } = await request.json();

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const platformGuidelines = {
    twitter: "Keep it under 280 characters. Use engaging hooks.",
    instagram: "Use line breaks and emojis. Keep paragraphs short.",
    linkedin: "Professional tone. Include value proposition.",
    facebook: "Conversational and engaging. Ask questions.",
  };

  const lengthGuidelines = {
    short: "1-2 sentences",
    medium: "3-5 sentences",
    long: "6-10 sentences",
  };

  const prompt = `Create an engaging social media post for ${platform} about "${topic}".

Guidelines:
- Tone: ${tone}
- Length: ${lengthGuidelines[length as keyof typeof lengthGuidelines]}
- ${platformGuidelines[platform as keyof typeof platformGuidelines]}
- ${includeHashtags ? "Include 3-5 relevant hashtags at the end." : "Do not include hashtags."}
- ${additionalInstructions || "Make it engaging and actionable."}

Format: Return ONLY the post content without any explanations or markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let content = response.text();

    // Clean up the response
    content = content.replace(/```/g, "").trim();

    // Extract hashtags if included
    let hashtags: string[] = [];
    if (includeHashtags) {
      const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
      const matches = content.match(hashtagRegex);
      if (matches) {
        hashtags = matches;
      }
    }

    // Save to AI generations history
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      prompt: `Topic: ${topic}\nPlatform: ${platform}\nTone: ${tone}`,
      generated_content: content,
      platform,
      tone,
      hashtags,
    });

    return NextResponse.json({
      success: true,
      content,
      hashtags,
      wordCount: content.split(" ").length,
      platform,
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate content",
      },
      { status: 500 },
    );
  }
}
