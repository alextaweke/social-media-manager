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

    // ✅ IMPORTANT: use form-data format, NOT JSON
    const formData = new URLSearchParams();

    if (data && typeof data === "object") {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const text = await response.text();

    console.log("Telegram status:", response.status);
    console.log("Telegram raw response:", text);

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "Empty response from Telegram API",
        },
        { status: 500 },
      );
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON from Telegram",
          raw: text,
        },
        { status: 500 },
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.description,
          code: result.error_code,
          raw: result,
        },
        { status: 200 },
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
