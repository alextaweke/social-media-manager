import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

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

    // PKCE verifier missing = the sign-in was started in a different context
    // (e.g. a popup). Redirect to login so the user can sign in normally.
    if (sessionError.code === "pkce_code_verifier_not_found") {
      return NextResponse.redirect(
        new URL(
          "/login?error=session_mismatch&message=Please+sign+in+again",
          requestUrl.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=auth_failed&message=${encodeURIComponent(sessionError.message)}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
