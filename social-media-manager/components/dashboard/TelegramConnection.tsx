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
import { Loader2, Bot, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TelegramConnection({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const [chatId, setChatId] = useState("");
  const [botToken, setBotToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [useCustomToken, setUseCustomToken] = useState(false);

  const connectTelegram = async () => {
    if (!chatId) {
      toast.error("Please enter your Chat ID");
      return;
    }

    if (useCustomToken && !botToken) {
      toast.error("Please enter your Bot Token");
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch("/api/social/connect/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId.trim(),
          botToken: useCustomToken ? botToken.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection failed");
      }

      if (data.success) {
        toast.success("Telegram account connected successfully!");
        setChatId("");
        setBotToken("");
        if (onConnected) {
          onConnected();
        }
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(error.message || "Failed to connect Telegram");
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
          Connect your Telegram channel or group to post updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            Make sure youve added your bot as an admin to your channel/group
            before connecting.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Chat ID *</Label>
          <Input
            placeholder="Enter your Chat ID (e.g., -1001234567890)"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            How to find Chat ID:
            <a
              href="https://core.telegram.org/bots/api#getting-updates"
              target="_blank"
              className="text-blue-500 hover:underline ml-1"
            >
              View guide
            </a>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useCustomToken"
            checked={useCustomToken}
            onChange={(e) => setUseCustomToken(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="useCustomToken" className="text-sm cursor-pointer">
            Use custom bot token (optional - leave unchecked to use default)
          </Label>
        </div>

        {useCustomToken && (
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input
              type="password"
              placeholder="1234567890:ABCdefGHIJKLMNOPQRstUVWXYZ"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Get your bot token from{" "}
              <a
                href="https://t.me/botfather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                @BotFather
              </a>
            </p>
          </div>
        )}

        <Button
          onClick={connectTelegram}
          disabled={isConnecting || !chatId || (useCustomToken && !botToken)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          Connect Telegram Account
        </Button>

        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <h4 className="text-sm font-semibold mb-2">📝 Quick Setup Guide:</h4>
          <ol className="text-xs space-y-1 text-gray-600 dark:text-gray-400 list-decimal list-inside">
            <li>
              Create a bot via <strong>@BotFather</strong> on Telegram
            </li>
            <li>Copy your bot token</li>
            <li>
              Add bot as <strong>ADMIN</strong> to your channel/group
            </li>
            <li>
              Visit:{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                https://api.telegram.org/bot[TOKEN]/getUpdates
              </code>
            </li>
            <li>Send a test message to your chat</li>
            <li>
              Copy the numeric Chat ID from the response (negative number)
            </li>
            <li>Paste it above and click Connect</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
