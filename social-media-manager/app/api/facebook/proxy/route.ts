/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return response;
    } catch (error) {
      lastError = error;

      console.error(
        `Facebook request failed (attempt ${i + 1}/${retries}):`,
        error,
      );

      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { endpoint, method = "POST", data, accessToken } = body;

    if (!endpoint) {
      return NextResponse.json(
        {
          success: false,
          error: "Endpoint is required",
        },
        { status: 400 },
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Facebook access token is required",
        },
        { status: 400 },
      );
    }

    console.log("Facebook proxy request:", {
      endpoint,
      method,
      tokenPreview: `${accessToken.slice(0, 15)}...`,
    });

    let url = `https://graph.facebook.com/v25.0/${endpoint}`;

    const queryParams = new URLSearchParams();

    if (method === "GET") {
      queryParams.append("access_token", accessToken);

      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }

      url += `?${queryParams.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    if (method === "POST") {
      const formData = new URLSearchParams();

      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
      }

      formData.append("access_token", accessToken);

      options.body = formData.toString();
    }

    console.log("Facebook URL:", url);

    if (options.body) {
      console.log("Facebook Body:", options.body);
    }

    const response = await fetchWithRetry(url, options);

    const responseText = await response.text();

    console.log("Facebook Status:", response.status);
    console.log("Facebook Raw Response:", responseText);

    // Handle empty response safely
    if (!responseText || !responseText.trim()) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: "Facebook returned an empty response",
        },
        { status: 500 },
      );
    }

    let result: any;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Facebook response:", parseError);

      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: "Facebook returned invalid JSON",
          rawResponse: responseText,
        },
        { status: 500 },
      );
    }

    if (!response.ok) {
      console.error("Facebook API Error:", result);

      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error:
            result?.error?.message ||
            result?.message ||
            "Facebook API request failed",
          data: result,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      data: result,
    });
  } catch (error: any) {
    console.error("Facebook proxy error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
