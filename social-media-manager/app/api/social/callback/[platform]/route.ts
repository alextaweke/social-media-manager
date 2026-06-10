/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { platform } = await context.params;

  // Facebook has its own dedicated popup-based handler at /api/social/callback/facebook
  // Never handle it here — it would break the popup flow
  if (platform === "facebook" || platform === "telegram") {
    return NextResponse.redirect(
      new URL("/dashboard?error=wrong_callback", request.url),
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = request.cookies.get(`oauth_state_${platform}`)?.value;
  if (state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard?error=invalid_state", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?error=no_code", request.url),
    );
  }

  try {
    let accessToken: string;
    let refreshToken: string | undefined;
    let userId: string;
    let username: string;

    switch (platform) {
      case "instagram": {
        const d = await exchangeInstagramToken(code);
        accessToken = d.access_token;
        userId = d.user_id;
        username = d.username;
        break;
      }
      case "twitter": {
        const d = await exchangeTwitterToken(code);
        accessToken = d.access_token;
        refreshToken = d.refresh_token;
        userId = d.user_id;
        username = d.username;
        break;
      }
      case "linkedin": {
        const d = await exchangeLinkedinToken(code);
        accessToken = d.access_token;
        userId = d.user_id;
        username = d.username;
        break;
      }
      default:
        throw new Error("Unsupported platform");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not found");

    await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform,
        platform_user_id: userId,
        platform_username: username,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );

    return NextResponse.redirect(
      new URL("/dashboard?connected=true", request.url),
    );
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=connection_failed", request.url),
    );
  }
}

async function exchangeInstagramToken(code: string) {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/instagram`,
      code,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_message);
  return data;
}

async function exchangeTwitterToken(code: string) {
  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/twitter`,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description);

  const userResponse = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userData = await userResponse.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: userData.data.id,
    username: userData.data.username,
  };
}

async function exchangeLinkedinToken(code: string) {
  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/linkedin`,
        code,
      }),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description);

  const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profile = await profileResponse.json();
  return {
    access_token: data.access_token,
    user_id: profile.sub,
    username: profile.preferred_username || profile.name,
  };
}
