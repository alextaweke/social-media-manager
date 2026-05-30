import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

// Note: "use client" and force-dynamic have been removed.
// LoginPage is now a clean Server Component.

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Suspense safely catches useSearchParams hook constraints during next build */}
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading sign in portal...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
