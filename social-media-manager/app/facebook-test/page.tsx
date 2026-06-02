/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function FacebookTestPage() {
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [connectedAccount, setConnectedAccount] = useState<any>(null);

  useEffect(() => {
    // Fetch connected Facebook account
    fetch("/api/social/accounts")
      .then((res) => res.json())
      .then((data) => {
        const fb = data.accounts?.find((a: any) => a.platform === "facebook");
        if (fb) {
          setConnectedAccount(fb);
          setPageId(fb.platform_user_id);
        }
      })
      .catch(console.error);
  }, []);

  const testPost = async () => {
    if (!pageId || !accessToken) {
      toast.error("Please enter Page ID and Access Token");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          accessToken,
          content:
            message ||
            `Test post from SocialHub - ${new Date().toLocaleString()}`,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success("Post published successfully!");
      } else {
        toast.error(`Failed: ${data.error?.message || data.error}`);
      }
    } catch (error: any) {
      setResult({ error: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test/facebook", {
        method: "GET",
      });
      const data = await response.json();
      setResult(data);
      if (data.testResults?.tokenDebug?.data?.is_valid) {
        toast.success("Token is valid!");
      } else {
        toast.warning("Token may be invalid or expired");
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Facebook API Test Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedAccount && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium">Connected Account:</p>
              <p className="text-xs">
                Page ID: {connectedAccount.platform_user_id}
              </p>
              <p className="text-xs">
                Username: {connectedAccount.platform_username}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Facebook Page ID</Label>
            <Input
              placeholder="Enter your Facebook Page ID"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Page Access Token</Label>
            <Input
              type="password"
              placeholder="Enter your Page Access Token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Test Message (Optional)</Label>
            <Input
              placeholder="Leave empty for auto-generated message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={testConnection}
              disabled={loading}
              variant="outline"
            >
              Test Connection
            </Button>
            <Button
              onClick={testPost}
              disabled={loading || !pageId || !accessToken}
            >
              {loading ? "Testing..." : "Post to Facebook"}
            </Button>
          </div>

          {result && (
            <div className="mt-4">
              <p className="font-semibold text-sm mb-2">Result:</p>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-2 mt-4 p-3 bg-yellow-50 rounded">
            <p className="font-semibold">
              📝 How to get a valid Page Access Token:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Go to{" "}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  className="text-blue-500"
                >
                  Facebook Graph API Explorer
                </a>
              </li>
              <li>Select your app from the dropdown</li>
              <li>Click Generate Access Token → Get Page Access Token</li>
              <li>Select your page from the list</li>
              <li>Copy the generated token (starts with EAA...)</li>
              <li>Paste it above and test!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
