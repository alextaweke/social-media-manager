/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { FaFacebook } from "react-icons/fa";
interface FacebookConnectionProps {
  onConnected?: () => void;
}

export default function FacebookConnection({
  onConnected,
}: FacebookConnectionProps) {
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [pageName, setPageName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [useEnvCredentials, setUseEnvCredentials] = useState(false);

  const connectFacebook = async () => {
    if (!useEnvCredentials && (!pageId || !accessToken)) {
      toast.error("Please enter both Page ID and Access Token");
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch("/api/social/connect/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: useEnvCredentials
            ? process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID
            : pageId,
          pageName: pageName || undefined,
          accessToken: useEnvCredentials
            ? process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ACCESS_TOKEN
            : accessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection failed");
      }

      if (data.success) {
        toast.success(
          `Facebook page "${data.page.name}" connected successfully!`,
        );
        setPageId("");
        setAccessToken("");
        setPageName("");
        if (onConnected) {
          onConnected();
        }
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(error.message || "Failed to connect Facebook page");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FaFacebook className="h-5 w-5 text-blue-600" />
          Connect Facebook Page
        </CardTitle>
        <CardDescription>
          Connect your Facebook page to post updates directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            You need a Facebook Page (not personal profile) and a Page Access
            Token.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useEnvFacebook"
            checked={useEnvCredentials}
            onChange={(e) => setUseEnvCredentials(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="useEnvFacebook" className="text-sm cursor-pointer">
            Use credentials from environment variables
          </Label>
        </div>

        {!useEnvCredentials && (
          <>
            <div className="space-y-2">
              <Label>Facebook Page ID</Label>
              <Input
                placeholder="Enter your Facebook Page ID"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Find your Page ID in your Facebook Page Settings → Page Info
              </p>
            </div>

            <div className="space-y-2">
              <Label>Page Name (Optional)</Label>
              <Input
                placeholder="Enter page name (optional)"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Page Access Token</Label>
              <Input
                type="password"
                placeholder="Enter your Facebook Page Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Generate a Page Access Token from Facebook Developers → Tools →
                Graph API Explorer
              </p>
            </div>
          </>
        )}

        {useEnvCredentials && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-800 dark:text-green-200">
              Using Facebook credentials from environment variables.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={connectFacebook}
          disabled={
            isConnecting || (!useEnvCredentials && (!pageId || !accessToken))
          }
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FaFacebook className="mr-2 h-4 w-4" />
          )}
          Connect Facebook Page
        </Button>

        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <h4 className="text-sm font-semibold mb-2">
            📝 How to get Facebook Page Access Token:
          </h4>
          <ol className="text-xs space-y-1 text-gray-600 dark:text-gray-400 list-decimal list-inside">
            <li>
              Go to{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                Graph API Explorer
              </a>
            </li>
            <li>Select your app and get User Token</li>
            <li>
              Click Generate Access Token and add permissions:{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                pages_manage_posts, pages_read_engagement
              </code>
            </li>
            <li>
              Go to{" "}
              <a
                href="https://graph.facebook.com/me/accounts?access_token=YOUR_TOKEN"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                Get Page Token
              </a>
            </li>
            <li>
              Copy the{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                access_token
              </code>{" "}
              for your page
            </li>
            <li>Get Page ID from the same response or Page Settings</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
