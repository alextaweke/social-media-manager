import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Define the Next.js 15 context type where params is a Promise
type RouteContext = {
  params: Promise<{ platform: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext, // Replaced destructured params with typed context
) {
  // Await the params before extracting properties
  const { platform } = await context.params;

  // Telegram uses a different flow (no OAuth callback)
  if (platform === "telegram") {
    return NextResponse.redirect(
      new URL("/dashboard?error=telegram_requires_bot", request.url),
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Verify state
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
    // Exchange code for access token based on platform
    let accessToken: string;
    let refreshToken: string | undefined;
    let userId: string;
    let username: string;

    switch (platform) {
      case "instagram":
        const instagramData = await exchangeInstagramToken(code);
        accessToken = instagramData.access_token;
        userId = instagramData.user_id;
        username = instagramData.username;
        break;
      case "twitter":
        const twitterData = await exchangeTwitterToken(code);
        accessToken = twitterData.access_token;
        refreshToken = twitterData.refresh_token;
        userId = twitterData.user_id;
        username = twitterData.username;
        break;
      case "linkedin":
        const linkedinData = await exchangeLinkedinToken(code);
        accessToken = linkedinData.access_token;
        userId = linkedinData.user_id;
        username = linkedinData.username;
        break;
      case "facebook":
        const facebookData = await exchangeFacebookToken(code);
        accessToken = facebookData.access_token;
        userId = facebookData.user_id;
        username = facebookData.username;
        break;
      default:
        throw new Error("Unsupported platform");
    }

    // Save to database
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
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        is_active: true,
        updated_at: new Date(),
      },
      {
        onConflict: "user_id,platform",
      },
    );

    return NextResponse.redirect(
      new URL("/dashboard?connected=true", request.url),
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=connection_failed", request.url),
    );
  }
}

// Add Facebook exchange function
async function exchangeFacebookToken(code: string) {
  const tokenResponse = await fetch(
    "https://graph.facebook.com/v25.0/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/social/callback/facebook`,
        code,
      }),
    },
  );

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(tokenData.error?.message);
  }

  // IMPORTANT: Get pages (not /me)
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v25.0/me/accounts?access_token=${tokenData.access_token}`,
  );

  const pagesData = await pagesResponse.json();

  if (!pagesResponse.ok) {
    throw new Error(pagesData.error?.message);
  }

  const page = pagesData.data?.[0];

  if (!page) {
    throw new Error("No Facebook pages found");
  }

  return {
    access_token: page.access_token,
    user_id: page.id,
    username: page.name,
  };
}

// Your existing exchange functions...
async function exchangeInstagramToken(code: string) {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/social/callback/instagram`,
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
      Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/social/callback/twitter`,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description);

  // Get user info from Twitter
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
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/social/callback/linkedin`,
        code,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description);

  // Get user profile
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
