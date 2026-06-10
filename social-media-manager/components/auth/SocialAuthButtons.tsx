/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FaTwitter, FaLinkedin, FaChrome, FaGithub } from "react-icons/fa";

interface SocialAuthButtonsProps {
  isLoading: boolean;
  redirectTo?: string;
}

export default function SocialAuthButtons({
  isLoading,
  redirectTo = "/dashboard",
}: SocialAuthButtonsProps) {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = async (
    provider: "google" | "github" | "twitter" | "linkedin" | "facebook",
  ) => {
    setSocialLoading(provider);
    const supabase = createClient();

    try {
      // Build provider-specific options
      const options: Parameters<
        typeof supabase.auth.signInWithOAuth
      >[0]["options"] = {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      };

      if (provider === "google") {
        options.queryParams = { access_type: "offline", prompt: "consent" };
        options.scopes = "email profile";
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      toast.error(error.message || `Failed to login with ${provider}`);
      setSocialLoading(null);
    }
  };

  const providers = [
    {
      id: "google" as const,
      name: "Google",
      Icon: FaChrome,
      color: "hover:bg-red-50 dark:hover:bg-red-950/10",
    },
    {
      id: "github" as const,
      name: "GitHub",
      Icon: FaGithub,
      color: "hover:bg-gray-100 dark:hover:bg-gray-800",
    },
    {
      id: "twitter" as const,
      name: "Twitter",
      Icon: FaTwitter,
      color: "hover:bg-sky-50 dark:hover:bg-sky-950/10",
    },
    {
      id: "linkedin" as const,
      name: "LinkedIn",
      Icon: FaLinkedin,
      color: "hover:bg-blue-50 dark:hover:bg-blue-950/10",
    },
  ];

  return (
    <div className="space-y-3">
      {providers.map(({ id, name, Icon, color }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          className={`w-full relative ${color} transition-all duration-200`}
          onClick={() => handleSocialLogin(id)}
          disabled={isLoading || socialLoading !== null}
        >
          {socialLoading === id ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Icon className="h-4 w-4" />
              <span className="ml-2">Continue with {name}</span>
            </>
          )}
        </Button>
      ))}
    </div>
  );
}
