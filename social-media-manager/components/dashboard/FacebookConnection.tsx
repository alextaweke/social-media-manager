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
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { FaFacebook } from "react-icons/fa";

interface FacebookConnectionProps {
  onConnected?: () => void;
}

export default function FacebookConnection({
  onConnected,
}: FacebookConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleFacebookOAuth = () => {
    setIsConnecting(true);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

    if (!appId) {
      toast.error(
        "Missing NEXT_PUBLIC_FACEBOOK_APP_ID in your environment variables.",
      );
      setIsConnecting(false);
      return;
    }

    // Your path should target the dynamic callback router you wrote earlier
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/api/auth/callback`,
    );

    const scopes = [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
    ].join(",");

    const state = crypto.randomUUID();

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
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`,
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FaFacebook className="h-6 w-6 text-[#1877F2]" />
          Connect Facebook Account
        </CardTitle>
        <CardDescription>
          Link your Facebook business page instantly to start publishing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            Make sure your personal account has <strong>Admin</strong> access to
            the Facebook Business Page you want to connect.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleFacebookOAuth}
          disabled={isConnecting}
          className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-6 text-base shadow-sm"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <FaFacebook className="mr-2 h-5 w-5" />
          )}
          {isConnecting ? "Connecting Account..." : "Sign in with Facebook"}
        </Button>

        <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">
          Your credentials remain safe. We never see or store your personal
          Facebook password.
        </p>
      </CardContent>
    </Card>
  );
}
