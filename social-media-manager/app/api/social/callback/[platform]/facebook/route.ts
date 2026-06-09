/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Build the HTML that closes the popup and passes data to the opener
  const buildCloseScript = (payload: object) => `
    <!DOCTYPE html><html><body>
    <script>
      window.opener?.postMessage(${JSON.stringify({ source: "facebook-oauth", ...payload })}, "${process.env.NEXT_PUBLIC_APP_URL}");
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

  // Validate state against cookie
  const cookieState = request.cookies.get(`oauth_state_facebook`)?.value;
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
        `?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/facebook`)}` +
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
        `&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&fb_exchange_token=${userToken}`,
    );
    const longLivedData = await longLivedRes.json();
    const longLivedUserToken: string = longLivedData.access_token || userToken;

    // 3. Fetch pages this user manages (page tokens never expire!)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts` +
        `?fields=id,name,access_token,category,picture` +
        `&access_token=${longLivedUserToken}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok || pagesData.error) {
      throw new Error(pagesData.error?.message || "Failed to fetch pages");
    }

    const pages: Array<{
      id: string;
      name: string;
      access_token: string;
      category: string;
      picture?: { data: { url: string } };
    }> = pagesData.data || [];

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

    // Pass pages back to the opener — the UI will let the user pick one
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
