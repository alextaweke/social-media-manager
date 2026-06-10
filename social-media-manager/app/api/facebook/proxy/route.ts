/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return res;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const {
      endpoint,
      method = "POST",
      data,
      accessToken,
    } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Facebook access token" },
        { status: 400 },
      );
    }

    console.log("Facebook proxy request:", {
      endpoint,
      tokenPreview: accessToken.slice(0, 15),
    });

    let url = `https://graph.facebook.com/v25.0/${endpoint}`;

    const params = new URLSearchParams();
    params.append("access_token", accessToken);

    if (method === "GET" && data) {
      Object.keys(data).forEach((k) => params.append(k, data[k]));
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    if (method === "POST" && data) {
      const body = new URLSearchParams();
      Object.keys(data).forEach((k) => body.append(k, data[k]));

      body.append("access_token", accessToken);
      options.body = body.toString();
    }

    const response = await fetchWithRetry(url, options);
    const result = await response.json();

    if (!response.ok) {
      console.error("Facebook API error:", result);
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: result,
    });
  } catch (error: any) {
    console.error("Facebook proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
