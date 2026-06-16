/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/facebook-live/route.ts

import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/analytics-service";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, postId } = await request.json();

    if (!accessToken || !postId) {
      return NextResponse.json(
        {
          error: "accessToken and postId are required",
        },
        { status: 400 },
      );
    }

    const metrics = await AnalyticsService.fetchFacebookPostData(
      accessToken,
      postId,
    );

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }
}
