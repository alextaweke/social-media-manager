/* eslint-disable react-hooks/immutability */
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
  Clock,
  Calendar,
  Bell,
  Zap,
  AlertCircle,
  CheckCircle,
  Trash2,
  Plus,
} from "lucide-react";

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: string;
}

const availablePlatforms = [
  { id: "twitter", name: "Twitter", icon: "🐦", color: "bg-blue-400" },
  { id: "facebook", name: "Facebook", icon: "👍", color: "bg-blue-600" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "bg-pink-500" },
  { id: "telegram", name: "Telegram", icon: "🤖", color: "bg-blue-500" },
];

const topics = [
  "Social Media Tips",
  "Digital Marketing News",
  "Product Updates",
  "Customer Success Stories",
  "Industry Trends",
  "Behind the Scenes",
  "Educational Content",
  "Motivational Quotes",
];

export default function AutoPostSettings() {
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState("daily");
  const [postTime, setPostTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchScheduledPosts();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/ai/settings");
      const data = await response.json();
      if (data.success && data.settings) {
        setEnabled(data.settings.auto_post_enabled || false);
        setSchedule(data.settings.auto_post_schedule || "daily");
        setPostTime(data.settings.auto_post_time || "09:00");
        setSelectedPlatforms(data.settings.auto_post_platforms || []);
        setSelectedTopics(data.settings.auto_post_topics || []);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch("/api/posts/scheduled");
      const data = await response.json();
      if (data.success) {
        setScheduledPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching scheduled posts:", error);
    }
  };

  const saveSettings = async () => {
    if (enabled && selectedTopics.length === 0) {
      toast.error("Please select at least one topic for auto-posting");
      return;
    }

    if (enabled && selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform for auto-posting");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/ai/auto-post/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          schedule,
          time: postTime,
          platforms: selectedPlatforms,
          topics: selectedTopics,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(
          enabled ? "Auto-posting enabled!" : "Auto-posting disabled",
        );
        fetchScheduledPosts();
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
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId],
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  const cancelScheduledPost = async (postId: string) => {
    try {
      const response = await fetch("/api/posts/scheduled", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Scheduled post cancelled");
        fetchScheduledPosts();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel post");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Auto-Posting Schedule
          </CardTitle>
          <CardDescription>
            Let AI automatically create and publish content for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <Label className="font-semibold">Enable Auto-Posting</Label>
              <p className="text-sm text-gray-500">
                AI will generate and post content automatically
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Posting Frequency
                  </Label>
                  <Select value={schedule} onValueChange={setSchedule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Same day)</SelectItem>
                      <SelectItem value="custom">Custom Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Posting Time
                  </Label>
                  <Input
                    type="time"
                    value={postTime}
                    onChange={(e) => setPostTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platforms to Post On</Label>
                <div className="flex flex-wrap gap-3">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                        selectedPlatforms.includes(platform.id)
                          ? `${platform.color} text-white shadow-md scale-105`
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      <span>{platform.icon}</span>
                      <span>{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Topics</Label>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <Badge
                      key={topic}
                      variant={
                        selectedTopics.includes(topic) ? "default" : "outline"
                      }
                      className={`cursor-pointer px-3 py-1 ${
                        selectedTopics.includes(topic)
                          ? "bg-gradient-to-r from-blue-600 to-purple-600"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => toggleTopic(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  AI will generate content about these topics for your scheduled
                  posts
                </p>
              </div>
            </>
          )}

          <Button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {saving ? "Saving..." : "Save Auto-Post Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Scheduled Posts List */}
      {scheduledPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Posts
            </CardTitle>
            <CardDescription>
              Posts queued for automatic publishing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 border rounded-lg hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.platforms.map((platform) => {
                          const p = availablePlatforms.find(
                            (a) => a.id === platform,
                          );
                          return (
                            <Badge
                              key={platform}
                              variant="secondary"
                              className="gap-1"
                            >
                              <span>{p?.icon}</span>
                              {p?.name}
                            </Badge>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(post.scheduled_for).toLocaleString()}
                        </span>
                        <Badge
                          variant={
                            post.status === "pending" ? "outline" : "default"
                          }
                        >
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelScheduledPost(post.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      {!enabled && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Auto-posting is currently disabled
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Enable auto-posting to let AI create and schedule content for
                  you. You can choose topics, platforms, and posting frequency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Preview */}
      {enabled && selectedPlatforms.length > 0 && selectedTopics.length > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Auto-posting is active!
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  AI will generate and post content{" "}
                  {schedule === "daily" ? "every day" : "weekly"} at {postTime}{" "}
                  on {selectedPlatforms.length} platform(s) about{" "}
                  {selectedTopics.length} topic(s).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
