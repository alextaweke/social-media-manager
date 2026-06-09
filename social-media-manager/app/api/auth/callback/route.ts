import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Handle OAuth errors returned by the provider (e.g. user denied access)
  if (error) {
    console.error("OAuth provider error:", error, errorDescription);
    const params = new URLSearchParams({ error: "oauth_denied" });
    if (errorDescription) params.set("message", errorDescription);
    return NextResponse.redirect(
      new URL(`/login?${params}`, requestUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=no_code", requestUrl.origin),
    );
  }

  const supabase = await createClient();

  const { error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    console.error("Session exchange error:", sessionError);
    return NextResponse.redirect(
      new URL(
        `/login?error=auth_failed&message=${encodeURIComponent(sessionError.message)}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
