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
import { Bot, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TelegramConnection({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);

  const verifyConnection = async () => {
    setIsConnecting(true);

    try {
      const response = await fetch("/api/social/connect/telegram/verify", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Telegram connected successfully");

      onConnected?.();

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Connect Telegram
        </CardTitle>

        <CardDescription>
          Connect your Telegram channel to publish posts automatically
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Add our Telegram bot as an administrator to your channel before
            verifying the connection.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-medium">Setup Steps</h4>

          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Open our Telegram bot</li>
            <li>Send /start</li>
            <li>Add the bot as channel admin</li>
            <li>Return here and click Verify</li>
          </ol>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open("https://t.me/alextaweke_bot", "_blank")}
          >
            Open Telegram Bot
          </Button>
        </div>

        <Button
          onClick={verifyConnection}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4" />
              Verify Connection
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
