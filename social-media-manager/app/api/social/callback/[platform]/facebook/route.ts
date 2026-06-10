/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
  // Prefer the server-only var; fall back to the public one
  const FB_APP_ID =
    process.env.FACEBOOK_APP_ID ?? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const FB_SECRET = process.env.FACEBOOK_APP_SECRET!;

  const buildCloseScript = (payload: object) => `
    <!DOCTYPE html><html><body>
    <script>
      window.opener?.postMessage(
        ${JSON.stringify({ source: "facebook-oauth", ...payload })},
        "${APP_URL}"
      );
      window.close();
    </script>
    </body></html>
  `;

  if (error || !code) {
    return new NextResponse(
      buildCloseScript({ success: false, error: error || "No code returned" }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  // Guard: if app ID is missing, fail clearly instead of sending a bad request to FB
  if (!FB_APP_ID) {
    return new NextResponse(
      buildCloseScript({
        success: false,
        error: "Server misconfiguration: Facebook App ID is not set.",
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  // Validate state against cookie
  const cookieState = request.cookies.get("oauth_state_facebook")?.value;
  if (!cookieState || cookieState !== state) {
    return new NextResponse(
      buildCloseScript({
        success: false,
        error: "Invalid state — possible CSRF",
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  try {
    // 1. Exchange code for a short-lived user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token` +
        `?client_id=${FB_APP_ID}` +
        `&client_secret=${FB_SECRET}` +
        `&redirect_uri=${encodeURIComponent(`${APP_URL}/api/social/callback/facebook`)}` +
        `&code=${code}`,
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || "Token exchange failed");
    }

    const userToken: string = tokenData.access_token;

    // 2. Exchange for a long-lived user token (60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${FB_APP_ID}` +
        `&client_secret=${FB_SECRET}` +
        `&fb_exchange_token=${userToken}`,
    );
    const longLivedData = await longLivedRes.json();
    const longLivedUserToken: string = longLivedData.access_token || userToken;

    // 3. Fetch pages this user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts` +
        `?fields=id,name,access_token,category,picture` +
        `&access_token=${longLivedUserToken}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok || pagesData.error) {
      throw new Error(pagesData.error?.message || "Failed to fetch pages");
    }

    const pages = pagesData.data ?? [];

    if (pages.length === 0) {
      return new NextResponse(
        buildCloseScript({
          success: false,
          error:
            "No Facebook Pages found. Make sure you are an admin of at least one Page.",
        }),
        { headers: { "Content-Type": "text/html" } },
      );
    }

    return new NextResponse(buildCloseScript({ success: true, pages }), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    return new NextResponse(
      buildCloseScript({ success: false, error: err.message }),
      { headers: { "Content-Type": "text/html" } },
    );
  }
}
