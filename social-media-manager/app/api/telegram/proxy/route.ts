/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_MIRRORS = ["https://api.telegram.org"];

async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { botToken, method, data } = await request.json();

    if (!botToken || !method) {
      return NextResponse.json(
        { success: false, error: "Missing botToken or method" },
        { status: 400 },
      );
    }

    const url = `https://api.telegram.org/bot${botToken}/${method}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data || {}),
    });

    const text = await response.text();

    let result;
    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Telegram returned invalid JSON",
          raw: text,
        },
        { status: 500 },
      );
    }

    if (!response.ok || !result?.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result?.description || "Telegram API error",
          raw: result,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      result: result.result,
    });
  } catch (error: any) {
    console.error("Telegram proxy error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
