/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`Facebook proxy attempt ${attempt} failed:`, {
        message: error?.message,
        code: error?.cause?.code,
        errno: error?.cause?.errno,
      });

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("Facebook API request failed");
}

function getSafeUrlForLog(url: string) {
  const safeUrl = new URL(url);
  if (safeUrl.searchParams.has("access_token")) {
    safeUrl.searchParams.set("access_token", "***hidden***");
  }
  return safeUrl.toString();
}

export async function POST(request: NextRequest) {
  try {
    const {
      endpoint,
      method = "GET",
      data,
      accessToken,
    } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 },
      );
    }

    let url = `https://graph.facebook.com/v25.0/${endpoint}`;

    // Build query parameters
    const params = new URLSearchParams();
    if (accessToken) {
      params.append("access_token", accessToken);
    }

    if (method === "GET" && data) {
      Object.keys(data).forEach((key) => {
        params.append(key, data[key]);
      });
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log("Facebook Proxy Request:", {
      url: getSafeUrlForLog(url),
      method,
    });

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    if (method === "POST" && data) {
      const formData = new URLSearchParams();
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
      if (accessToken) {
        formData.append("access_token", accessToken);
      }
      fetchOptions.body = formData.toString();
    }

    const response = await fetchWithRetry(url, fetchOptions);
    const responseData = await response.json();

    console.log("Facebook Proxy Response Status:", response.status);

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Facebook Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to connect to Facebook API",
        details: error.cause?.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint");
    const accessToken = searchParams.get("accessToken");

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 },
      );
    }

    let url = `https://graph.facebook.com/v25.0/${endpoint}`;
    const params = new URLSearchParams();

    if (accessToken) {
      params.append("access_token", accessToken);
    }

    // Add all other params
    searchParams.forEach((value, key) => {
      if (key !== "endpoint" && key !== "accessToken") {
        params.append(key, value);
      }
    });

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log("Facebook Proxy GET Request:", getSafeUrlForLog(url));

    const response = await fetchWithRetry(url, {});
    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data,
    });
  } catch (error: any) {
    console.error("Facebook Proxy GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
