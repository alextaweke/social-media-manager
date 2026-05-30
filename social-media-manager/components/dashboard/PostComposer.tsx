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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Loader2,
  ImagePlus,
  Hash,
  Calendar,
  Send,
  Save,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

export default function PostComposer() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "twitter",
    "instagram",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [content, setContent] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  const platforms: Platform[] = [
    {
      id: "twitter",
      name: "Twitter",
      icon: "🐦",
      color: "bg-blue-400",
      connected: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "📸",
      color: "bg-pink-500",
      connected: true,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-700",
      connected: false,
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: "👍",
      color: "bg-blue-600",
      connected: true,
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: "🤖",
      color: "bg-blue-500",
      connected: true,
    },
  ];

  const generateAIContent = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "social media marketing tips",
          platform: selectedPlatforms[0],
          tone: "engaging",
          includeHashtags: true,
          length: "medium",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setContent(data.content);
        toast.success("AI content generated! You can edit it below.");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error("Please add some content before publishing");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform to publish to");
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch("/api/social/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          mediaUrls: [],
          scheduleFor: scheduleDate || null,
          aiGenerated: activeTab === "ai",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          data.scheduled
            ? "Post scheduled successfully!"
            : "Post published successfully!",
        );
        setContent("");
        setSelectedPlatforms(["twitter", "instagram"]);
        setScheduleDate("");
        setShowScheduler(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(
        "Failed to publish. Please check your connections and try again.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      if (selectedPlatforms.length === 1) {
        toast.error("You must select at least one platform");
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl">Create New Post</CardTitle>
        <CardDescription className="text-blue-100">
          Craft engaging content and share it across your social networks
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">✍️ Write Post</TabsTrigger>
            <TabsTrigger value="ai">🤖 AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-6">
            {/* Platform Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Select Platforms</Label>
              <div className="flex flex-wrap gap-3">
                {platforms.map((platform) => (
                  <Button
                    key={platform.id}
                    type="button"
                    variant={
                      selectedPlatforms.includes(platform.id)
                        ? "default"
                        : "outline"
                    }
                    className={`gap-2 ${
                      selectedPlatforms.includes(platform.id)
                        ? platform.color
                        : ""
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                    disabled={!platform.connected}
                  >
                    <span>{platform.icon}</span>
                    {platform.name}
                    {!platform.connected && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Connect
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Post Content</Label>
              <Textarea
                placeholder="What's on your mind? Share your thoughts with your audience..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <span>{content.length} characters</span>
                  {content.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.ceil(content.length / 280)}{" "}
                      {selectedPlatforms.includes("twitter")
                        ? "tweets"
                        : "posts"}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8">
                    <ImagePlus className="h-4 w-4 mr-1" />
                    Media
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Hash className="h-4 w-4 mr-1" />
                    Hashtags
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-lg p-6">
              <div className="text-center mb-4">
                <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  AI Content Generator
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Let our AI create engaging content for you in seconds
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Topic / Keyword</Label>
                  <Input
                    placeholder="e.g., Digital marketing trends, Product launch, Industry news"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tone of Voice</Label>
                  <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2">
                    <option>Professional & Informative</option>
                    <option>Casual & Engaging</option>
                    <option>Humorous & Witty</option>
                    <option>Inspirational & Motivational</option>
                  </select>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  onClick={generateAIContent}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Post
                    </>
                  )}
                </Button>
              </div>
            </div>

            {content && (
              <div className="space-y-3">
                <Label>Generated Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[150px]"
                />
                <p className="text-xs text-gray-500 text-right">
                  You can edit the generated content above
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Scheduling */}
        <div className="space-y-3 mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Post
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowScheduler(!showScheduler)}
            >
              {showScheduler ? "Cancel" : "Set Time"}
            </Button>
          </div>

          {showScheduler && (
            <div className="space-y-3 rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full"
              />
              {scheduleDate && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Scheduled for: {new Date(scheduleDate).toLocaleString()}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Your post will be automatically published at the scheduled time
              </p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {content && (
          <div className="space-y-3 mt-6 pt-4 border-t">
            <Label className="text-sm font-semibold">Preview</Label>
            <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-4">
              <p className="whitespace-pre-wrap text-sm">{content}</p>
              {selectedPlatforms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPlatforms.map((platform) => {
                    const platformInfo = platforms.find(
                      (p) => p.id === platform,
                    );
                    return (
                      <Badge
                        key={platform}
                        variant="secondary"
                        className="gap-1"
                      >
                        <span>{platformInfo?.icon}</span>
                        {platformInfo?.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
              {scheduleDate && (
                <div className="mt-3 text-sm text-blue-600 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Scheduled for {new Date(scheduleDate).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 mt-4 border-t">
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            onClick={handlePublish}
            disabled={
              isPublishing || !content.trim() || selectedPlatforms.length === 0
            }
          >
            {isPublishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : scheduleDate ? (
              <Calendar className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {scheduleDate ? "Schedule Post" : "Publish Now"}
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          {content && (
            <Button variant="ghost" onClick={() => setContent("")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
