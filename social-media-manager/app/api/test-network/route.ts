/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/test-network/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe",
      {
        signal: AbortSignal.timeout(30000),
      },
    );

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message,
      code: error?.cause?.code,
      cause: String(error?.cause),
    });
  }
}
