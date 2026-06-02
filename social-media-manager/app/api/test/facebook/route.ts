/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { FacebookClient } from "@/lib/social/clients/facebook";

export async function POST(request: NextRequest) {
  try {
    const { pageId, accessToken, content, imageUrl } = await request.json();

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: "Page ID and access token are required" },
        { status: 400 },
      );
    }

    const client = new FacebookClient(accessToken, pageId);

    // Test getting page info
    const pageInfo = await client.getPageInfo();
    console.log("Page info:", pageInfo);

    // Test posting
    const result = await client.post(
      content || "Test post from SocialHub API!",
      imageUrl,
    );

    return NextResponse.json({
      success: true,
      pageInfo,
      postResult: result,
    });
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
