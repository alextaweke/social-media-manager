/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { FaFacebook } from "react-icons/fa";

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: { data: { url: string } };
}

interface FacebookConnectionProps {
  onConnected?: () => void;
}

export default function FacebookConnection({
  onConnected,
}: FacebookConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [savingPageId, setSavingPageId] = useState<string | null>(null);

  const handleFacebookOAuth = () => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      toast.error("NEXT_PUBLIC_FACEBOOK_APP_ID is not set");
      return;
    }

    setIsConnecting(true);
    setPages([]);

    const state = crypto.randomUUID();
    document.cookie = `oauth_state_facebook=${state}; path=/; max-age=600; SameSite=Lax`;

    const redirectUri = encodeURIComponent(
      `${window.location.origin}/api/social/callback/facebook`,
    );

    const scopes = [
      "email",
      "public_profile",
      "pages_show_list",
      "pages_manage_posts",
      "pages_read_engagement",
    ].join(",");

    const oauthUrl =
      `https://www.facebook.com/v25.0/dialog/oauth` +
      `?client_id=${appId}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=${scopes}` +
      `&state=${state}` +
      `&response_type=code`;

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      oauthUrl,
      "Facebook Login",
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    // Listen for postMessage from callback page
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "facebook-oauth") return;

      window.removeEventListener("message", onMessage);
      clearInterval(pollTimer);
      setIsConnecting(false);

      if (!event.data.success) {
        toast.error(event.data.error || "Facebook connection failed");
        return;
      }

      setPages(event.data.pages);
    };

    window.addEventListener("message", onMessage);

    // Fallback: if popup closed without posting a message
    const pollTimer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollTimer);
        window.removeEventListener("message", onMessage);
        setIsConnecting(false);
      }
    }, 1000);
  };

  const handleSelectPage = async (page: FacebookPage) => {
    setSavingPageId(page.id);
    try {
      const res = await fetch("/api/social/connect/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          accessToken: page.access_token, // This is the never-expiring page token
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save page");

      toast.success(`"${page.name}" connected successfully`);
      setPages([]);
      onConnected?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPageId(null);
    }
  };

  // Page selection screen
  if (pages.length > 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FaFacebook className="h-6 w-6 text-[#1877F2]" />
            Select a Page
          </CardTitle>
          <CardDescription>
            Choose which Facebook Page to connect for publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              disabled={savingPageId !== null}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left disabled:opacity-60"
            >
              {page.picture?.data?.url ? (
                <img
                  src={page.picture.data.url}
                  alt={page.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                  <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{page.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {page.category}
                </p>
              </div>
              {savingPageId === page.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <CheckCircle className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground"
            onClick={() => setPages([])}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default connect screen
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FaFacebook className="h-6 w-6 text-[#1877F2]" />
          Connect Facebook Account
        </CardTitle>
        <CardDescription>
          Link your Facebook business page to start publishing posts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            Make sure you are an <strong>Admin</strong> of the Facebook Page you
            want to connect.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleFacebookOAuth}
          disabled={isConnecting}
          className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-6 text-base"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <FaFacebook className="mr-2 h-5 w-5" />
          )}
          {isConnecting ? "Waiting for Facebook..." : "Connect Facebook Page"}
        </Button>

        <p className="text-[11px] text-center text-gray-400">
          We only access your pages, not your personal password.
        </p>
      </CardContent>
    </Card>
  );
}
