/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaChrome,
  FaGithub,
} from "react-icons/fa";
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
        },
      });

      if (error) throw error;

      // No need to show success toast as user will be redirected
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      toast.error(error.message || `Failed to login with ${provider}`);
      setSocialLoading(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return <FaChrome className="h-4 w-4" />;
      case "github":
        return <FaGithub className="h-4 w-4" />;
      case "twitter":
        return <FaTwitter className="h-4 w-4" />;
      case "linkedin":
        return <FaLinkedin className="h-4 w-4" />;
      case "facebook":
        return <FaFacebook className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const providers = [
    {
      id: "google" as const,
      name: "Google",
      icon: FaChrome,
      color: "hover:bg-red-50 dark:hover:bg-red-950/10",
    },
    {
      id: "github" as const,
      name: "GitHub",
      icon: FaGithub,
      color: "hover:bg-gray-100 dark:hover:bg-gray-800",
    },
    {
      id: "twitter" as const,
      name: "Twitter",
      icon: FaTwitter,
      color: "hover:bg-blue-50 dark:hover:bg-blue-950/10",
    },
    {
      id: "linkedin" as const,
      name: "LinkedIn",
      icon: FaLinkedin,
      color: "hover:bg-blue-50 dark:hover:bg-blue-950/10",
    },
    {
      id: "facebook" as const,
      name: "Facebook",
      icon: FaFacebook,
      color: "hover:bg-blue-50 dark:hover:bg-blue-950/10",
    },
  ];

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className={`w-full relative ${provider.color} transition-all duration-200`}
          onClick={() => handleSocialLogin(provider.id)}
          disabled={isLoading || socialLoading !== null}
        >
          {socialLoading === provider.id ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              {getProviderIcon(provider.id)}
              <span className="ml-2">Continue with {provider.name}</span>
            </>
          )}
        </Button>
      ))}
    </div>
  );
}
