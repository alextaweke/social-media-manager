/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function FacebookDebug({
  pageId,
  accessToken,
}: {
  pageId: string;
  accessToken: string;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testPost = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/test/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          accessToken,
          content: "Test post from SocialHub Debugger! 🎉",
        }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        toast.success("Test post successful!");
      } else {
        toast.error(`Failed: ${data.error?.message || data.error}`);
      }
    } catch (error: any) {
      setResult({ error: error.message });
      toast.error(error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Facebook Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={testPost} disabled={testing} size="sm">
          {testing ? "Testing..." : "Test Facebook Post"}
        </Button>
        {result && (
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
