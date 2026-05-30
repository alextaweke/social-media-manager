/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// Telegram API mirrors (try different endpoints)
const TELEGRAM_MIRRORS = ["https://api.telegram.org", "https://tg-api.i-m.dev"];
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed`);
      console.error("Message:", error?.message);
      console.error("Code:", error?.cause?.code);
      console.error("Errno:", error?.cause?.errno);
      console.error("Cause:", error?.cause);
      if (i === retries - 1) throw error;
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("All retries failed");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, method, data } = body;

    if (!botToken || !method) {
      return NextResponse.json(
        { error: "Bot token and method are required" },
        { status: 400 },
      );
    }

    const cleanToken = botToken.trim();
    let lastError: Error | null = null;

    // Try each mirror
    for (const mirror of TELEGRAM_MIRRORS) {
      try {
        const apiUrl = `${mirror}/bot${cleanToken}/${method}`;
        console.log(`Trying mirror: ${mirror}`);

        const response = await fetchWithRetry(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data || {}),
        });

        const result = await response.json();

        if (response.ok && result.ok) {
          return NextResponse.json({
            success: true,
            result: result.result,
            usedMirror: mirror,
          });
        }

        if (result.description) {
          console.log(`Mirror ${mirror} returned error:`, result.description);
        }
      } catch (error: any) {
        lastError = error;
        console.log(`Mirror ${mirror} failed:`, error.message);
        continue;
      }
    }

    throw lastError || new Error("All Telegram API mirrors failed");
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to connect to Telegram API",
        details:
          "Network connection to Telegram API failed. Please check your internet connection or try using a VPN.",
      },
      { status: 500 },
    );
  }
}
