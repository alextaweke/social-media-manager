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

    const token = botToken.trim();

    for (const mirror of TELEGRAM_MIRRORS) {
      try {
        const url = `${mirror}/bot${token}/${method}`;

        // ✅ FIX: use form-data instead of JSON
        const form = new URLSearchParams();

        if (data) {
          Object.entries(data).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              form.append(k, String(v));
            }
          });
        }

        const response = await fetchWithRetry(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        });

        const text = await response?.text();

        console.log("Telegram status:", response?.status);
        console.log("Telegram response:", text);

        // ✅ SAFE PARSING
        if (!text) {
          throw new Error("Empty response from Telegram");
        }

        const result = JSON.parse(text);

        if (response?.ok && result.ok) {
          return NextResponse.json({
            success: true,
            result: result.result,
            usedMirror: mirror,
          });
        }

        return NextResponse.json(
          {
            success: false,
            error: result.description || "Telegram API error",
          },
          { status: 400 },
        );
      } catch (err) {
        console.log(`Mirror failed: ${mirror}`, err);
      }
    }

    return NextResponse.json(
      { success: false, error: "All Telegram mirrors failed" },
      { status: 500 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Telegram proxy error",
      },
      { status: 500 },
    );
  }
}
