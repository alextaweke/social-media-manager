import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        return NextResponse.redirect(
          new URL("/login?error=auth_failed", requestUrl.origin),
        );
      }

      // Successful authentication
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (error) {
      console.error("Unexpected error in auth callback:", error);
      return NextResponse.redirect(
        new URL("/login?error=unknown", requestUrl.origin),
      );
    }
  }

  // Redirect to login if no code
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
