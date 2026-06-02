/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

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

    let url = `https://graph.facebook.com/v18.0/${endpoint}`;

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

    console.log("Facebook Proxy Request:", { url, method });

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

    const response = await fetch(url, fetchOptions);
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

    let url = `https://graph.facebook.com/v18.0/${endpoint}`;
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

    console.log("Facebook Proxy GET Request:", url);

    const response = await fetch(url);
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
