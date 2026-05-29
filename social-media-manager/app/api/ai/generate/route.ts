import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topic, platform, tone, includeHashtags } = await request.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Create an engaging social media post for ${platform} about "${topic}". 
    Tone: ${tone || "professional and engaging"}. 
    ${includeHashtags ? "Include 5 relevant hashtags." : ""}
    Keep it concise and platform-appropriate.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  return NextResponse.json({ content, platform, generatedAt: new Date() });
}
