/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Define the Next.js 15 context type where params is a Promise
type RouteContext = {
  params: Promise<{ platform: string }>;
};

// Helper HTML builder to post a message back to the frontend popup window opener
const sendPopupMessageHTML = (msgObject: object) => `
  <html>
    <body>
      <script>
        window.opener.postMessage(${JSON.stringify(msgObject)}, window.location.origin);
      </script>
    </body>
  </html>
`;

export async function GET(request: NextRequest, context: RouteContext) {
  const { platform } = await context.params;

  // Telegram uses a different flow (no OAuth callback)
  if (platform === "telegram") {
    return new NextResponse(
      sendPopupMessageHTML({
        type: "FACEBOOK_AUTH_ERROR",
        error: "Telegram requires a bot setup flow.",
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Optional: Verify state if you are using cookies for security validation
  const storedState = request.cookies.get(`oauth_state_${platform}`)?.value;
  if (state && storedState && state !== storedState) {
    return new NextResponse(
      sendPopupMessageHTML({
        type: "FACEBOOK_AUTH_ERROR",
        error: "Session expired or invalid security state.",
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  if (!code) {
    return new NextResponse(
      sendPopupMessageHTML({
        type: "FACEBOOK_AUTH_ERROR",
        error: "Authorization code not provided by platform.",
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  try {
    let accessToken: string;
    let refreshToken: string | undefined;
    let userId: string;
    let username: string;

    switch (platform) {
      case "facebook":
        // Facebook requires a special 3-step handshake to safely publish to Pages
        const facebookData = await exchangeFacebookToken(code);
        accessToken = facebookData.page_access_token; // The permanent page token
        userId = facebookData.page_id; // The Page ID (not user ID)
        username = facebookData.page_name; // The corporate Page name
        break;
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
      default:
        throw new Error("Unsupported platform");
    }

    // Save token credentials into your Supabase database table securely
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User session not found");

    await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform,
        platform_user_id: userId,
        platform_username: username,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at:
          platform === "facebook"
            ? null
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Page tokens don't expire
        is_active: true,
        updated_at: new Date(),
      },
      {
        onConflict: "user_id,platform",
      },
    );

    // Instead of redirecting the whole window, output HTML that signals the frontend popup listener
    return new NextResponse(
      sendPopupMessageHTML({ type: "FACEBOOK_AUTH_SUCCESS" }),
      { headers: { "Content-Type": "text/html" } },
    );
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return new NextResponse(
      sendPopupMessageHTML({
        type: "FACEBOOK_AUTH_ERROR",
        error: error.message || "Connection failed",
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  }
}

// Rewritten Facebook Exchange to pull structural Page Data instead of User account nodes
async function exchangeFacebookToken(code: string) {
  // Step 1: Exchange code for short-lived user access token
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
  if (!tokenResponse.ok)
    throw new Error(
      tokenData.error?.message || "Failed to exchange authorization code.",
    );

  // Step 2: Upgrade short-lived token to an extended long-lived user token (lasts 60 days)
  const extendResponse = await fetch(
    "https://graph.facebook.com/v25.0/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        fb_exchange_token: tokenData.access_token,
      }),
    },
  );

  const extendData = await extendResponse.json();
  if (!extendResponse.ok)
    throw new Error(
      extendData.error?.message || "Failed to extend user access token.",
    );

  // Step 3: Use the long-lived user token to fetch their Pages and their corresponding Page Tokens (never expire)
  const pagesResponse = await fetch(
    `https://facebook.com{extendData.access_token}`,
  );
  const pagesData = await pagesResponse.json();
  if (!pagesResponse.ok)
    throw new Error(
      pagesData.error?.message ||
        "Failed to retrieve associated Facebook Pages.",
    );

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error(
      "No Facebook business pages found linked to this personal account.",
    );
  }

  // Pick the first page the user owns.
  const targetPage = pagesData.data[0];

  return {
    page_access_token: targetPage.access_token, // <--- This token does not expire
    page_id: targetPage.id, // <--- Use the page ID to publish posts
    page_name: targetPage.name, // <--- Business name (e.g. "My Coffee Shop")
  };
}

// Keep your existing Instagram, Twitter, and LinkedIn functions unaltered below...
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
