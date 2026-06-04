/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  Wand2,
  Hash,
  Type,
  Minus,
  Plus,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@radix-ui/react-dropdown-menu";

interface EnhancementResult {
  original: string;
  enhanced: string;
  action: string;
}

export default function AIEnhancementTool() {
  const [inputText, setInputText] = useState("");
  const [platform, setPlatform] = useState("general");
  const [tone, setTone] = useState("professional");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [copied, setCopied] = useState(false);

  const actions = [
    {
      id: "enhance",
      label: "✨ Enhance Content",
      icon: Sparkles,
      description: "Make your content more engaging",
    },
    {
      id: "improve_grammar",
      label: "📝 Fix Grammar",
      icon: Wand2,
      description: "Correct grammar and improve readability",
    },
    {
      id: "make_shorter",
      label: "📏 Make Shorter",
      icon: Minus,
      description: "Condense for platforms like Twitter",
    },
    {
      id: "make_longer",
      label: "📖 Make Longer",
      icon: Plus,
      description: "Expand with more details",
    },
    {
      id: "add_hashtags",
      label: "#️⃣ Add Hashtags",
      icon: Hash,
      description: "Generate relevant hashtags",
    },
  ];

  const handleEnhance = async (action: string) => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to enhance");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          platform,
          tone,
          action,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          original: data.original,
          enhanced: data.enhanced,
          action,
        });
        toast.success("Content enhanced successfully!");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to enhance content");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyEnhancement = () => {
    if (result) {
      setInputText(result.enhanced);
      setResult(null);
      toast.success("Enhancement applied!");
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.enhanced);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Content Enhancer
          </CardTitle>
          <CardDescription>
            Enhance your content with AI-powered tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform (Optional)</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual & Friendly</SelectItem>
                  <SelectItem value="humorous">Humorous & Witty</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your Content</Label>
            <Textarea
              placeholder="Paste or write your content here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-[150px]"
            />
            <p className="text-xs text-gray-500 text-right">
              {inputText.length} characters
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1"
                onClick={() => handleEnhance(action.id)}
                disabled={isProcessing || !inputText.trim()}
              >
                <action.icon className="h-4 w-4" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Result Section */}
      {result && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                Enhanced Result
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">Copy</span>
                </Button>
                <Button size="sm" onClick={applyEnhancement}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Apply
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                Original:
              </p>
              <p className="text-sm p-3 bg-white dark:bg-gray-800 rounded">
                {result.original}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">
                Enhanced:
              </p>
              <p className="text-sm p-3 bg-white dark:bg-gray-800 rounded">
                {result.enhanced}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-green-600">
                {actions.find((a) => a.id === result.action)?.label}
              </Badge>
              <Badge variant="outline">Tone: {tone}</Badge>
              {platform !== "general" && (
                <Badge variant="outline">Platform: {platform}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
