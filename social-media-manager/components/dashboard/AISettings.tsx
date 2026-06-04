/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Brain,
  Sparkles,
  Image as ImageIcon,
  Clock,
  Zap,
  Settings as SettingsIcon,
} from "lucide-react";

interface AISettings {
  auto_post_enabled: boolean;
  auto_post_schedule: string;
  auto_post_time: string;
  auto_post_platforms: string[];
  auto_post_topics: string[];
  content_tone: string;
  image_generation_enabled: boolean;
  image_enhancement_enabled: boolean;
}

const availablePlatforms = [
  { id: "twitter", name: "Twitter", icon: "🐦" },
  { id: "facebook", name: "Facebook", icon: "👍" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "telegram", name: "Telegram", icon: "🤖" },
];

const availableTopics = [
  "Social Media Tips",
  "Digital Marketing",
  "Industry News",
  "Product Updates",
  "Customer Success",
  "Behind the Scenes",
  "Educational Content",
  "Motivational Quotes",
  "Trending Topics",
];

const tones = [
  "Professional",
  "Casual",
  "Humorous",
  "Inspirational",
  "Educational",
];

export default function AISettings() {
  const [settings, setSettings] = useState<AISettings>({
    auto_post_enabled: false,
    auto_post_schedule: "daily",
    auto_post_time: "09:00",
    auto_post_platforms: [],
    auto_post_topics: [],
    content_tone: "professional",
    image_generation_enabled: false,
    image_enhancement_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/ai/settings");
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching AI settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("AI settings saved successfully");

        // If auto-post is enabled, schedule the posts
        if (settings.auto_post_enabled) {
          await fetch("/api/ai/auto-post/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enabled: settings.auto_post_enabled,
              schedule: settings.auto_post_schedule,
              time: settings.auto_post_time,
              platforms: settings.auto_post_platforms,
              topics: settings.auto_post_topics,
            }),
          });
          toast.success("Auto-posts scheduled successfully");
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSettings((prev) => ({
      ...prev,
      auto_post_platforms: prev.auto_post_platforms.includes(platformId)
        ? prev.auto_post_platforms.filter((p) => p !== platformId)
        : [...prev.auto_post_platforms, platformId],
    }));
  };

  const addTopic = () => {
    if (newTopic && !settings.auto_post_topics.includes(newTopic)) {
      setSettings((prev) => ({
        ...prev,
        auto_post_topics: [...prev.auto_post_topics, newTopic],
      }));
      setNewTopic("");
    }
  };

  const removeTopic = (topic: string) => {
    setSettings((prev) => ({
      ...prev,
      auto_post_topics: prev.auto_post_topics.filter((t) => t !== topic),
    }));
  };

  if (loading) {
    return <div className="text-center py-8">Loading AI settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Auto-Posting Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Auto-Posting Schedule
          </CardTitle>
          <CardDescription>
            Let AI automatically create and post content on your behalf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-semibold">Enable Auto-Posting</Label>
              <p className="text-sm text-gray-500">
                AI will generate and post content automatically
              </p>
            </div>
            <Switch
              checked={settings.auto_post_enabled}
              onCheckedChange={(checked: any) =>
                setSettings((prev) => ({ ...prev, auto_post_enabled: checked }))
              }
            />
          </div>

          {settings.auto_post_enabled && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Posting Frequency</Label>
                  <Select
                    value={settings.auto_post_schedule}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        auto_post_schedule: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Posting Time</Label>
                  <Input
                    type="time"
                    value={settings.auto_post_time}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        auto_post_time: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platforms to Post</Label>
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map((platform) => (
                    <Button
                      key={platform.id}
                      type="button"
                      variant={
                        settings.auto_post_platforms.includes(platform.id)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => togglePlatform(platform.id)}
                      className="gap-2"
                    >
                      <span>{platform.icon}</span>
                      {platform.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Topics</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a topic (e.g., Digital Marketing)"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTopic()}
                  />
                  <Button onClick={addTopic} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.auto_post_topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="gap-1">
                      {topic}
                      <button
                        onClick={() => removeTopic(topic)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Content Enhancement Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Content Enhancement
          </CardTitle>
          <CardDescription>
            AI-powered tools to improve your content quality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-semibold">Image Enhancement</Label>
              <p className="text-sm text-gray-500">
                AI will enhance and optimize images
              </p>
            </div>
            <Switch
              checked={settings.image_enhancement_enabled}
              onCheckedChange={(checked: any) =>
                setSettings((prev) => ({
                  ...prev,
                  image_enhancement_enabled: checked,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Default Content Tone</Label>
            <Select
              value={settings.content_tone}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, content_tone: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tones.map((tone) => (
                  <SelectItem key={tone} value={tone.toLowerCase()}>
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Image Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-green-600" />
            AI Image Generation
          </CardTitle>
          <CardDescription>
            Generate custom images for your posts using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-semibold">
                Enable AI Image Generation
              </Label>
              <p className="text-sm text-gray-500">
                Generate images based on your content
              </p>
            </div>
            <Switch
              checked={settings.image_generation_enabled}
              onCheckedChange={(checked: any) =>
                setSettings((prev) => ({
                  ...prev,
                  image_generation_enabled: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
